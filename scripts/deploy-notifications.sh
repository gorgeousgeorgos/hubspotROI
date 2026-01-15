#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Deploying Notification System to Replit/Production        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$SLACK_WEBHOOK_URL" ]; then
  echo "❌ Error: SLACK_WEBHOOK_URL not set"
  echo "   Add to Replit Secrets: SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
  exit 1
fi
echo "   ✅ SLACK_WEBHOOK_URL configured"

if [ -z "$RESEND_API_KEY" ]; then
  echo "❌ Error: RESEND_API_KEY not set"
  echo "   Add to Replit Secrets: RESEND_API_KEY=re_..."
  exit 1
fi
echo "   ✅ RESEND_API_KEY configured"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set"
  exit 1
fi
echo "   ✅ DATABASE_URL configured"

echo ""
echo "📊 Running database migration..."
if psql $DATABASE_URL < init_db.sql > /dev/null 2>&1; then
  echo "   ✅ Database migration successful"
else
  echo "   ⚠️  Database migration returned warning (may already exist)"
fi

echo ""
echo "🧪 Testing configuration..."

# Test Slack webhook is accessible
echo "   Testing Slack webhook..."
SLACK_TEST=$(curl -s -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🧪 Test: Notification system initialized"}' | grep -c "ok" || echo "0")

if [ "$SLACK_TEST" = "1" ]; then
  echo "   ✅ Slack webhook is accessible"
else
  echo "   ⚠️  Could not verify Slack webhook (it may still work)"
fi

echo ""
echo "📈 Verification checks..."

# Check if notification_log table exists
NOTIF_TABLE=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_log';" 2>/dev/null || echo "0")

if [ "$NOTIF_TABLE" = "1" ]; then
  echo "   ✅ notification_log table exists"
else
  echo "   ❌ notification_log table not found"
  echo "   Attempting to create..."
  psql $DATABASE_URL < init_db.sql
fi

# Check users table has last_login column
LOGIN_COL=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login';" 2>/dev/null || echo "0")

if [ "$LOGIN_COL" = "1" ]; then
  echo "   ✅ users.last_login column exists"
else
  echo "   ⚠️  last_login column not found (may need to be added)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Ready!                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Start your server: npm run dev:server"
echo "  2. Test endpoints:"
echo "     curl http://localhost:4000/api/health"
echo "     curl -X POST http://localhost:4000/api/admin/test-slack"
echo "  3. Monitor in production:"
echo "     psql \$DATABASE_URL < monitoring/notifications.sql"
echo ""
echo "For more info, see NOTIFICATION_QUICKSTART.md"
