# Replit Deployment Guide

Your code has been pushed to GitHub and is ready for Replit!

## Quick Start (5 minutes)

### 1. Create/Update Replit Project
- Open Replit: https://replit.com
- Create new project from GitHub repo `gorgeousgeorgos/hubspotROI`
- Or if you have existing project, pull latest code

### 2. Add Environment Secrets
Go to Replit **Secrets** (lock icon on left sidebar):

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=george@marketing.upfixe.com
SCHEDULER_TZ=GMT
DATABASE_URL=your_supabase_connection_string
CLERK_SECRET_KEY=your_clerk_secret
```

### 3. Run Deployment Script
In Replit terminal:
```bash
# Navigate to project root
cd ~/hubspotROI

# Run deployment script
bash scripts/deploy-notifications.sh
```

This will:
- ✅ Validate all environment variables
- ✅ Run database migration (init_db.sql)
- ✅ Test Slack webhook connectivity
- ✅ Verify notification_log table exists
- ✅ Show deployment status

### 4. Start the Server
```bash
npm run build
npm start
```

### 5. Verify Deployment
```bash
# Check health endpoint
curl https://your-replit-url.replit.dev/api/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "2026-01-15T...",
#   "services": {
#     "slack": true,
#     "resend": true,
#     "database": true,
#     "scheduler": true
#   }
# }
```

---

## What Changed in This Deploy

✅ **Production Hardening Added:**
- Health check endpoint (`/api/health`)
- Rate limiting on admin endpoints (10 req/min)
- Monitoring SQL queries (10 comprehensive)
- Deployment automation script
- Security checklist and API docs
- Environment variables template

✅ **Files Changed:**
- `server/server.js` - Added health check + rate limiting
- `.env.example` - Added notification variables
- `server/services/notificationService.js` - Complete notification engine
- `server/scheduler.js` - Weekly notification processing
- `init_db.sql` - Database schema with notification_log table

✅ **New Files:**
- `scripts/deploy-notifications.sh` - Deployment automation
- `monitoring/notifications.sql` - 10 SQL monitoring queries
- `SECURITY_CHECKLIST.md` - Production security review
- `API_REFERENCE.md` - Complete API documentation
- `STAGE_3_PRODUCTION_HARDENING.md` - Hardening details

---

## How Notifications Work

### Signup Flow
1. User signs up → API calls `POST /api/track-signup`
2. User stored in database
3. Slack alert sent to your channel: "🎉 New signup: User Name"
4. Email sent with welcome message
5. Entry logged in notification_log

### Weekly Scheduler (Sundays 9 AM GMT)
1. Runs automatically on schedule
2. Finds inactive users (7+ days)
3. Sends "re-engagement" email
4. Finds recent upgrades → sends "thanks" email
5. All logged in notification_log

### Rate Limiting
- Admin test endpoints limited to 10 requests/minute
- Returns 429 "Too many requests" after limit exceeded
- Prevents accidental spam testing

---

## Testing in Replit

### Test Slack Alert
```bash
curl -X POST https://your-replit-url.replit.dev/api/admin/test-slack \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel": "testing"}'
```

### Test Email
```bash
curl -X POST https://your-replit-url.replit.dev/api/admin/test-email \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "george@marketing.upfixe.com",
    "template": "welcome_free"
  }'
```

### Monitor Notifications
```bash
# View recent notifications sent
psql $DATABASE_URL -c "SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 20;"
```

---

## Monitoring Dashboard

### Health Check
Endpoint: `GET /api/health`
- Public endpoint (no auth)
- Returns service status
- Use for uptime monitoring

### Notification Activity
File: `monitoring/notifications.sql`
Contains 10 queries:
1. System overview
2. Recent activity
3. Send rate by template
4. Users eligible for emails
5. Duplicate check
6. New users (24h)
7. Inactive PRO users
8. Daily trends
9. Lifecycle status
10. Activity log (24h)

Run weekly:
```bash
psql $DATABASE_URL < monitoring/notifications.sql
```

---

## Troubleshooting

### "SLACK_WEBHOOK_URL not set" Error
```bash
# In Replit Secrets, add:
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Then restart Replit
```

### "Resend API key invalid" Error
```bash
# Check API key in Replit Secrets
# Make sure it starts with "re_"

# Test with:
curl -X POST https://your-replit-url.replit.dev/api/admin/test-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### "notification_log table doesn't exist" Error
```bash
# Run deployment script:
bash scripts/deploy-notifications.sh

# Or manually run migration:
psql $DATABASE_URL < init_db.sql
```

### Rate Limiting (429 Error)
```bash
# Normal behavior after 10 requests/min to admin endpoints
# Wait 1 minute and retry

# Check current rate limiting:
curl -i https://your-replit-url.replit.dev/api/health
# Headers show: RateLimit-Limit, RateLimit-Remaining
```

---

## Next Steps

1. ✅ Verify all endpoints working
2. ✅ Test Slack alerts appear
3. ✅ Test emails arrive in inbox
4. ✅ Monitor notification_log grows
5. ✅ Set up weekly monitoring checks

---

## Support

For detailed docs, see:
- [STAGE_3_PRODUCTION_HARDENING.md](STAGE_3_PRODUCTION_HARDENING.md)
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
- [API_REFERENCE.md](API_REFERENCE.md)
- [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md)

---

**Deployment Status: READY FOR REPLIT** ✅

All code is on GitHub, documentation is complete, and your credentials are secured in Replit Secrets.
