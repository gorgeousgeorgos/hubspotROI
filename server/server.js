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
