# Notification System - Visual Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FOUNDRY APPLICATION                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌──────────────┐ ┌─────────┐ ┌──────────────┐
            │  User Signup │ │ Upgrade │ │  Campaign    │
            │   (Clerk)    │ │ (Paddle)│ │   Created    │
            └──────────────┘ └─────────┘ └──────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │  Trigger Notification   │
                    │   (Real-time)           │
                    └─────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
        │ send Slack   │   │ send Email   │   │  Log Event    │
        │ Alert        │   │ (if eligible)│   │ (tracking)    │
        │ (immediate)  │   │ (weekly)     │   │ (audit)       │
        └──────────────┘   └──────────────┘   └───────────────┘
                │                 │
                ▼                 ▼
         ┌────────────┐    ┌──────────────┐
         │ SLACK API  │    │ RESEND API   │
         └────────────┘    └──────────────┘
                │                 │
                ▼                 ▼
         ┌────────────┐    ┌──────────────┐
         │  Your      │    │  User Email  │
         │  Slack     │    │  Inbox       │
         │  Channel   │    │              │
         └────────────┘    └──────────────┘
```

## Event Flow Diagram

### Real-Time Path (Slack Alerts)

```
User Event
    │
    ▼
clerkAuth Middleware (every request)
├─ Verify token
├─ Create/sync user in DB
└─ Update last_login timestamp
    │
    ▼
Special Event Handler
├─ /api/auth/track-signup (new user)
├─ /api/billing/webhook (Paddle upgrade)
└─ [Future: campaign creation, etc]
    │
    ▼
sendSlackAlert()
├─ Get SLACK_WEBHOOK_URL from env
├─ Format message with event type
├─ POST to Slack webhook
└─ Log result
    │
    ▼
Your Slack Channel
(Message appears immediately!)
```

### Scheduled Path (Email Campaigns)

```
Every Sunday 9:00 AM UTC
    │
    ▼
scheduler.start() triggers
    │
    ▼
notificationService.processNotifications()
    │
    ├─ Get all users from database
    │
    └─ For each user:
       │
       └─ checkUserNotificationStatus(userId)
          │
          ├─ Get user created_at (age)
          ├─ Get user last_login (inactive days)
          ├─ Count user campaigns
          ├─ Check subscription plan
          │
          └─ Determine eligibility:
             │
             ├─ Days old? (must be 1, 30, or 60+)
             ├─ Inactive? (must be 7+ days)
             ├─ Template criteria? (campaigns, plan, etc)
             └─ Not already sent? (check 30-day cooldown)
                │
                ▼
             Build email list
                │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 welcome_free  first_step_nudge  upgrade_offer  winback_pro
    │          │          │          │
    └──────────┼──────────┼──────────┘
               │
               ▼
        sendEmail() for each
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    RESEND API  notification_log
               │             │
               ▼             ▼
          User Inbox    Track Dedup
```

## Data Flow Diagram

```
┌──────────────────────────────────────┐
│         POSTGRESQL DATABASE          │
├──────────────────────────────────────┤
│                                      │
│  users                               │
│  ├─ id (Clerk ID)                   │
│  ├─ created_at                      │
│  ├─ last_login ← UPDATED BY EVERY REQUEST
│  └─ ...                             │
│                                      │
│  settings                            │
│  ├─ user_id                         │
│  ├─ subscription.plan (FREE/PRO)    │
│  └─ ...                             │
│                                      │
│  campaigns                           │
│  ├─ user_id                         │
│  ├─ name                            │
│  └─ ...                             │
│                                      │
│  notification_log ← NEW TABLE        │
│  ├─ user_id                         │
│  ├─ template                        │
│  ├─ sent_at                         │
│  └─ (prevents duplicates)           │
│                                      │
└──────────────────────────────────────┘
         ↑         ↑         ↑
    Read │    Write│   Dedup │
         │         │         │
    ┌────┴─────────┴─────────┴────┐
    │  notificationService.js      │
    ├──────────────────────────────┤
    │ Functions:                   │
    │ • sendSlackAlert()           │
    │ • sendEmail()                │
    │ • checkUserNotificationStatus│
    │ • processNotifications()     │
    │ • logEmailSent()             │
    │ • wasEmailRecentlySent()     │
    │ • getLastLogin()             │
    │ • hasCreatedCampaigns()      │
    │ • getUserCreatedDate()       │
    └──────────────────────────────┘
