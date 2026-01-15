# Notifications System Setup

## Overview
The Foundry now includes a smart notification system that:
- **Alerts you immediately** when users sign up (free or paid) via Slack
- **Sends contextual emails** to inactive users with gentle nudges and upgrade offers
- **Never spams** - emails are only sent if user is inactive 7+ days and meets specific criteria
- **Deduplicates** - tracks which emails were sent to prevent duplicate messages within 30 days
- **Integrates with Paddle** - auto-alerts on subscription upgrades

## Required Environment Variables

Add these to your `.env.local` or Replit Secrets:

### Slack Setup
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to get your Slack Webhook:**
1. Go to https://api.slack.com/apps
2. Create a new app (or use existing one)
3. Enable "Incoming Webhooks"
4. Click "Add New Webhook to Workspace"
5. Select your channel and authorize
6. Copy the webhook URL

### Email Setup (Resend)
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@foundry.io  # optional, defaults to Resend's default
```

**How to get your Resend API key:**
1. Go to https://resend.com
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and save it

## How It Works

### 1. Real-Time Slack Alerts

When these events happen, you get **immediate Slack notifications**:

#### New Free Signup
- **Event**: User creates account
- **Alert**: "🎉 New Free Signup - user@example.com just joined!"
- **Trigger**: First login via `/api/auth/track-signup` endpoint
- **When**: Immediately

#### New PRO Signup (Paddle Webhook)
- **Event**: User signs up directly with paid plan
- **Alert**: "💰 New PRO Subscription! user@example.com started with PRO plan!"
- **Trigger**: `subscription.created` event from Paddle
- **When**: Immediately when webhook received

#### Upgrade to PRO
- **Event**: User upgrades from free → paid
- **Alert**: "📈 User Upgraded to PRO! user@example.com upgraded from FREE to PRO!"
- **Trigger**: `subscription.updated` event from Paddle
- **When**: Immediately when webhook received

### 2. Automated Emails (Weekly Batch Process)

**Scheduler**: Runs every **Sunday at 9:00 AM UTC** (configurable via `SCHEDULER_TZ`)

The notification processor checks all users and sends emails based on behavior:

#### Template 1: Welcome (Free)
- **Sends to**: New free users (day 1)
- **Content**: Welcome message, feature overview
- **Goal**: Onboarding

#### Template 2: Welcome (PRO)
- **Sends to**: New PRO users (day 1)
- **Content**: Premium feature highlights, quick start guide
- **Goal**: PRO customer success

#### Template 3: First Step Nudge
- **Sends to**: Users 3-10 days old, no campaigns yet, inactive 7+ days
- **Content**: Gentle nudge to create first campaign
- **Goal**: Activation

#### Template 4: Upgrade Offer
- **Sends to**: Free users 30+ days old, no campaigns, inactive 7+ days
- **Content**: Benefits of PRO, special offer link
- **Goal**: Conversion

#### Template 5: Winback Campaign
- **Sends to**: PRO users inactive 60+ days
- **Content**: "We miss you! Here's what's new..." + incentive to return
- **Goal**: Retention

### 3. Smart Logic

All email sending is **intentionally conservative**:

```javascript
// Email only sent if:
✅ User inactive > 7 days (active users never emailed)
✅ User not already sent this template in last 30 days
✅ User meets template-specific criteria (age, plan, campaigns, etc)
```

This ensures you never spam active users or repeat yourself.

## API Endpoints

### Test/Manual Trigger

**Process all pending notifications immediately:**
```bash
curl -X POST http://localhost:4000/api/admin/process-notifications \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "processed": 150,
  "sent": 23,
  "skipped": 127
}
```

**Test Slack alert:**
```bash
curl -X POST http://localhost:4000/api/admin/test-slack \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

**Test email template:**
```bash
curl -X POST http://localhost:4000/api/admin/test-email \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "template": "welcome_free"
  }'
```

### User Signup Tracking

