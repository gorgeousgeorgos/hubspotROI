const fetch = global.fetch || require('node-fetch');
const logger = require('../src/logger');

/**
 * Smart Notification Service
 * Sends Slack alerts to admin + timely emails to users (never spam)
 */

// Send Slack alert to admin (for new signups, upgrades, etc)
async function sendSlackAlert(event, details) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) {
    logger.warn('SLACK_WEBHOOK_URL not set, skipping Slack notification');
    return;
  }

  try {
    let color, title, text;

    if (event === 'new_free_signup') {
      color = '#3498db'; // blue
      title = '🎉 New Free Signup';
      text = `${details.email} just joined! Plan: Free`;
    } else if (event === 'new_paid_signup') {
      color = '#2ecc71'; // green
      title = '💰 New Paid Upgrade!';
      text = `${details.email} upgraded to PRO! 🎯`;
    } else if (event === 'new_pro_signup') {
      color = '#2ecc71'; // green
      title = '💰 New PRO Subscription!';
      text = `${details.email} started with PRO plan! Plan: ${details.plan || 'PRO'}`;
    } else if (event === 'upgrade_to_pro') {
      color = '#27ae60'; // darker green
      title = '📈 User Upgraded to PRO!';
      text = `${details.email} upgraded from ${details.from_plan || 'FREE'} to ${details.to_plan || 'PRO'}! 🚀`;
    } else if (event === 'user_created_campaign') {
      color = '#f39c12'; // orange
      title = '🚀 User Started Creating';
      text = `${details.email} created their first campaign`;
    } else if (event === 'user_set_report_email') {
      color = '#9b59b6'; // purple
      title = '📧 Weekly Reports Enabled';
      text = `${details.email} set up weekly intelligence reports`;
    } else {
      return; // Unknown event
    }

    const payload = {
      attachments: [
        {
          color,
          title,
          text,
          footer: 'HubSpot ROI Attribution',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.warn('Slack notification failed', response.statusText);
    }
  } catch (err) {
    logger.error('Slack alert failed', err?.message || err);
  }
}

// Send email via Resend
async function sendEmail(to, template, data) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  try {
    let subject, html;

    if (template === 'welcome_free') {
      subject = 'Welcome to Foundry Attribution! 🎯';
      html = `
        <h2>Hey ${data.name || 'there'}!</h2>
        <p>Thanks for signing up to <strong>Foundry</strong> – the easiest way to track True ROI across your growth stack.</p>
        
        <h3>Here's what you can do:</h3>
        <ol>
          <li><strong>Create a Campaign</strong> - Generate trackable UTM links with one click</li>
          <li><strong>Add Your Assets</strong> - Tell Foundry what production costs went into each campaign</li>
          <li><strong>Connect HubSpot</strong> - We'll pull deal data automatically</li>
          <li><strong>See Your True ROI</strong> - Revenue minus (Ad Spend + Production Cost)</li>
        </ol>

        <p><a href="https://foundry.io/app/campaigns" style="background: #3498db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Get Started →</a></p>

        <p>Questions? Reply to this email or check our docs.</p>
        <p>— The Foundry Team</p>
      `;
    } else if (template === 'welcome_paid') {
      subject = 'Welcome to Foundry PRO! 💎';
      html = `
        <h2>You're all set!</h2>
        <p>Thanks for upgrading to <strong>Foundry PRO</strong>.</p>
        
        <p>You now have:</p>
        <ul>
          <li>✓ Unlimited campaign links</li>
          <li>✓ AI-powered intelligence reports every Sunday</li>
          <li>✓ Custom tracking domains</li>
          <li>✓ Team collaboration</li>
        </ul>

        <p><a href="https://foundry.io/app/settings" style="background: #2ecc71; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Finish Setup →</a></p>

        <p>— The Foundry Team</p>
      `;
    } else if (template === 'first_step_nudge') {
      subject = 'Ready to track your first campaign?';
      html = `
        <h2>Hi ${data.name || 'there'}!</h2>
        <p>You signed up for Foundry a few days ago. Just checking in – are you ready to create your first campaign?</p>

        <p>It takes 60 seconds:</p>
        <ol>
          <li>Go to Link Registry</li>
          <li>Click "Provision Link DNA"</li>
          <li>Pick your UTM params</li>
          <li>Done!</li>
        </ol>

        <p><a href="https://foundry.io/app/campaigns" style="background: #3498db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Create First Campaign →</a></p>

        <p><em>Stuck? Just reply to this email.</em></p>
      `;
    } else if (template === 'upgrade_after_month') {
      subject = 'Want unlimited campaigns? Upgrade to PRO';
      html = `
        <h2>Hey ${data.name || 'there'}!</h2>
        <p>You've been using Foundry for a month now. Great start! 🎯</p>

        <p>You're currently on our <strong>Free</strong> plan, which includes:</p>
        <ul>
          <li>1 campaign per month</li>
          <li>Manual ROI entry</li>
          <li>Basic attribution</li>
        </ul>

        <p>But if you want to scale, consider <strong>PRO</strong> ($99/mo):</p>
        <ul>
          <li>🔓 Unlimited campaigns</li>
          <li>🤖 AI-powered intelligence every Sunday</li>
          <li>🎯 Custom tracking domains</li>
          <li>👥 Team collaboration</li>
        </ul>

        <p><a href="https://foundry.io/app/settings?tab=account" style="background: #2ecc71; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Upgrade to PRO →</a></p>

        <p><strong>Or stay on Free!</strong> No pressure. Use it however works for you.</p>
      `;
    } else if (template === 'winback_paid') {
      subject = 'We miss you! Here\'s what\'s new in Foundry';
      html = `
        <h2>Hey ${data.name || 'there'}!</h2>
        <p>It's been a couple months since we last saw you. Just wanted to check in!</p>

        <p>We've made some improvements since you signed up:</p>
        <ul>
          <li>✨ Gemini AI now powers attribution insights</li>
          <li>📊 CSV exports for reporting</li>
          <li>🔗 Asset linking to campaigns</li>
          <li>📧 Weekly intelligence digests</li>
        </ul>

        <p>As a PRO subscriber, you get all of this automatically. Come back and take a look?</p>

        <p><a href="https://foundry.io/app" style="background: #3498db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Log Back In →</a></p>

        <p>Questions? We're here to help.</p>
      `;
    } else {
      return; // Unknown template
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@foundry.io',
        to,
        subject,
        html,
        reply_to: 'support@foundry.io'
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      logger.warn('Resend email failed', err?.message || response.statusText);
      return null;
    }

    const result = await response.json();
    return result.id;
  } catch (err) {
    logger.error('Email send failed', err?.message || err);
    return null;
  }
}