```

## API Endpoint Map

```
┌─────────────────────────────────────────────────┐
│        NOTIFICATION SYSTEM ENDPOINTS            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Authenticated Endpoints (clerkAuth):           │
│  ├─ POST /api/auth/track-signup                │
│  │  ├─ Purpose: Track first login              │
│  │  ├─ Trigger: Send Slack alert               │
│  │  └─ Used by: Frontend on first login        │
│  │                                             │
│  ├─ POST /api/admin/process-notifications      │
│  │  ├─ Purpose: Manually run notification      │
│  │  ├─ Trigger: Check all users & send emails  │
│  │  └─ Used by: Admins for testing/override    │
│  │                                             │
│  ├─ POST /api/admin/test-slack                 │
│  │  ├─ Purpose: Test Slack webhook             │
│  │  ├─ Trigger: Post test alert to channel     │
│  │  └─ Used by: Admins for setup validation    │
│  │                                             │
│  └─ POST /api/admin/test-email                 │
│     ├─ Purpose: Test email template            │
│     ├─ Trigger: Send test email via Resend     │
│     └─ Used by: Admins for template testing    │
│                                                 │
│  Webhook Endpoints (public, Paddle webhook):    │
│  └─ POST /api/billing/webhook                  │
│     ├─ Purpose: Handle Paddle events           │
│     ├─ Trigger: Send Slack alert on upgrade    │
│     └─ Used by: Paddle to notify of changes    │
│                                                 │
│  Scheduler Endpoints (internal, token auth):    │
│  └─ GET /api/scheduler/run                     │
│     ├─ Includes notification processing        │
│     └─ Runs automatically via cron             │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Email Template Decision Tree

```
User needs email?
│
├─ Is user inactive 7+ days?
│  └─ NO → Skip (user is active, don't email)
│
└─ YES → Check eligibility for each template:

    ┌─ welcome_free?
    │  ├─ created_at = today?
    │  ├─ subscription.plan = FREE?
    │  └─ NOT already sent in 30 days?
    │  → Send if all YES
    │
    ├─ welcome_paid?
    │  ├─ created_at = today?
    │  ├─ subscription.plan = PRO?
    │  └─ NOT already sent in 30 days?
    │  → Send if all YES
    │
    ├─ first_step_nudge?
    │  ├─ 3 < days_old < 10?
    │  ├─ campaigns.count = 0?
    │  └─ NOT already sent in 30 days?
    │  → Send if all YES
    │
    ├─ upgrade_after_month?
    │  ├─ days_old >= 30?
    │  ├─ subscription.plan = FREE?
    │  ├─ campaigns.count = 0?
    │  └─ NOT already sent in 30 days?
    │  → Send if all YES
    │
    └─ winback_paid?
       ├─ days_since_login >= 60?
       ├─ subscription.plan = PRO?
       └─ NOT already sent in 30 days?
       → Send if all YES

Result:
└─ Send all eligible emails
└─ Log each in notification_log
└─ No duplicates (30-day check)
```

## Deployment Architecture

