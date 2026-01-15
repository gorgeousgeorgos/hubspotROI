# Final Verification Checklist

Complete this checklist before deploying to Replit to ensure everything works.

---

## ✅ Code Compilation

- [x] No TypeScript errors in `components/AccountSettings.tsx`
- [x] No JavaScript errors in `server/server.js`
- [x] No errors in `services/storageService.ts`
- [x] No errors in `server/services/geminiService.js`
- [x] Init database script is valid SQL

---

## 🔐 Environment Setup (Do This First)

Before testing, ensure these are in your `.env.local`:

```bash
# Copy this into your .env.local file
GEMINI_API_KEY=your_gemini_key_here
CLERK_SECRET_KEY=sk_test_... or sk_live_...
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DATABASE_URL=postgresql://user:password@localhost:5432/hubspot_roi
SCHEDULER_TOKEN=your-secure-random-token
API_BASE_URL=http://localhost:4000
```

---

## 🗄️ Database Setup

Run this before starting the server:

```bash
# From project root
psql $DATABASE_URL < init_db.sql
```

**What this does:**
- Creates all tables (users, campaigns, stats, assets, deals, settings, intel_reports, scheduler_runs)
- Adds asset_ids column to campaigns
- Sets up indexes for performance
- Creates views for reporting

**Verify tables were created:**
```bash
psql $DATABASE_URL -c "\dt"
```

Should show: campaigns, stats, assets, deals, settings, users, customers, intel_reports, scheduler_runs

---

## 🚀 Local Testing Steps

### 1. Start the Backend Server
```bash
cd server
npm install
npm start
```

Expected output: `Server listening on port 4000`

### 2. Test Health Endpoint
```bash
curl http://localhost:4000/api/health
```

Expected response: `{"ok":true}`

### 3. Test Settings Endpoints
```bash
# GET settings (with fake user ID for local testing)
curl -H "x-user-id: test-user-123" \
  http://localhost:4000/api/settings

# PATCH settings
curl -X PATCH \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"report_email":"test@example.com"}' \
  http://localhost:4000/api/settings
```

### 4. Test Scheduler Endpoint
```bash
curl "http://localhost:4000/api/scheduler/run?token=test-token"
```

Expected response: `{"ok":true,"message":"Scheduler run completed successfully"}`

### 5. Test Campaign Endpoints
```bash
# Create a campaign
curl -X POST \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","utm_source":"google","utm_medium":"cpc","utm_campaign":"summer2026","destination_url":"https://example.com"}' \
  http://localhost:4000/api/campaigns

# Get campaigns
curl -H "x-user-id: test-user-123" \
  http://localhost:4000/api/campaigns

# (Note the campaign ID from the response)

# Update campaign with assets
curl -X PUT \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"asset_ids":["asset1","asset2"],"target_roi":2.5}' \
  http://localhost:4000/api/campaigns/CAMPAIGN_ID_HERE

# Export CSV
curl -H "x-user-id: test-user-123" \
  http://localhost:4000/api/campaigns/export/csv
```

### 6. Test Asset Endpoints
```bash
# Create asset
curl -X POST \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"name":"LinkedIn Banner","type":"BANNER","cost_amount":500,"cost_type":"ONE_OFF"}' \
  http://localhost:4000/api/assets

# Get assets
curl -H "x-user-id: test-user-123" \
  http://localhost:4000/api/assets
```

### 7. Start Frontend (in another terminal)
```bash
cd ..  # back to root
npm install
npm run dev
```

Expected output: `VITE ... ready in ... ms`

Visit: `http://localhost:5173`

### 8. Test AccountSettings OAuth UI
- Go to Settings → Bridges tab
- Click "Bridge Connector" for HubSpot
- (Note: May error in local dev without real OAuth setup, but endpoint should be reachable)
- Check Network tab in DevTools to verify API calls

### 9. Test Campaign UI Delete Button
- Go to Link Registry
- Create a test campaign
- Click the trash icon
- Confirm deletion dialog
- Should disappear from list

---

## 🔍 Code Review Checklist

Go through these files to verify everything looks good:

### `server/server.js`
- [ ] Line 150-200: OAuth URL endpoints exist
- [ ] Line 200-280: OAuth callback endpoints exist
- [ ] Line 400-500: Settings PATCH endpoint exists
- [ ] Line 370-390: Settings GET endpoint exists
- [ ] Line 500-550: Campaign PUT/DELETE endpoints exist
- [ ] Line 550-650: Asset CRUD endpoints exist
- [ ] Line 650-700: Scheduler GET endpoint exists
- [ ] Line 700-750: CSV export endpoint exists

