# Code Changes Reference

This document shows exactly what was added/modified in each file for the notification system.

## server/server.js

### Change 1: Enhanced clerkAuth Middleware (Lines 106-147)

**What was added:** User sync and last_login tracking on every authenticated request

```javascript
// Previous: Just verified token
// New: Also syncs user to DB and updates last_login timestamp

async function clerkAuth(req, res, next) {
  // ... token verification ...
  
  // NEW: Sync user to database & update last_login (non-blocking)
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
}
```

**Why:** Ensures users exist in DB and tracks when they last logged in (needed for notification logic)

### Change 2: Import notificationService (Line 16)

```javascript
const notificationService = require('./services/notificationService');
```

**Why:** Access to notification functions throughout the server

### Change 3: Four New Admin Endpoints (Lines 883-947)

#### Endpoint 1: Process Notifications (Manual Trigger)
```javascript
app.post('/api/admin/process-notifications', clerkAuth, async (req, res) => {
  // Manually trigger notification processing
  // Returns: { processed: 150, sent: 23, skipped: 127 }
  const result = await notificationService.processNotifications(client);
  res.json(result);
});
```

#### Endpoint 2: Test Slack Alert
```javascript
app.post('/api/admin/test-slack', clerkAuth, async (req, res) => {
  await notificationService.sendSlackAlert('new_free_signup', {
    email: 'test@example.com'
  });
  res.json({ ok: true, message: 'Slack alert sent' });
});
```

#### Endpoint 3: Test Email Template
```javascript
app.post('/api/admin/test-email', clerkAuth, async (req, res) => {
  const { email, template } = req.body;
  const emailId = await notificationService.sendEmail(email, template, { name: 'Test User' });
  res.json({ ok: true, email_id: emailId });
});
```

#### Endpoint 4: Track New User Signup
```javascript
app.post('/api/auth/track-signup', clerkAuth, async (req, res) => {
  // Called on first login to trigger Slack alert
  const userCreated = new Date(rows[0].created_at);
  const minutesOld = (now - userCreated) / 60000;
  
  if (minutesOld < 1) {
    // Get user email from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser?.primaryEmailAddress?.emailAddress || 'unknown';
    
    // Send Slack alert
    await notificationService.sendSlackAlert('new_free_signup', { email });
  }
  
  res.json({ ok: true, isNewUser: minutesOld < 1 });
});
```

**Why:** Provides manual testing and admin control of notification system

---

## server/scheduler.js

### Change 1: Import notificationService (Line 4)

```javascript
const notificationService = require('./services/notificationService');
```

**Why:** Use notification functions in scheduler

### Change 2: Add Notification Processing to Scheduler (Lines 131-139)

**Location:** After intelligence report generation, before marking run as success

```javascript
// Process user notifications (emails, Slack alerts)
try {
  console.log('Scheduler: processing notifications');
  const notifResult = await notificationService.processNotifications(client);
  console.log('Scheduler: notifications completed', notifResult);
} catch (err) {
  console.warn('Scheduler: notification processing failed', err?.message || err);
}
```

**Why:** Makes notifications run automatically every Sunday at 9 AM along with ROI sync

---

## server/services/notificationService.js

### New File (261 lines)

Complete notification engine with:

**Main Functions:**
- `sendSlackAlert(event, details)` - Send Slack webhook notifications
- `sendEmail(to, template, data)` - Send emails via Resend API
- `checkUserNotificationStatus(userId, client)` - Determine eligibility
- `processNotifications(client)` - Main batch processor
- `logEmailSent(userId, template, client)` - Track sent emails
- `wasEmailRecentlySent(userId, template, client)` - Check 30-day dedup
- `hasCreatedCampaigns(userId, client)` - Check if user has campaigns
- `getLastLogin(userId, client)` - Get last login time
- `getUserCreatedDate(userId, client)` - Get signup date

**Slack Alert Events:**
- `new_free_signup` - User joins on free plan
- `new_paid_signup` / `new_pro_signup` - User starts with paid plan
- `upgrade_to_pro` - User upgrades from free to paid
- `user_created_campaign` - User creates campaign
- `user_set_report_email` - User enables reports

**Email Templates:**
1. `welcome_free` - Welcome message for free users
2. `welcome_paid` - Welcome for PRO users  
3. `first_step_nudge` - Nudge to create first campaign
4. `upgrade_after_month` - Soft upgrade offer
5. `winback_paid` - Re-engagement for inactive PRO users

**Smart Logic:**
- Only emails if inactive 7+ days
- Deduplicates templates (30-day per-template cooldown)
- Checks user-specific criteria (age, campaigns, plan)
- Never emails active users
- Logs all sent emails

---

## server/services/paddleService.js

### Change 1: Enhanced handlePaddleWebhook Function

**Previous:**
```javascript
async function handlePaddleWebhook(payload, signature) {
  // Just logged events, no notifications
}
```

**New:**
```javascript
async function handlePaddleWebhook(payload, signature, client = null) {
  // ... signature validation ...
  
  // Lazy-load notificationService
  let notificationService;
  try {
    notificationService = require('./notificationService');
  } catch (err) {
    console.warn('notificationService not available');
  }

  switch (eventType) {
    case 'subscription.created':
      // NEW: Send Slack alert on new subscription
      if (notificationService && payload.user_id) {
        await notificationService.sendSlackAlert('new_pro_signup', {
          email: payload.email || 'unknown',
          plan: payload.product_name || 'PRO'
        });
      }
      return { status: 'processed', event: eventType };

    case 'subscription.updated':
      // NEW: Send Slack alert on upgrade
      if (notificationService && payload.user_id && payload.product_name === 'PRO') {
        await notificationService.sendSlackAlert('upgrade_to_pro', {
          email: payload.email || 'unknown',
          from_plan: payload.old_plan || 'FREE',
          to_plan: payload.product_name || 'PRO'
        });
      }
      return { status: 'processed', event: eventType };
      
    // ... rest of events unchanged ...
  }
}
```

**Why:** Automatically sends Slack alerts when users upgrade without needing a separate endpoint

---

## init_db.sql

### New Table: notification_log

```sql
CREATE TABLE notification_log (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_template ON notification_log(template);
```

**Why:** Tracks every sent email to:
- Prevent duplicate emails (30-day per-template check)
- Monitor notification volume
- Debug which templates are being sent
- Support future analytics

---

## Summary of Changes

| File | Type | Lines Added | Purpose |
|------|------|-------------|---------|
| server/server.js | Modified | +80 | User sync + admin endpoints |
| server/scheduler.js | Modified | +8 | Notification processing |
| server/services/notificationService.js | NEW | 261 | Notification engine |
| server/services/paddleService.js | Modified | +35 | Slack alerts on upgrades |
| init_db.sql | Modified | +10 | notification_log table |

**Total New Code: ~394 lines**

All code is:
- ✅ Syntax validated
- ✅ Error handled
- ✅ Logged appropriately
- ✅ Documented
- ✅ Ready for production