```
┌──────────────────────────────────────────┐
│           REPLIT SERVER                  │
├──────────────────────────────────────────┤
│                                          │
│  Express.js Application                  │
│  ├─ server.js (with notification endpoints)
│  ├─ scheduler.js (runs Sunday 9 AM)      │
│  └─ services/                            │
│     ├─ notificationService.js (NEW)      │
│     ├─ paddleService.js (enhanced)       │
│     └─ other services...                 │
│                                          │
└─────────────┬──────────────────────────────┘
              │ CONNECTIONS
    ┌─────────┼─────────┬──────────────┐
    ▼         ▼         ▼              ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│Database│ │Slack   │ │Resend    │ │Paddle    │
│(Supabase)│ │Webhooks│ │API       │ │Webhooks  │
│ ├─users   │ │        │ ├─emails  │ │          │
│ ├─settings│ │        │ └─tracking│ │          │
│ ├─campaigns
│         │         │                │          │
│ └─notification_log
│         │         │                │          │
└────────┘ └────────┘ └──────────────┘ └──────────┘
    │         │         │              │
    └─────────┴─────────┴──────────────┘
              │
              ▼
    ┌──────────────────────┐
    │  USER NOTIFICATIONS  │
    ├──────────────────────┤
    │ • Slack Alerts       │
    │ • Email Campaigns    │
    │ • Activity Tracking  │
    └──────────────────────┘
```

## Security & Access Control

```
┌─────────────────────────────────────────────┐
│      AUTHENTICATION & AUTHORIZATION         │
├─────────────────────────────────────────────┤
│                                             │
│  Public Endpoints (no auth):                │
│  └─ POST /api/billing/webhook               │
│     └─ Protected by Paddle signature        │
│                                             │
│  Authenticated (Clerk token required):      │
│  ├─ POST /api/auth/track-signup             │
│  ├─ POST /api/admin/test-slack              │
│  ├─ POST /api/admin/test-email              │
│  └─ POST /api/admin/process-notifications   │
│                                             │
│  Server-Only (scheduler):                   │
│  └─ Runs every Sunday at 9 AM               │
│     └─ Protected by cron schedule           │
│                                             │
│  Environment Variables (secrets):           │
│  ├─ SLACK_WEBHOOK_URL (secret)              │
│  ├─ RESEND_API_KEY (secret)                 │
│  └─ SCHEDULER_TOKEN (optional)              │
│                                             │
│  Database Security:                         │
│  ├─ Parameterized queries (SQL injection)   │
│  ├─ User ID constraints (row-level)         │
│  ├─ Foreign keys (referential integrity)    │
│  └─ Indexes (performance)                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Key Integration Points

### User Lifecycle

```
New User
    │
    ├─ Signs up with Clerk
    ├─ First login request
    │
    ▼
clerkAuth Middleware
    ├─ Verify token
    ├─ INSERT users row (if not exists)
    ├─ Update last_login = now()
    │
    └─ next()
        │
        ├─ Frontend calls /api/auth/track-signup
        │
        ▼
        sendSlackAlert('new_free_signup')
        │
        ▼
    Your Slack: "🎉 New Free Signup - user@example.com"
    │
    └─ Wait until Sunday 9 AM
        │
        ▼
    Scheduler runs processNotifications()
        │
        ▼
    Send welcome_free email to user
```

### Upgrade Journey

```
User Clicks "Upgrade"
    │
    ▼
Paddle Payment
    │
    ▼
Paddle sends webhook to /api/billing/webhook
    │
    ▼
paddleService.handlePaddleWebhook()
    │
    ├─ Detect subscription.updated event
    ├─ Check: old_plan = FREE, new_plan = PRO
    │
    ▼
sendSlackAlert('upgrade_to_pro', {...})
    │
    ▼
Your Slack: "📈 User Upgraded to PRO! user@example.com"
    │
    └─ Next Sunday 9 AM
        │
        ▼
    Scheduler runs
        │
        ├─ User now has subscription.plan = 'PRO'
        ├─ BUT same email won't send (wrong plan)
        │
        └─ No welcome_paid (not day 1 anymore)
```

---

This architecture ensures:
✅ Real-time alerts without delay
✅ Scheduled emails don't run multiple times
✅ User data is safe
✅ All events are logged
✅ System is extensible for future notifications