Called automatically by frontend on first login, but can be triggered manually:
```bash
curl -X POST http://localhost:4000/api/auth/track-signup \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

## Database Schema

Notifications are tracked in the `notification_log` table:

```sql
CREATE TABLE notification_log (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,  -- 'welcome_free', 'upgrade_after_month', etc
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_template ON notification_log(template);
```

This table prevents duplicate emails by tracking:
- Who received an email
- Which template was sent
- When it was sent (to enforce 30-day cooldown)

## Service Code Overview

### notificationService.js

**Main functions:**
- `sendSlackAlert(event, details)` - Send Slack webhook notification
- `sendEmail(to, template, data)` - Send email via Resend
- `checkUserNotificationStatus(userId, client)` - Determine which emails to send
- `processNotifications(client)` - Main batch processor (runs on scheduler)
- `logEmailSent(userId, template, client)` - Track sent emails
- `wasEmailRecentlySent(userId, template, client)` - Check 30-day dedup
- `hasCreatedCampaigns(userId, client)` - Check if user has any campaigns
- `getLastLogin(userId, client)` - Get user's last login timestamp
- `getUserCreatedDate(userId, client)` - Get user signup date

### Server Integration

**Files modified:**
- `server/server.js` - Added endpoints + user sync on auth
- `server/scheduler.js` - Added notification processing to weekly run
- `server/services/notificationService.js` - New notification service
- `server/services/paddleService.js` - Enhanced with Slack alerts for upgrades
- `init_db.sql` - Added notification_log table

**Endpoints added:**
- `POST /api/auth/track-signup` - Track new user signup
- `POST /api/admin/process-notifications` - Manually trigger notification processing
- `POST /api/admin/test-slack` - Test Slack webhook
- `POST /api/admin/test-email` - Test email template

## Monitoring

### Check Notification Log

Query the database to see what emails were sent:
```sql
SELECT u.email, nl.template, nl.sent_at 
FROM notification_log nl
JOIN users u ON nl.user_id = u.id
ORDER BY nl.sent_at DESC
LIMIT 20;
```

### Check User Activity

See who was last active:
```sql
SELECT email, created_at, last_login, 
       EXTRACT(EPOCH FROM (now() - last_login)) / 86400 as days_inactive
FROM users
ORDER BY last_login DESC;
```

## Deployment Checklist

- [ ] Add `SLACK_WEBHOOK_URL` to Replit Secrets
- [ ] Add `RESEND_API_KEY` to Replit Secrets
- [ ] Run `init_db.sql` to add `notification_log` table
- [ ] Verify scheduler runs on Sunday 9 AM (or adjust `SCHEDULER_TZ`)
- [ ] Test endpoints with curl commands above
- [ ] Monitor first week for Slack alerts & emails

## Troubleshooting

### "SLACK_WEBHOOK_URL not set"
- Verify you added `SLACK_WEBHOOK_URL` to Replit Secrets
- Restart the server after adding secrets

### "RESEND_API_KEY not set"
- Verify you added `RESEND_API_KEY` to Replit Secrets
- Emails won't send until this is configured

### Emails not being sent
1. Check notification_log table - is the template being logged?
2. Run: `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 5;`
3. Test template manually: `POST /api/admin/test-email`
4. Check Resend dashboard for delivery status

### Slack alerts not appearing
1. Test webhook: `POST /api/admin/test-slack`
2. Verify webhook URL is correct in Slack app settings
3. Check server logs for "Slack notification failed" errors

### Double-check: Users not emailed
If users aren't getting emails despite running the processor:
1. They must be inactive 7+ days
2. They can't have been sent the same template in last 30 days
3. They must meet template-specific criteria (age, plan, campaigns)

Run this to debug:
```javascript
// In server console
const client = await pool.connect();
const status = await notificationService.checkUserNotificationStatus('user-id', client);
console.log(status);
// Shows: { welcome_free: false, first_step_nudge: true, ... }
client.release();
```

## Customization

### Add New Email Template

1. Edit `notificationService.js` in the `sendEmail` function
2. Add new template case:
```javascript
} else if (template === 'my_new_template') {
  subject = 'Your subject here';
  html = `<h2>Hello ${data.name}!</h2>...`;
```

3. Add trigger in `checkUserNotificationStatus`:
```javascript
// Check conditions for when to send
if (someCondition) {
  toSend.push('my_new_template');
}
```

4. Test: `POST /api/admin/test-email` with new template name

### Change Email Sender

The email domain/sender is configured in Resend. To change the sender:
1. Go to Resend dashboard
2. Update the from email in your domain settings
3. Update `RESEND_FROM_EMAIL` env var (optional)

### Change Scheduler Time

Edit `server/scheduler.js`:
```javascript
const SUNDAY_CRON = '0 9 * * 0'; // 9 AM UTC
// Change to '0 14 * * 0' for 2 PM UTC, etc
```

Or use `SCHEDULER_TZ` environment variable to change timezone.

## Cost Estimates

**Slack**: Free ✅

**Resend**:
- First 100 emails/day: Free
- $0.10 per 1000 emails for production
- With 150 active users sending 1-2 emails per month: ~$0.30-0.60/month

**Minimal impact on your costs!**