### `server/services/geminiService.js`
- [ ] Uses `@google/generative-ai` package (not @google/genai)
- [ ] Uses `gemini-2.0-pro-exp-02-05` model
- [ ] Has proper error handling with try/catch
- [ ] Response schema matches types.ts IntelligenceReport interface

### `server/services/hubspotService.js`
- [ ] `exchangeHubSpotAuthCode()` function exists
- [ ] Proper OAuth token exchange logic
- [ ] Stores refresh_token
- [ ] Module exports include new function

### `server/services/ga4Service.js`
- [ ] `exchangeGa4AuthCode()` function exists
- [ ] `refreshGa4Token()` function exists
- [ ] Proper Google OAuth logic
- [ ] Module exports include new functions

### `components/AccountSettings.tsx`
- [ ] `handleConnect()` calls `/api/integrations/{hubspot|ga4}/auth-url`
- [ ] `saveSettings()` function exists
- [ ] Save button/status indicator present
- [ ] Connection card UI updated

### `components/Campaigns.tsx`
- [ ] `deleteCampaign()` function exists
- [ ] Delete button (trash icon) in campaign card
- [ ] Confirmation dialog before delete
- [ ] Calls `DELETE /api/campaigns/:id`

### `services/storageService.ts`
- [ ] `saveCampaign()` function exists
- [ ] `updateCampaignAssets()` function exists
- [ ] `saveStat()` validates ad_spend >= 0
- [ ] Type safety maintained

### `init_db.sql`
- [ ] campaigns table has `asset_ids TEXT[] DEFAULT '{}'` column
- [ ] campaigns table has `destination_url TEXT` column
- [ ] campaigns table has `updated_at timestamptz DEFAULT now()` column
- [ ] All other tables/views/indexes present

---

## 🔧 Common Issues & Fixes

### Issue: "Cannot find type definition file for 'node'"
**Fix:** This is TypeScript only, doesn't affect runtime. You can ignore it.

### Issue: "Missing GEMINI_API_KEY"
**Fix:** Add to `.env.local` and restart server:
```bash
GEMINI_API_KEY=sk-your-actual-key-here
```

### Issue: "Database connection failed"
**Fix:** Verify DATABASE_URL:
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### Issue: "Settings not persisting"
**Fix:** Ensure `PATCH /api/settings` returns 200 status code:
```bash
curl -v -X PATCH http://localhost:4000/api/settings
```

### Issue: "OAuth redirect fails"
**Fix:** Ensure `API_BASE_URL` in `.env.local` matches where server is running:
```bash
# For local dev:
API_BASE_URL=http://localhost:4000

# For Replit:
API_BASE_URL=https://your-project.replit.dev
```

---

## 📋 Pre-Replit Deployment Checklist

- [ ] All tests above pass locally
- [ ] No console errors in browser DevTools
- [ ] No server errors in terminal
- [ ] Database tables created successfully
- [ ] Campaign CRUD works (create, read, update, delete)
- [ ] Settings save/load works
- [ ] CSV export generates file
- [ ] No hardcoded test values in code

---

## 🎯 What To Test on Replit

After deploying to Replit:

1. [ ] Health endpoint: `curl https://your-project.replit.dev/api/health`
2. [ ] Scheduler endpoint: `curl https://your-project.replit.dev/api/scheduler/run?token=YOUR_TOKEN`
3. [ ] Login with Clerk
4. [ ] Create a campaign
5. [ ] Update campaign with assets
6. [ ] Delete a campaign
7. [ ] Export campaign CSV
8. [ ] Try (stub) HubSpot OAuth redirect
9. [ ] Try (stub) GA4 OAuth redirect
10. [ ] Check scheduler runs on Sunday 9am (or manually trigger)

---

## 📞 If Something Breaks

1. **Check the error message** - Copy the exact error
2. **Check the logs** - Look in Replit console or terminal
3. **Check environment variables** - Make sure all are set
4. **Check database connection** - Try `psql $DATABASE_URL -c "SELECT 1"`
5. **Check code syntax** - Run `npm run build` locally
6. **Review changes** - Go through files in SPRINT_COMPLETED.md

---

## 🚀 Final Steps

Once everything works locally:

1. Commit and push to GitHub
2. Create/update Replit from GitHub
3. Set environment variables in Replit Secrets
4. Run: `psql $DATABASE_URL < init_db.sql`
5. Deploy
6. Test health endpoint
7. Celebrate! 🎉

---

**Last Updated:** January 15, 2026  
**Status:** Ready for deployment ✅
