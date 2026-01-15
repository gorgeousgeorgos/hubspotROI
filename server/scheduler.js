const cron = require('node-cron');
const hubspotService = require('./services/hubspotService');
const geminiService = require('./services/geminiService');
const notificationService = require('./services/notificationService');

// Run every Sunday at 09:00 (server clock)
const SUNDAY_CRON = '0 9 * * 0';

function start(pool, { fetchGa4Metrics } = {}) {
  console.log('Scheduler: scheduling weekly ROI sync at Sunday 09:00');

  async function runOnce() {
    console.log('Scheduler: Running weekly ROI sync...');
    const client = await pool.connect();
    let runId = null;
    let processedUsers = 0;
    let processedCampaigns = 0;
    try {
      // create a scheduler_runs record for this run
      const ins = await client.query('INSERT INTO scheduler_runs (status, started_at) VALUES ($1, now()) RETURNING id', ['running']);
      runId = ins.rows[0].id;

      // Fetch all users to process their campaigns individually
      const usersRes = await client.query('SELECT id FROM users');
      for (const u of usersRes.rows) {
        const userId = u.id;
        processedUsers++;
        console.log('Scheduler: processing user', userId);
        const campsRes = await client.query('SELECT * FROM campaigns WHERE user_id = $1', [userId]);
        const campaigns = campsRes.rows;

        for (const campaign of campaigns) {
          processedCampaigns++;
          // First, attempt to fetch campaign revenue from HubSpot using the user's OAuth token
          let revenue = 0;
          try {
            const accessToken = await hubspotService.getHubSpotToken(userId, client);
            if (accessToken && campaign.tracking_id) {
              try {
                revenue = await hubspotService.fetchDealsAmountForTrackingId(accessToken, campaign.tracking_id);
              } catch (err) {
                // If unauthorized, attempt token refresh and retry once
                if (err && err.status === 401) {
                  console.log('Scheduler: HubSpot token expired, attempting refresh for user', userId);
                  try {
                    const newAccess = await hubspotService.refreshHubSpotToken(userId, client);
                    if (newAccess) {
                      revenue = await hubspotService.fetchDealsAmountForTrackingId(newAccess, campaign.tracking_id);
                    }
                  } catch (refreshErr) {
                    console.warn('Scheduler: HubSpot refresh failed for user', userId, refreshErr?.message || refreshErr);
                  }
                } else {
                  console.warn('Scheduler: HubSpot fetch failed for campaign', campaign.id, err?.message || err);
                }
              }
            }
          } catch (err) {
            console.warn('Scheduler: HubSpot fetch failed for campaign (outer)', campaign.id, err?.message || err);
          }

          // fallback: sum closed deals in our local deals table as a backup
          if (!revenue) {
            const dealsRes = await client.query('SELECT amount FROM deals WHERE campaign_id = $1', [campaign.id]);
            revenue = dealsRes.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
          }

          // Get ad spend (estimated) plus any GA4 aggregated spend if available
          let totalAdSpend = campaign.estimated_ad_spend || 0;
          try {
            if (process.env.GA4_ACCESS_TOKEN && process.env.GA4_PROPERTY_ID && fetchGa4Metrics) {
              const metrics = await fetchGa4Metrics({ accessToken: process.env.GA4_ACCESS_TOKEN, propertyId: process.env.GA4_PROPERTY_ID });
              const matches = metrics.filter(m => m.campaign_id && (m.campaign_id === campaign.utm_campaign || m.campaign_id === campaign.name));
              totalAdSpend = matches.reduce((s, m) => s + (m.ad_spend || 0), totalAdSpend);
            }
          } catch (err) {
            console.warn('Scheduler: GA4 fetch failed for campaign', campaign.id, err?.message || err);
          }

          const totalProductionCost = campaign.estimated_production_cost || 0;
          const spend = (totalAdSpend + totalProductionCost) || 0.0001;
          const trueRoi = (revenue - spend) / spend;

          // Count leads from customers table
          const custRes = await client.query('SELECT COUNT(*) FROM customers WHERE campaign_id = $1', [campaign.id]);
          const leads = parseInt(custRes.rows[0].count || '0');

          // Update campaign record
          await client.query(
            'UPDATE campaigns SET revenue = $1, last_true_roi = $2, last_reported_at = now(), conversions = $3 WHERE id = $4',
            [revenue, trueRoi, leads, campaign.id]
          );

          console.log(`Scheduler: user=${userId} campaign ${campaign.name} -> revenue=${revenue}, spend=${spend}, trueRoi=${isFinite(trueRoi) ? trueRoi.toFixed(2) : 'N/A'}`);
        }

        // After processing all campaigns for this user, generate a weekly intelligence report and persist it
        try {
          const latestRes = await client.query('SELECT id, name, utm_source, utm_medium, revenue, conversions, estimated_ad_spend, estimated_production_cost, last_true_roi FROM campaigns WHERE user_id = $1', [userId]);
          const campsForReport = latestRes.rows.map(c => ({
            name: c.name,
            totalRevenue: parseFloat(c.revenue || 0),
            totalConversions: parseInt(c.conversions || 0),
            totalAdSpend: parseFloat(c.estimated_ad_spend || 0),
            totalProductionCost: parseFloat(c.estimated_production_cost || 0),
            trueRoi: c.last_true_roi || 0,
            utm_source: c.utm_source,
            utm_medium: c.utm_medium,
            asset_ids: []
          }));

          if (campsForReport.length > 0) {
            try {
              const report = await geminiService.getIntelligenceReport(campsForReport);
              await client.query('INSERT INTO intel_reports (user_id, campaign_data, report_json) VALUES ($1,$2,$3)', [userId, JSON.stringify(campsForReport), JSON.stringify(report)]);
              console.log('Scheduler: saved intelligence report for user', userId);
            } catch (err) {
              console.warn('Scheduler: intelligence generation failed for user', userId, err?.message || err);
            }
          }
        } catch (err) {
          console.warn('Scheduler: failed to build report data for user', userId, err?.message || err);
        }
      }

      // Process user notifications (emails, Slack alerts)
      try {
        console.log('Scheduler: processing notifications');
        const notifResult = await notificationService.processNotifications(client);
        console.log('Scheduler: notifications completed', notifResult);
      } catch (err) {
        console.warn('Scheduler: notification processing failed', err?.message || err);
      }

      // mark run success
      await client.query('UPDATE scheduler_runs SET finished_at = now(), status = $1, message = $2, meta = $3 WHERE id = $4', ['success', 'Completed', JSON.stringify({ processedUsers, processedCampaigns }), runId]);
    } catch (err) {
      console.error('Scheduler: failed', err);
      if (runId) {
        await client.query('UPDATE scheduler_runs SET finished_at = now(), status = $1, message = $2 WHERE id = $3', ['failed', err?.message || String(err), runId]);
      }
    } finally {
      client.release();
    }
  }

  // Schedule the weekly run
  cron.schedule(SUNDAY_CRON, runOnce, { scheduled: true, timezone: process.env.SCHEDULER_TZ || 'UTC' });
  return { runOnce };
}

module.exports = {
  start,
  // convenience: run the sync immediately (useful for testing)
  runNow: async (pool, opts) => {
    const s = start(pool, opts);
    if (s && s.runOnce) return await s.runOnce();
    throw new Error('Scheduler not initialized');
  }
};
