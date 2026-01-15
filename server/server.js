require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI, Type } = (() => {
  try {
    return require('@google/genai');
  } catch (e) {
    return {};
  }
})();
const fetch = global.fetch || require('node-fetch');
const scheduler = require('./scheduler');
const hubspotService = require('./services/hubspotService');
const ga4Service = require('./services/ga4Service');
const geminiService = require('./services/geminiService');
const notificationService = require('./services/notificationService');
const { Pool } = require('pg');
const { Clerk } = require('@clerk/clerk-sdk-node');
const logger = require('./src/logger');
const { campaignSchema, pixelSchema, hubspotSyncSchema, ga4Schema, advisorSchema } = require('./src/validation');

// Clerk backend client (requires CLERK_SECRET_KEY)
const clerkClient = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - lockdown to localhost and Replit
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.REPLIT_ORIGIN || null
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later'
});

const pixelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === 'GET' // Only count POST
});

app.use(globalLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Request validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err) {
      logger.warn(`Validation error on ${req.path}`, { errors: err.errors });
      res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
  };
}

// Subscription enforcement middleware (checks if user is Pro for premium features)
async function requireProSubscription(req, res, next) {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT subscription FROM settings WHERE user_id = $1', [userId]);
    const settings = rows[0];
    const isPro = settings && settings.subscription && settings.subscription.plan === 'PRO';

    if (!isPro) {
      return res.status(403).json({ error: 'Pro subscription required' });
    }
    next();
  } catch (err) {
    logger.error('Subscription check failed', err);
    res.status(500).json({ error: 'Failed to verify subscription' });
  } finally {
    client.release();
  }
}

