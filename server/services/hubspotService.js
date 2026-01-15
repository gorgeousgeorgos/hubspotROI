const fetch = global.fetch || require('node-fetch');
const { Clerk } = require('@clerk/clerk-sdk-node');
const clerkClient = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

// Server-side HubSpot helper: retrieve OAuth token stored by Clerk for a given user
async function getHubSpotToken(userId) {
  try {
    if (!userId) throw new Error('Missing userId');
    // Uses Clerk backend SDK to fetch the OAuth access token for the "hubspot" provider
    const tokenData = await clerkClient.users.getUserOauthAccessToken(userId, { provider: 'hubspot' });
    if (tokenData && tokenData.access_token) return tokenData.access_token;
  } catch (err) {
    console.warn('Failed to get HubSpot token from Clerk for user', userId, err?.message || err);
  }
  // Fallback to owner token from env
  return process.env.HUBSPOT_ACCESS_TOKEN || null;
}

// Fetch and sum deal amounts for a campaign tracking id using a HubSpot access token
async function fetchDealsAmountForTrackingId(accessToken, trackingId) {
  if (!accessToken) throw new Error('HubSpot access token missing');

  const body = {
    filterGroups: [
      { filters: [{ propertyName: 'utm_campaign', operator: 'EQ', value: trackingId }] },
      { filters: [{ propertyName: 'description', operator: 'CONTAINS_TOKEN', value: `fnd=${trackingId}` }] },
      { filters: [{ propertyName: 'hs_analytics_latest_source_data_2', operator: 'CONTAINS_TOKEN', value: `fnd=${trackingId}` }] }
    ],
    properties: ['amount'],
    limit: 250
  };

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    // Attach status to error so callers can react (e.g. 401 => attempt refresh)
    const errBody = await response.json().catch(() => ({}));
    const e = new Error(`HubSpot Error: ${errBody.message || response.statusText}`);
    e.status = response.status;
    throw e;
  }

  const data = await response.json();
  const total = (data.results || []).reduce((sum, item) => sum + (parseFloat(item.properties?.amount) || 0), 0);
  return total;
}

// Fetch a list of deals using provided credentials (simple list, not paginated)
const { getCampaignIdFromFnd } = require('./campaignMapper');

async function fetchHubSpotDeals(creds = {}) {
  const accessToken = creds.access_token || process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing HubSpot access token');

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const e = new Error(`HubSpot list error: ${errBody.message || response.statusText}`);
    e.status = response.status;
    throw e;
  }

  const data = await response.json();
  return (data.results || []).map(d => {
    const desc = d.properties?.description || '';
    const fnd = getCampaignIdFromFnd(desc) || (d.properties?.hs_analytics_latest_source_data_2 || '')?.match(/fnd=([A-Za-z0-9\-_]+)/i)?.[1] || null;
    return {
      hubspot_deal_id: d.id,
      name: d.properties?.dealname || d.properties?.name || '',
      amount: parseFloat(d.properties?.amount || 0) || 0,
      status: d.properties?.dealstage || null,
      closed_date: d.properties?.closedate ? new Date(parseInt(d.properties.closedate)) : null,
      fnd_source: fnd
    };
  });
}

// Attempt to refresh tokens using available refresh_token (Clerk or settings table). Updates settings table with new tokens when possible.
async function refreshHubSpotToken(userId, client) {
  if (!userId) throw new Error('Missing userId for token refresh');
  let refreshToken = null;

  // Try Clerk's stored OAuth tokens first
  try {
    const tokenData = await clerkClient.users.getUserOauthAccessToken(userId, { provider: 'hubspot' });
    if (tokenData && tokenData.refresh_token) {
      refreshToken = tokenData.refresh_token;
    }
  } catch (err) {
    console.warn('Clerk refresh token unavailable for user', userId, err?.message || err);
  }

  // Fallback: check our settings table for stored refresh_token
  let localClient = client;
  let createdLocalClient = false;
  try {
    if (!localClient) {
      const { Pool } = require('pg');
      const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      localClient = await p.connect();
      createdLocalClient = true;
    }

    if (!refreshToken) {
      const { rows } = await localClient.query('SELECT integrations FROM settings WHERE user_id = $1 LIMIT 1', [userId]);
      if (rows[0] && rows[0].integrations && rows[0].integrations.hubspot && rows[0].integrations.hubspot.refreshToken) {
        refreshToken = rows[0].integrations.hubspot.refreshToken;
      }
    }

    if (!refreshToken) throw new Error('No refresh token available for HubSpot refresh');

    // Call HubSpot OAuth token endpoint
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', process.env.HUBSPOT_CLIENT_ID);
    params.append('client_secret', process.env.HUBSPOT_CLIENT_SECRET);
    params.append('refresh_token', refreshToken);

    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!tokenRes.ok) {
      const b = await tokenRes.text().catch(() => '');
      throw new Error(`HubSpot token refresh failed: ${tokenRes.status} ${b}`);
    }

    const tokenBody = await tokenRes.json();
    const newCreds = {
      accessToken: tokenBody.access_token,
      refreshToken: tokenBody.refresh_token || refreshToken,
      expiresAt: tokenBody.expires_in ? Math.floor(Date.now() / 1000) + parseInt(tokenBody.expires_in, 10) : null,
      portalId: tokenBody.hub_id || tokenBody.portalId || null
    };

    // Persist to settings table (upsert, merge integrations)
    const upsertQ = `INSERT INTO settings (user_id, integrations, created_at, updated_at) VALUES ($1, $2::jsonb, now(), now()) ON CONFLICT (user_id) DO UPDATE SET integrations = settings.integrations || $2::jsonb, updated_at = now()`;
    await localClient.query(upsertQ, [userId, JSON.stringify({ hubspot: newCreds })]);

    return newCreds.accessToken;
  } finally {
    if (createdLocalClient && localClient) localClient.release();
  }
}

module.exports = { getHubSpotToken, fetchDealsAmountForTrackingId, fetchHubSpotDeals, refreshHubSpotToken, exchangeHubSpotAuthCode };

// OAuth: exchange authorization code for access token
async function exchangeHubSpotAuthCode(code) {
  if (!code) throw new Error('Missing authorization code');

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/integrations/hubspot/oauth-callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing HubSpot OAuth credentials in environment');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('redirect_uri', redirectUri);
  params.append('code', code);

  const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const b = await tokenRes.text().catch(() => '');
    throw new Error(`HubSpot token exchange failed: ${tokenRes.status} ${b}`);
  }

  const tokenBody = await tokenRes.json();
  return {
    access_token: tokenBody.access_token,
    refresh_token: tokenBody.refresh_token,
    expires_in: tokenBody.expires_in,
    hub_id: tokenBody.hub_id
  };
}