// Track sent emails to avoid duplicates
async function logEmailSent(userId, template, client) {
  try {
    await client.query(
      `INSERT INTO notification_log (user_id, template, sent_at) VALUES ($1, $2, now())`,
      [userId, template]
    );
  } catch (err) {
    logger.warn('Failed to log email', err?.message || err);
  }
}

// Check if email already sent recently (within 30 days)
async function wasEmailRecentlySent(userId, template, client) {
  try {
    const { rows } = await client.query(
      `SELECT sent_at FROM notification_log 
       WHERE user_id = $1 AND template = $2 
       AND sent_at > now() - interval '30 days'
       ORDER BY sent_at DESC LIMIT 1`,
      [userId, template]
    );
    return rows.length > 0;
  } catch (err) {
    logger.warn('Failed to check notification log', err?.message || err);
    return false;
  }
}

// Get user last login date
async function getLastLogin(userId, client) {
  try {
    const { rows } = await client.query(
      `SELECT last_login FROM users WHERE id = $1`,
      [userId]
    );
    return rows[0]?.last_login ? new Date(rows[0].last_login) : null;
  } catch (err) {
    return null;
  }
}

// Check if user created any campaigns
async function hasCreatedCampaigns(userId, client) {
  try {
    const { rows } = await client.query(
      `SELECT COUNT(*) as count FROM campaigns WHERE user_id = $1`,
      [userId]
    );
    return parseInt(rows[0].count || '0') > 0;
  } catch (err) {
    return false;
  }
}