// Clerk auth middleware
async function clerkAuth(req, res, next) {
  // Development fallback: allow x-user-id header when CLERK_SECRET_KEY is not configured
  if (!process.env.CLERK_SECRET_KEY) {
    const devUser = req.headers['x-user-id'];
    if (devUser) {
      req.auth = { userId: devUser };
      return next();
    }
    console.warn('CLERK_SECRET_KEY not set; requests require x-user-id header for dev mode');
    return res.status(401).json({ error: 'Unauthorized: no Clerk secret configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];

  try {
    // Clerk: authenticate the request using the session token (Bearer token)
    // NOTE: Clerk SDK provides helpers; using a pragmatic approach here.
    const session = await clerkClient.sessions.verifySession({ sessionToken: token });
    if (!session || !session.userId) return res.status(401).json({ error: 'Invalid session' });
    req.auth = { userId: session.userId };
    
    // Sync user to database & update last_login (non-blocking)
    const userId = session.userId;
    const client = await pool.connect();
    try {
      // Upsert user (create if not exists)
      await client.query(
        'INSERT INTO users (id, created_at, last_login) VALUES ($1, now(), now()) ON CONFLICT (id) DO UPDATE SET last_login = now()',
        [userId]
      );
    } catch (err) {
      console.warn('Failed to sync user on auth', userId, err?.message || err);
    } finally {
      client.release();
    }
    
    next();
  } catch (err) {
    console.warn('Clerk auth failed:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Postgres pool via DATABASE_URL (Supabase Postgres)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// --- Helper: HubSpot sync (based on services/hubspotService.ts) ---
// Server-side service wrappers (implemented in server/services)
const { refreshHubSpotToken, fetchHubSpotDeals } = hubspotService;
const { fetchGa4Metrics } = ga4Service;

// --- Helper: Gemini intelligence ---
// Delegates to server/services/geminiService.js to centralize AI usage and keep keys server-side.
// Use: const { getIntelligenceReport } = require('./services/geminiService');
// Note: the actual implementation lives in server/services/geminiService.js

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      slack: !!process.env.SLACK_WEBHOOK_URL,
      resend: !!process.env.RESEND_API_KEY,
      database: true,
      scheduler: true
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Routes ---

// Tracking redirect: increments clicks and redirects to campaign destination (Supabase/Postgres)
app.get('/api/t/:campaignId', globalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { campaignId } = req.params;
    const findQ = `SELECT * FROM campaigns WHERE id = $1 OR tracking_id = $2 LIMIT 1`;
    const { rows } = await client.query(findQ, [campaignId, campaignId]);
    const campaign = rows[0];
    if (!campaign) return res.status(404).send('Campaign not found');

    await client.query('UPDATE campaigns SET clicks = COALESCE(clicks,0)+1, updated_at = now() WHERE id = $1', [campaign.id]);

    res.cookie('foundry_tracking_id', campaign.tracking_id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production'
    });

    const destination = campaign.destination_url || '/';
    res.redirect(destination);
  } catch (err) {
    logger.error('Tracking redirect failed', err);
    res.status(500).send('Tracking failed');
  } finally {
    client.release();
  }
});

// Pixel endpoint: receive form submissions and link to campaign via cookie (writes to Postgres)
app.post('/api/pixel', pixelLimiter, validateRequest(pixelSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;

    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const [k, ...v] = c.split('='); if (!k) return []; return [k.trim(), decodeURIComponent((v || []).join('='))];
    }).filter(Boolean));

    const trackingId = cookies['foundry_tracking_id'];

    let campaign = null;
    if (trackingId) {
      const { rows } = await client.query('SELECT * FROM campaigns WHERE tracking_id = $1 LIMIT 1', [trackingId]);
      campaign = rows[0];
    }

    // Insert customer/lead (associate with campaign if available)
    const insertQ = `INSERT INTO customers (email, campaign_id, status, created_at) VALUES ($1, $2, $3, now()) RETURNING *`;
    const { rows } = await client.query(insertQ, [email, campaign ? campaign.id : null, 'LEAD']);
    const customer = rows[0];

    if (campaign) {
      await client.query('UPDATE campaigns SET conversions = COALESCE(conversions,0)+1 WHERE id = $1', [campaign.id]);
    }

    res.json({ ok: true, customer, linked_campaign: campaign ? campaign.id : null });
  } catch (err) {
    logger.error('Pixel endpoint failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Clerk oauth callback for HubSpot integration
app.post('/api/integrations/hubspot/oauth-callback', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    // Exchange code for HubSpot access token
    // NOTE: In production, you'd call HubSpot's token endpoint here
    // For now, we'll store the auth code and let hubspotService handle the exchange
    const tokenResponse = await hubspotService.exchangeHubSpotAuthCode(code);
    
    if (!tokenResponse || !tokenResponse.access_token) {
      return res.status(400).json({ error: 'Failed to exchange HubSpot code' });
    }

    // Update settings with HubSpot credentials
    const updateQ = `UPDATE settings SET integrations = jsonb_set(integrations, '{hubspot}', $1) WHERE user_id = $2 RETURNING *`;
    const hubspotCreds = JSON.stringify({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
      portalId: tokenResponse.hub_id
    });

    const { rows } = await client.query(updateQ, [hubspotCreds, userId]);
    res.json({ ok: true, credentials: rows[0].integrations.hubspot });
  } catch (err) {
    logger.error('HubSpot OAuth callback failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// OAuth initiation endpoint: return HubSpot authorization URL
app.get('/api/integrations/hubspot/auth-url', clerkAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/integrations/hubspot/oauth-callback`;
    const scopes = 'crm.objects.deals.read oauth analytics.readonly';

    const authUrl = `https://app.hubapi.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    res.json({ authUrl });
  } catch (err) {
    logger.error('HubSpot auth URL generation failed', err);
    res.status(500).json({ error: err.message });
  }
});

// GA4 OAuth callback (similar pattern)
app.post('/api/integrations/ga4/oauth-callback', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    // Exchange code for GA4 access token (using Google OAuth 2.0 flow)
    const tokenResponse = await ga4Service.exchangeGa4AuthCode(code);
    
    if (!tokenResponse || !tokenResponse.access_token) {
      return res.status(400).json({ error: 'Failed to exchange GA4 code' });
    }

    // Update settings with GA4 credentials
    const updateQ = `UPDATE settings SET integrations = jsonb_set(integrations, '{ga4}', $1) WHERE user_id = $2 RETURNING *`;
    const ga4Creds = JSON.stringify({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null
    });

    const { rows } = await client.query(updateQ, [ga4Creds, userId]);
    res.json({ ok: true, credentials: rows[0].integrations.ga4 });
  } catch (err) {
    logger.error('GA4 OAuth callback failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GA4 OAuth URL generation
app.get('/api/integrations/ga4/auth-url', clerkAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/integrations/ga4/oauth-callback`;
    const scopes = 'https://www.googleapis.com/auth/analytics.readonly';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline`;
    res.json({ authUrl });
  } catch (err) {
    logger.error('GA4 auth URL generation failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync HubSpot deals and persist to DB (protected)
app.post('/api/hubspot/sync', clerkAuth, async (req, res) => {
  try {
    const { creds, campaignId: _campaignId } = req.body;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const client = await pool.connect();
    try {
      // If a campaignId was provided ensure it belongs to the user
      if (_campaignId) {
        const r = await client.query('SELECT id FROM campaigns WHERE id = $1 AND user_id = $2', [_campaignId, userId]);
        if (!r.rows.length) return res.status(404).json({ error: 'Campaign not found' });
      }

      // prefer provided creds (for PAT/manual), otherwise use user Clerk stored token or settings
      let token = creds?.access_token || await hubspotService.getHubSpotToken(userId, client);

      try {
        const deals = await fetchHubSpotDeals(creds || { access_token: token });
        // Upsert deals into Postgres
        await client.query('BEGIN');
        for (const d of deals) {
          await client.query(`
            INSERT INTO deals (campaign_id, hubspot_deal_id, name, amount, status, closed_date, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,now())
            ON CONFLICT (hubspot_deal_id) DO UPDATE SET name = EXCLUDED.name, amount = EXCLUDED.amount, status = EXCLUDED.status, closed_date = EXCLUDED.closed_date
          `, [_campaignId || null, d.hubspot_deal_id, d.name, d.amount, d.status, d.closed_date]);
        }
        await client.query('COMMIT');
        return res.json({ imported: deals.length, deals });
      } catch (err) {
        // attempt token refresh when unauthorized
        if (err && err.status === 401) {
          try {
            const newAccess = await hubspotService.refreshHubSpotToken(userId, client);
            if (newAccess) {
              const deals = await fetchHubSpotDeals({ access_token: newAccess });
              await client.query('BEGIN');
              for (const d of deals) {
                await client.query(`
                  INSERT INTO deals (campaign_id, hubspot_deal_id, name, amount, status, closed_date, created_at)
                  VALUES ($1,$2,$3,$4,$5,$6,now())
                  ON CONFLICT (hubspot_deal_id) DO UPDATE SET name = EXCLUDED.name, amount = EXCLUDED.amount, status = EXCLUDED.status, closed_date = EXCLUDED.closed_date
                `, [_campaignId || null, d.hubspot_deal_id, d.name, d.amount, d.status, d.closed_date]);
              }
              await client.query('COMMIT');
              return res.json({ imported: deals.length, deals });
            }
          } catch (refreshErr) {
            console.warn('HubSpot refresh failed during sync', refreshErr?.message || refreshErr);
          }
        }
        throw err;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy GA4 metrics (server-side, to protect tokens)
app.post('/api/ga4/metrics', clerkAuth, async (req, res) => {
  try {
    const { creds } = req.body;
    if (!creds) return res.status(400).json({ error: 'Missing credentials' });
    const metrics = await ga4Service.fetchGa4Metrics(creds);
    res.json({ metrics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Advisor route: analyze campaigns using AI (server-side)
app.post('/api/advisor/analyze', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { campaigns } = req.body; // expect campaigns: CampaignWithStats[]
    if (!Array.isArray(campaigns)) return res.status(400).json({ error: 'Missing campaigns array' });

    const report = await geminiService.getIntelligenceReport(campaigns);

    // Persist report to intel_reports
    const insertQ = `INSERT INTO intel_reports (user_id, campaign_data, report_json) VALUES ($1, $2, $3) RETURNING id, generated_at`;
    const { rows } = await client.query(insertQ, [userId, JSON.stringify(campaigns), JSON.stringify(report)]);

    const saved = rows[0];
    const full = { ...report, generated_at: saved.generated_at };

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Basic campaign endpoints (multi-tenant via user_id)
app.get('/api/campaigns', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { rows } = await client.query('SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Paddle billing webhook (stub)
const paddleService = require('./services/paddleService');
app.post('/api/billing/webhook', async (req, res) => {
  try {
    await paddleService.handlePaddleWebhook(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Paddle webhook handler failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger the scheduler run (protected)
app.post('/api/scheduler/run', clerkAuth, async (req, res) => {
  try {
    await scheduler.runNow(pool, { fetchGa4Metrics: ga4Service.fetchGa4Metrics });
    res.json({ ok: true, message: 'Scheduler run completed' });
  } catch (err) {
    console.error('Scheduler run failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new campaign. Requires user_id in body (from Clerk useAuth on client).
app.post('/api/campaigns', clerkAuth, validateRequest(campaignSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const payload = req.body;
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Generate unique tracking_id
    let trackingId;
    for (let i = 0; i < 10; i++) {
      trackingId = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6);
      const { rows } = await client.query('SELECT id FROM campaigns WHERE tracking_id = $1', [trackingId]);
      if (rows.length === 0) break;
    }

    const insertQ = `INSERT INTO campaigns (user_id, name, utm_source, utm_medium, utm_campaign, tracking_id, destination_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now()) RETURNING *`;
    const { rows } = await client.query(insertQ, [userId, payload.name, payload.utm_source || null, payload.utm_medium || null, payload.utm_campaign || null, trackingId, payload.destination_url]);
    logger.info(`Campaign created: ${rows[0].id}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error('Create campaign failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update campaign (supports asset_ids, target_roi, etc.)
app.put('/api/campaigns/:id', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { asset_ids, target_roi, estimated_ad_spend, estimated_production_cost, name } = req.body;

    // Verify ownership
    const checkQ = 'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2';
    const checkRes = await client.query(checkQ, [id, userId]);
    if (!checkRes.rows.length) return res.status(404).json({ error: 'Campaign not found' });

    // Build update query
    const updates = [];
    const params = [id];
    let paramIdx = 2;

    if (asset_ids !== undefined) {
      updates.push(`asset_ids = $${paramIdx++}`);
      params.push(asset_ids);
    }
    if (target_roi !== undefined) {
      updates.push(`target_roi = $${paramIdx++}`);
      params.push(target_roi);
    }
    if (estimated_ad_spend !== undefined) {
      updates.push(`estimated_ad_spend = $${paramIdx++}`);
      params.push(estimated_ad_spend);
    }
    if (estimated_production_cost !== undefined) {
      updates.push(`estimated_production_cost = $${paramIdx++}`);
      params.push(estimated_production_cost);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push(`updated_at = now()`);
    const query = `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const { rows } = await client.query(query, params);

    res.json(rows[0]);
  } catch (err) {
    logger.error('Update campaign failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/campaigns/:id', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const campaignRes = await client.query('SELECT * FROM campaigns WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!campaignRes.rows.length) return res.status(404).json({ error: 'Not found' });
    const campaign = campaignRes.rows[0];

    // aggregate revenue from deals
    const dealsRes = await client.query('SELECT * FROM deals WHERE campaign_id = $1', [id]);
    const deals = dealsRes.rows;
    const totalRevenue = deals.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    res.json({ ...campaign, totalRevenue, deals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get or create settings for user (protected)
app.get('/api/settings', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await client.query('SELECT * FROM settings WHERE user_id = $1', [userId]);
    if (!rows.length) {
      // Create default settings
      const insertQ = `INSERT INTO settings (user_id, integrations, created_at, updated_at) VALUES ($1, $2, now(), now()) RETURNING *`;
      const newSettings = await client.query(insertQ, [userId, JSON.stringify({ hubspot: {}, ga4: {} })]);
      return res.json(newSettings.rows[0]);
    }
    res.json(rows[0]);
  } catch (err) {
    logger.error('Get settings failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update settings for user (protected)
app.patch('/api/settings', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { integrations, report_email, custom_domain } = req.body;

    // Build partial update
    const updates = [];
    const params = [userId];
    let paramIdx = 2;

    if (integrations) {
      updates.push(`integrations = $${paramIdx++}`);
      params.push(JSON.stringify(integrations));
    }
    if (report_email !== undefined) {
      updates.push(`report_email = $${paramIdx++}`);
      params.push(report_email);
    }
    if (custom_domain !== undefined) {
      updates.push(`custom_domain = $${paramIdx++}`);
      params.push(custom_domain);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push(`updated_at = now()`);
    const query = `UPDATE settings SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`;
    const { rows } = await client.query(query, params);

    if (!rows.length) {
      // Settings don't exist, create them
      const insertQ = `INSERT INTO settings (user_id, integrations, report_email, custom_domain, created_at, updated_at) VALUES ($1, $2, $3, $4, now(), now()) RETURNING *`;
      const newRows = await client.query(insertQ, [userId, JSON.stringify(integrations || {}), report_email || null, custom_domain || null]);
      return res.json(newRows.rows[0]);
    }

    res.json(rows[0]);
  } catch (err) {
    logger.error('Update settings failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Scheduler run endpoint (public for external cron services - Replit failsafe)
// Protect with query parameter token if SCHEDULER_TOKEN env var is set
app.get('/api/scheduler/run', async (req, res) => {
  try {
    const token = req.query.token || req.headers['x-scheduler-token'];
    const expectedToken = process.env.SCHEDULER_TOKEN;

    // If SCHEDULER_TOKEN is set, require it in the request
    if (expectedToken && token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid or missing scheduler token' });
    }

    // Run the scheduler
    const s = scheduler.start(pool, { fetchGa4Metrics: ga4Service.fetchGa4Metrics });
    if (s && s.runOnce) {
      await s.runOnce();
      res.json({ ok: true, message: 'Scheduler run completed successfully' });
    } else {
      res.status(500).json({ error: 'Scheduler not initialized' });
    }
  } catch (err) {
    logger.error('Scheduler run failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete campaign endpoint (protected)
app.delete('/api/campaigns/:id', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    // Verify ownership
    const checkQ = 'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2';
    const checkRes = await client.query(checkQ, [id, userId]);
    if (!checkRes.rows.length) return res.status(404).json({ error: 'Campaign not found' });

    // Delete cascade handled by DB FK
    await client.query('DELETE FROM campaigns WHERE id = $1', [id]);
    res.json({ ok: true, message: 'Campaign deleted' });
  } catch (err) {
    logger.error('Delete campaign failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Export campaigns as CSV (protected)
app.get('/api/campaigns/export/csv', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows: campaigns } = await client.query(
      'SELECT id, name, utm_source, utm_medium, utm_campaign, revenue, conversions, estimated_ad_spend, estimated_production_cost, last_true_roi, last_reported_at FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    if (campaigns.length === 0) {
      return res.status(200).json({ message: 'No campaigns to export' });
    }

    // Build CSV
    const headers = ['Campaign Name', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Revenue', 'Conversions', 'Ad Spend', 'Production Cost', 'True ROI', 'Last Reported'];
    const rows = campaigns.map(c => [
      c.name,
      c.utm_source || '',
      c.utm_medium || '',
      c.utm_campaign || '',
      c.revenue || '0',
      c.conversions || '0',
      c.estimated_ad_spend || '0',
      c.estimated_production_cost || '0',
      c.last_true_roi ? c.last_true_roi.toFixed(2) : 'N/A',
      c.last_reported_at ? new Date(c.last_reported_at).toLocaleDateString() : ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campaigns-export.csv"');
    res.send(csv);
  } catch (err) {
    logger.error('CSV export failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get campaign ROI history (protected)
app.get('/api/campaigns/:id/history', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    // Verify ownership
    const checkQ = 'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2';
    const checkRes = await client.query(checkQ, [id, userId]);
    if (!checkRes.rows.length) return res.status(404).json({ error: 'Campaign not found' });

    // Get intel reports for this campaign
    const historyQ = `
      SELECT generated_at, report_json FROM intel_reports 
      WHERE user_id = $1 AND campaign_data @> $2::jsonb
      ORDER BY generated_at DESC LIMIT 12
    `;
    const { rows } = await client.query(historyQ, [userId, JSON.stringify([{ id }])]);

    res.json(rows);
  } catch (err) {
    logger.error('Get campaign history failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Stat deletion endpoint (protected)
app.delete('/api/stats/:id', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    // Delete stat (note: may want to verify ownership via campaign relationship)
    await client.query('DELETE FROM stats WHERE id = $1', [id]);
    res.json({ ok: true, message: 'Stat deleted' });
  } catch (err) {
    logger.error('Delete stat failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all assets for user (protected)
app.get('/api/assets', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await client.query('SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (err) {
    logger.error('Get assets failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Create/update asset (protected)
app.post('/api/assets', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { id, name, type, cost_amount, cost_type } = req.body;
    if (!name || !type || cost_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, type, cost_amount' });
    }

    const assetId = id || `asset_${Date.now()}`;
    const insertQ = `
      INSERT INTO assets (id, user_id, name, type, cost_amount, cost_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, cost_amount = EXCLUDED.cost_amount, cost_type = EXCLUDED.cost_type
      RETURNING *
    `;
    const { rows } = await client.query(insertQ, [assetId, userId, name, type, cost_amount, cost_type || 'ONE_OFF']);

    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error('Create asset failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete asset (protected)
app.delete('/api/assets/:id', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    await client.query('DELETE FROM assets WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ ok: true, message: 'Asset deleted' });
  } catch (err) {
    logger.error('Delete asset failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Admin: list scheduler runs (protected)
app.get('/api/admin/scheduler_runs', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const { rows } = await client.query('SELECT id, started_at, finished_at, status, message, meta, created_by FROM scheduler_runs ORDER BY started_at DESC LIMIT $1', [limit]);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch scheduler runs', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Trigger notification processing (admin only)
// Send emails to users based on their engagement & lifecycle stage
app.post('/api/admin/process-notifications', adminLimiter, clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    // In production, verify user is admin
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await notificationService.processNotifications(client);
    res.json(result);
  } catch (err) {
    logger.error('Notification processing failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Test Slack alert (admin only)
app.post('/api/admin/test-slack', adminLimiter, clerkAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await notificationService.sendSlackAlert('new_free_signup', {
      email: 'test@example.com'
    });

    res.json({ ok: true, message: 'Slack alert sent' });
  } catch (err) {
    logger.error('Slack test failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Test email (admin only)
app.post('/api/admin/test-email', adminLimiter, clerkAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { email, template } = req.body;
    if (!email || !template) return res.status(400).json({ error: 'Missing email or template' });

    const emailId = await notificationService.sendEmail(email, template, { name: 'Test User' });
    res.json({ ok: true, email_id: emailId });
  } catch (err) {
    logger.error('Email test failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Track first user signup (called by frontend on first login)
app.post('/api/auth/track-signup', clerkAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Check if this is truly a new user (created in last minute)
    const { rows } = await client.query('SELECT created_at FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const userCreated = new Date(rows[0].created_at);
    const now = new Date();
    const minutesOld = (now - userCreated) / 60000;

    // Only send alert for users created within last minute
    if (minutesOld < 1) {
      try {
        // Get user email from Clerk if possible
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser?.primaryEmailAddress?.emailAddress || 'unknown';

        // Send Slack alert for new signup
        await notificationService.sendSlackAlert('new_free_signup', {
          email: email,
          created_at: userCreated.toISOString()
        });
      } catch (err) {
        console.warn('Failed to send signup notification', err?.message || err);
      }
    }

    res.json({ ok: true, isNewUser: minutesOld < 1 });
  } catch (err) {
    logger.error('Signup tracking failed', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Start server and scheduler (only when run directly)
if (require.main === module) {
  const port = process.env.PORT || 4000;
  const server = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
    // start scheduler with the Postgres pool & a small runner function to compute ROIs
    scheduler.start(pool, { fetchGa4Metrics: ga4Service.fetchGa4Metrics });
  });

  // Graceful shutdown
  const handleShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await pool.end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error('Error closing database pool', err);
      }
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
  });
}

module.exports = app;
