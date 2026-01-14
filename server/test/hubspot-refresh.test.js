/* eslint-disable no-undef */
const { expect } = require('chai');
const request = require('supertest');
const nock = require('nock');
const { v4: uuidv4 } = require('uuid');
const app = require('../server');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

describe('HubSpot refresh+retry integration', function() {
  this.timeout(10000);
  let userId;
  let campaignId;

  before(async () => {
    // insert a test user and campaign and settings (with refresh token)
    userId = uuidv4();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("INSERT INTO users (id, email, password_hash) VALUES ($1,$2,$3)", [userId, `test+${userId}@example.com`, 'x']);
      const c = await client.query("INSERT INTO campaigns (user_id, name, tracking_id, destination_url) VALUES ($1,$2,$3,$4) RETURNING id", [userId, 'test-campaign', `TST${Date.now()}`, 'https://example.com']);
      campaignId = c.rows[0].id;
      await client.query("INSERT INTO settings (user_id, integrations) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET integrations = $2::jsonb", [userId, JSON.stringify({ hubspot: { refreshToken: 'local-refresh-token' } })]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  after(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM deals WHERE campaign_id = $1', [campaignId]);
      await client.query('DELETE FROM campaigns WHERE id = $1', [campaignId]);
      await client.query('DELETE FROM settings WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('should refresh token on 401 and retry the HubSpot sync', async () => {
    // Mock HubSpot deals endpoint to return 401 on first call, 200 on second
    const hsBase = 'https://api.hubapi.com';

    let firstCall = true;

    nock(hsBase)
      .get('/crm/v3/objects/deals')
      .reply(function() {
        if (firstCall) {
          firstCall = false;
          return [401, { message: 'Unauthorized' }];
        }
        return [200, { results: [{ id: '1', properties: { dealname: 'D1', amount: '120.50', dealstage: 'closed', closedate: Date.now() } }] }];
      })
      .persist();

    // Mock token refresh endpoint
    nock(hsBase)
      .post('/oauth/v1/token')
      .reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        hub_id: '12345'
      });

    // Call the protected sync endpoint using dev fallback x-user-id header
    const res = await request(app)
      .post('/api/hubspot/sync')
      .set('x-user-id', userId)
      .send({ creds: null, campaignId });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('imported');
    expect(res.body.imported).to.equal(1);

    // verify DB got a deal
    const client = await pool.connect();
    try {
      const d = await client.query('SELECT * FROM deals WHERE campaign_id = $1', [campaignId]);
      expect(d.rows.length).to.equal(1);

      // verify settings updated with new tokens
      const s = await client.query('SELECT integrations FROM settings WHERE user_id = $1', [userId]);
      expect(s.rows[0].integrations).to.have.property('hubspot');
      expect(s.rows[0].integrations.hubspot).to.have.property('accessToken');
    } finally {
      client.release();
    }

    nock.cleanAll();
  });

  it('should return scheduler runs from admin endpoint', async () => {
    const client = await pool.connect();
    let runId;
    try {
      const ins = await client.query("INSERT INTO scheduler_runs (status, message, created_by, started_at, finished_at) VALUES ($1,$2,$3,now(),now()) RETURNING id", ['success', 'test-run', $3]);
    } catch (e) {
      // fallback: try with parameterized values properly
      const ins = await client.query("INSERT INTO scheduler_runs (status, message, created_by, started_at, finished_at) VALUES ($1,$2,$3,now(),now()) RETURNING id", ['success', 'test-run', userId]);
      runId = ins.rows[0].id;
    } finally {
      client.release();
    }

    const res = await request(app)
      .get('/api/admin/scheduler_runs')
      .set('x-user-id', userId);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    const found = res.body.find(r => r.id === runId);
    expect(found).to.exist;

    // cleanup inserted run
    const cl = await pool.connect();
    try {
      if (runId) await cl.query('DELETE FROM scheduler_runs WHERE id = $1', [runId]);
    } finally {
      cl.release();
    }
  });
});
