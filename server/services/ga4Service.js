const fetch = global.fetch || require('node-fetch');

// Helper: read GA4 creds for a user from the settings table
async function getGa4CredsForUser(userId, client) {
  if (!userId || !client) return null;
  try {
    const { rows } = await client.query('SELECT integrations FROM settings WHERE user_id = $1 LIMIT 1', [userId]);
    if (!rows || !rows.length) return null;
    const integrations = rows[0].integrations || {};
    return integrations.ga4 || null; // expected shape: { measurementId, apiSecret, accessToken, propertyId }
  } catch (err) {
    console.warn('getGa4CredsForUser failed', err?.message || err);
    return null;
  }
}

// Server-side GA4 service
async function fetchGa4Metrics({ userId = null, client = null, creds = null } = {}) {
  // Priority: explicit creds -> user settings -> env fallbacks
  let resolved = creds;

  if (!resolved && userId && client) {
    resolved = await getGa4CredsForUser(userId, client);
  }

  // fallback to env if still missing
  if (!resolved) {
    resolved = {
      accessToken: process.env.GA4_ACCESS_TOKEN,
      propertyId: process.env.GA4_PROPERTY_ID
    };
  }

  if (!resolved || !resolved.accessToken || !resolved.propertyId) throw new Error('GA4 Credentials incomplete.');

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${resolved.propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'sessionCampaign' }],
      metrics: [{ name: 'conversions' }, { name: 'totalRevenue' }, { name: 'advertiserAdSpend' }],
      keepEmptyRows: false
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`GA4 Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return (data.rows || []).map((row, idx) => ({
    id: `ga_sig_${idx}`,
    campaign_id: row.dimensionValues[1].value,
    date: row.dimensionValues[0].value,
    revenue: parseFloat(row.metricValues[1].value) || 0,
    conversions: parseInt(row.metricValues[0].value) || 0,
    ad_spend: parseFloat(row.metricValues[2].value) || 0
  }));
}

// Test Measurement Protocol ping (returns true if 204)
async function testMeasurementProtocol(measurementId, apiSecret) {
  if (!measurementId || !apiSecret) throw new Error('Missing measurementId or apiSecret');
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ client_id: `foundry_test_${Math.random().toString(36).slice(2,8)}`, events: [{ name: 'test_ping' }] }),
      headers: { 'Content-Type': 'application/json' }
    });
    return resp.status === 204;
  } catch (err) {
    console.warn('Measurement Protocol test failed', err?.message || err);
    return false;
  }
}

module.exports = { fetchGa4Metrics, getGa4CredsForUser, testMeasurementProtocol, exchangeGa4AuthCode, refreshGa4Token };

// OAuth: exchange Google authorization code for access token
async function exchangeGa4AuthCode(code) {
  if (!code) throw new Error('Missing authorization code');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/integrations/ga4/oauth-callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials in environment');
  }

  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const b = await tokenRes.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${tokenRes.status} ${b}`);
  }

  const tokenBody = await tokenRes.json();
  return {
    access_token: tokenBody.access_token,
    refresh_token: tokenBody.refresh_token,
    expires_in: tokenBody.expires_in
  };
}

// Refresh GA4 access token using refresh token
async function refreshGa4Token(refreshToken) {
  if (!refreshToken) throw new Error('Missing refresh token');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials in environment');
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const b = await tokenRes.text().catch(() => '');
    throw new Error(`GA4 token refresh failed: ${tokenRes.status} ${b}`);
  }

  const tokenBody = await tokenRes.json();
  return {
    access_token: tokenBody.access_token,
    expires_in: tokenBody.expires_in
  };
}