// Get user created date
async function getUserCreatedDate(userId, client) {
  try {
    const { rows } = await client.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId]
    );
    return rows[0]?.created_at ? new Date(rows[0].created_at) : null;
  } catch (err) {
    return null;
  }
}

// Get user subscription
async function getUserSubscription(userId, client) {
  try {
    const { rows } = await client.query(
      `SELECT integrations FROM settings WHERE user_id = $1`,
      [userId]
    );
    const settings = rows[0];
    // This is approximate - you might store subscription differently
    return settings?.integrations?.subscription || 'FREE';
  } catch (err) {
    return 'FREE';
  }
}

// Main: Check if user needs an email
// Returns { shouldSend: boolean, template: string, reason: string }
async function checkUserNotificationStatus(userId, client) {
  try {
    const createdDate = await getUserCreatedDate(userId, client);
    const lastLogin = await getLastLogin(userId, client);
    const hasCampaigns = await hasCreatedCampaigns(userId, client);
    const { rows } = await client.query(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    );
    const email = rows[0]?.email;

    if (!createdDate || !email) return null;

    const now = new Date();
    const daysOld = (now - createdDate) / (1000 * 60 * 60 * 24);
    const daysSinceLastLogin = lastLogin ? (now - lastLogin) / (1000 * 60 * 60 * 24) : daysOld;

    // Only email if inactive (> 7 days since last login)
    if (daysSinceLastLogin < 7) {
      return { shouldSend: false, reason: 'User recently active' };
    }

    // 3 days old + no campaigns = first step nudge
    if (daysOld >= 3 && daysOld < 10 && !hasCampaigns) {
      const alreadySent = await wasEmailRecentlySent(userId, 'first_step_nudge', client);
      if (!alreadySent) {
        return {
          shouldSend: true,
          template: 'first_step_nudge',
          email,
          reason: 'New user, 3+ days, no campaigns'
        };
      }
    }

    // 30 days old + no campaigns = upgrade offer
    if (daysOld >= 30 && !hasCampaigns) {
      const alreadySent = await wasEmailRecentlySent(userId, 'upgrade_after_month', client);
      if (!alreadySent) {
        return {
          shouldSend: true,
          template: 'upgrade_after_month',
          email,
          reason: 'Free user, 30+ days, inactive'
        };
      }
    }

    // 60+ days inactive on paid = winback
    if (daysOld >= 60 && daysSinceLastLogin >= 60) {
      const alreadySent = await wasEmailRecentlySent(userId, 'winback_paid', client);
      if (!alreadySent) {
        return {
          shouldSend: true,
          template: 'winback_paid',
          email,
          reason: 'Paid user, 60+ days inactive'
        };
      }
    }

    return { shouldSend: false, reason: 'User does not match any criteria' };
  } catch (err) {
    logger.error('Failed to check notification status', err?.message || err);
    return null;
  }
}

// Main: Process all users and send due notifications
async function processNotifications(client) {
  try {
    const { rows: users } = await client.query(`
      SELECT id, email FROM users WHERE created_at IS NOT NULL LIMIT 1000
    `);

    let processed = 0;
    let sent = 0;

    for (const user of users) {
      const status = await checkUserNotificationStatus(user.id, client);

      if (status && status.shouldSend) {
        const emailId = await sendEmail(status.email, status.template, { name: status.email.split('@')[0] });
        if (emailId) {
          await logEmailSent(user.id, status.template, client);
          sent++;
          logger.info(`Sent ${status.template} to ${status.email}`);
        }
      }

      processed++;
    }

    return { processed, sent };
  } catch (err) {
    logger.error('Notification processing failed', err?.message || err);
    return { processed: 0, sent: 0, error: err?.message };
  }
}

module.exports = {
  sendSlackAlert,
  sendEmail,
  logEmailSent,
  wasEmailRecentlySent,
  checkUserNotificationStatus,
  processNotifications
};
