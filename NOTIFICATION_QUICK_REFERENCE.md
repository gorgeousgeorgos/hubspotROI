# 📌 Notification System - Quick Reference Card

Print this or keep it open while deploying!

---

## 🚀 3-Step Deployment

### Step 1: Add Environment Variables (2 min)
```
Go to Replit Secrets → Add:

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/URL
RESEND_API_KEY=re_your_api_key_here
```

### Step 2: Run Database Migration (1 min)
```bash
psql $DATABASE_URL < init_db.sql
```

### Step 3: Test (2 min)
```bash
curl -X POST http://localhost:4000/api/admin/test-slack \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Slack message appears ✅

---

## 🧪 Test Commands

### Test Slack Alert
```bash
curl -X POST http://localhost:4000/api/admin/test-slack \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

### Test Email Template
```bash
curl -X POST http://localhost:4000/api/admin/test-email \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "template": "welcome_free"
  }'
```

Available templates: welcome_free, welcome_paid, first_step_nudge, upgrade_after_month, winback_paid

### Manually Trigger Notifications
```bash
curl -X POST http://localhost:4000/api/admin/process-notifications \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## 🔍 Monitoring Queries

### Recent Emails Sent
```sql
SELECT u.email, nl.template, nl.sent_at 
FROM notification_log nl
JOIN users u ON nl.user_id = u.id
ORDER BY nl.sent_at DESC LIMIT 10;
```

### Inactive Users
```sql
SELECT email, last_login,
       EXTRACT(DAY FROM (now() - last_login)) as days_inactive
FROM users
WHERE last_login < now() - interval '7 days'
ORDER BY last_login DESC;
```

### User Activity
```sql
SELECT email, created_at, last_login,
       EXTRACT(DAY FROM (now() - created_at)) as days_old
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📋 What Gets Notifications

### Slack Alerts (Real-Time)
```
Event                    Trigger                When
─────────────────────────────────────────────────────
New Free Signup          First login            Instant
New PRO Signup           Paddle webhook         Instant
Free → PRO Upgrade       Paddle webhook         Instant
```

### Email Campaigns (Weekly)
```
Template                 Sent To                Frequency
─────────────────────────────────────────────────────────
welcome_free             Day 1, free user       Once
welcome_paid             Day 1, PRO user        Once
first_step_nudge         3-10 days old          Once per 30 days
upgrade_after_month      30+ days old, free     Once per 30 days
winback_paid             60+ days inactive      Once per 30 days
```

### Smart Rules
```
✅ Only email if inactive 7+ days
✅ Max 1 email per template per user per 30 days
✅ Check created_at, last_login, campaigns, plan
✅ Active users NEVER get emailed
```

---

## 🔑 Environment Variables

### Required
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
RESEND_API_KEY=re_your_api_key_here
```

### Optional
```env
RESEND_FROM_EMAIL=noreply@foundry.io
SCHEDULER_TZ=America/New_York
```

---

## 📚 Documentation Quick Links

| Need | File | Time |
|------|------|------|
| Quick setup | [NOTIFICATION_QUICKSTART.md](NOTIFICATION_QUICKSTART.md) | 5 min |
| All the details | [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md) | 20 min |
| Deploy steps | [NOTIFICATION_DEPLOYMENT_CHECKLIST.md](NOTIFICATION_DEPLOYMENT_CHECKLIST.md) | 30 min |
| How it works | [NOTIFICATION_IMPLEMENTATION_SUMMARY.md](NOTIFICATION_IMPLEMENTATION_SUMMARY.md) | 45 min |
| Diagrams | [NOTIFICATION_ARCHITECTURE_DIAGRAM.md](NOTIFICATION_ARCHITECTURE_DIAGRAM.md) | 15 min |
| Code changes | [CODE_CHANGES_REFERENCE.md](CODE_CHANGES_REFERENCE.md) | 30 min |
| Navigation | [NOTIFICATION_INDEX.md](NOTIFICATION_INDEX.md) | 5 min |

---

## 🐛 Troubleshooting

### Problem: No Slack Message
```
1. Check: Is SLACK_WEBHOOK_URL set?
   Go to Replit Secrets → verify it's there
2. Restart: Server needs restart after adding secrets
3. Test: Run test-slack endpoint again
4. Verify: Webhook URL starts with https://hooks.slack.com
```

### Problem: No Email Received
```
1. Check: Is RESEND_API_KEY set?
   Go to Replit Secrets → verify it's there
2. Check: Is email valid? (not example@example.com)
3. Test: Run test-email endpoint with valid email
4. Check: Resend dashboard for delivery status
```

### Problem: Duplicate Emails
```
1. Check: notification_log table
   SELECT COUNT(*) FROM notification_log;
2. Verify: 30-day dedup is working
   SELECT * FROM notification_log WHERE sent_at > now() - interval '1 day';
3. Debug: Check server logs for warnings
```

### Problem: Scheduler Not Running
```
1. Check: Server logs for "Scheduler: scheduling"
2. Verify: Sunday 9 AM UTC (or configured SCHEDULER_TZ)
3. Check: /api/scheduler/run endpoint works
4. Manual: Trigger with /api/admin/process-notifications
```

---

## 📊 Success Checklist

- [ ] SLACK_WEBHOOK_URL added
- [ ] RESEND_API_KEY added
- [ ] Server restarted
- [ ] Database migration run
- [ ] Test Slack alert works
- [ ] Test email arrives
- [ ] notification_log has entries
- [ ] No errors in logs
- [ ] Scheduler shows notification processing
- [ ] Ready to monitor

---

## 💡 Pro Tips

### Monitor in Real Time
```bash
# Watch for new emails sent
watch 'psql $DATABASE_URL -c "SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 5;"'
```

### Debug User Eligibility
In server console:
```javascript
const userId = 'user-id-here';
const client = await pool.connect();
const status = await notificationService.checkUserNotificationStatus(userId, client);
console.log(status); // Shows which emails are eligible
client.release();
```

### Test All Templates
```bash
for template in welcome_free welcome_paid first_step_nudge upgrade_after_month winback_paid; do
  curl -X POST http://localhost:4000/api/admin/test-email \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"you@example.com\",\"template\":\"$template\"}"
  echo "Sent: $template"
done
```

---

## 🎯 What to Expect

### Day 1
- ✅ Real signup shows in Slack
- ✅ Test emails arrive
- ✅ System is live

### Week 1
- 📊 Monitor Slack alerts
- 📧 Verify email delivery
- ✅ Check notification_log

### Month 1
- 📈 Track conversion rates
- 💬 Adjust email templates
- 🎯 Optimize send times

---

## 📞 Need Help?

**Email not sending?**
→ Check [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md#troubleshooting)

**Slack not working?**
→ Check [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md#troubleshooting)

**How does it work?**
→ Read [NOTIFICATION_IMPLEMENTATION_SUMMARY.md](NOTIFICATION_IMPLEMENTATION_SUMMARY.md)

**Lost?**
→ Check [NOTIFICATION_INDEX.md](NOTIFICATION_INDEX.md) for navigation

---

## 🚀 You're Ready!

Everything is set up. Just:
1. Add 2 environment variables
2. Run migration
3. Test
4. Deploy!

**Status: Production Ready ✅**

