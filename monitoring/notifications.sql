-- Notification System Monitoring Queries
-- Run these regularly to monitor notification health

-- 1. System Overview
-- See overall health of notification system and user base
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at > now() - interval '7 days' THEN 1 END) as new_users_7d,
  COUNT(CASE WHEN last_login > now() - interval '7 days' THEN 1 END) as active_users_7d,
  COUNT(CASE WHEN last_login < now() - interval '7 days' THEN 1 END) as inactive_users_7d,
  COUNT(CASE WHEN last_login < now() - interval '30 days' THEN 1 END) as inactive_users_30d,
  COUNT(CASE WHEN subscription ->> 'plan' = 'PRO' THEN 1 END) as pro_users,
  (SELECT COUNT(*) FROM notification_log) as total_emails_sent,
  (SELECT COUNT(DISTINCT user_id) FROM notification_log) as users_who_got_emails
FROM users;

-- 2. Recent Email Activity
-- See what emails were sent recently
SELECT 
  u.email, 
  nl.template, 
  nl.sent_at,
  EXTRACT(EPOCH FROM (now() - nl.sent_at)) / 3600 as hours_ago
FROM notification_log nl
JOIN users u ON nl.user_id = u.id
ORDER BY nl.sent_at DESC
LIMIT 50;

-- 3. Email Send Rate by Template
-- See distribution of email templates
SELECT 
  template,
  COUNT(*) as sent_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(sent_at) as last_sent,
  MIN(sent_at) as first_sent
FROM notification_log
GROUP BY template
ORDER BY sent_count DESC;

-- 4. Users Eligible for Emails
-- See which users are eligible for notifications (inactive 7+ days)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_login,
  EXTRACT(DAY FROM (now() - u.last_login)) as days_inactive,
  EXTRACT(DAY FROM (now() - u.created_at)) as days_old,
  COALESCE(u.subscription ->> 'plan', 'FREE') as plan,
  (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaigns_created,
  (SELECT COUNT(*) FROM notification_log WHERE user_id = u.id) as emails_received
FROM users u
WHERE u.last_login < now() - interval '7 days'
ORDER BY u.last_login ASC;

-- 5. Duplicate Email Check
-- Ensure 30-day dedup is working
SELECT 
  template,
  user_id,
  COUNT(*) as send_count,
  MAX(sent_at) as latest,
  MIN(sent_at) as earliest,
  EXTRACT(EPOCH FROM (MAX(sent_at) - MIN(sent_at))) / 86400 as days_between
FROM notification_log
GROUP BY template, user_id
HAVING COUNT(*) > 1
ORDER BY send_count DESC;

-- 6. New Users (First 24 Hours)
-- Monitor new signups for Slack alert verification
SELECT 
  id,
  email,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) / 3600 as hours_old,
  last_login,
  COALESCE(subscription ->> 'plan', 'FREE') as plan
FROM users
WHERE created_at > now() - interval '1 day'
ORDER BY created_at DESC;

-- 7. Inactive PRO Users (Winback Candidates)
-- See who should get winback emails
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_login,
  EXTRACT(DAY FROM (now() - u.last_login)) as days_inactive,
  (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaigns
FROM users u
WHERE u.subscription ->> 'plan' = 'PRO'
  AND u.last_login < now() - interval '60 days'
ORDER BY u.last_login ASC;

-- 8. Email Sending Trends (Daily)
-- See email volume over time
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT template) as templates_used
FROM notification_log
WHERE sent_at > now() - interval '30 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- 9. User Lifecycle Status
-- Categorize all users by engagement stage
SELECT 
  CASE 
    WHEN created_at > now() - interval '1 day' THEN '🆕 New (< 1 day)'
    WHEN created_at > now() - interval '7 days' AND last_login > now() - interval '7 days' THEN '🔥 Active (< 7 days)'
    WHEN created_at > now() - interval '7 days' AND last_login < now() - interval '7 days' THEN '⚠️  New but inactive'
    WHEN created_at > now() - interval '30 days' AND last_login < now() - interval '7 days' THEN '😴 Early inactive'
    WHEN created_at > now() - interval '60 days' AND last_login < now() - interval '30 days' THEN '📉 Long inactive'
    ELSE '❌ Very inactive (60+d)'
  END as status,
  COUNT(*) as user_count,
  COUNT(CASE WHEN subscription ->> 'plan' = 'PRO' THEN 1 END) as pro_users,
  COUNT(CASE WHEN subscription ->> 'plan' = 'FREE' THEN 1 END) as free_users
FROM users
GROUP BY status
ORDER BY user_count DESC;

-- 10. Most Recent Activity Log
-- Quick view of what happened in system
SELECT 
  'NOTIFICATION' as event_type,
  u.email as user_email,
  nl.template as details,
  nl.sent_at as timestamp
FROM notification_log nl
JOIN users u ON nl.user_id = u.id
WHERE nl.sent_at > now() - interval '24 hours'

UNION ALL

SELECT 
  'SIGNUP' as event_type,
  email as user_email,
  COALESCE(subscription ->> 'plan', 'FREE') as details,
  created_at as timestamp
FROM users
WHERE created_at > now() - interval '24 hours'

ORDER BY timestamp DESC
LIMIT 50;
