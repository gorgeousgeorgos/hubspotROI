# API Reference - All New & Updated Endpoints

**Last Updated:** January 15, 2026

---

## 📚 Table of Contents
1. [OAuth Endpoints](#oauth-endpoints)
2. [Settings Endpoints](#settings-endpoints)
3. [Campaign Endpoints](#campaign-endpoints)
4. [Asset Endpoints](#asset-endpoints)
5. [Stats Endpoints](#stats-endpoints)
6. [Scheduler Endpoint](#scheduler-endpoint)

---

## OAuth Endpoints

### Get HubSpot OAuth Authorization URL
```http
GET /api/integrations/hubspot/auth-url
Authorization: Bearer <CLERK_TOKEN>
```

**Response:**
```json
{
  "authUrl": "https://app.hubapi.com/oauth/authorize?client_id=...&redirect_uri=...&scope=..."
}
```

**Curl Example:**
```bash
curl -H "Authorization: Bearer $CLERK_TOKEN" \
  http://localhost:4000/api/integrations/hubspot/auth-url
```

---

### Handle HubSpot OAuth Callback
```http
POST /api/integrations/hubspot/oauth-callback
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "code": "authorization_code_from_hubspot"
}
```

**Response:**
```json
{
  "ok": true,
  "credentials": {
    "accessToken": "pat-na1-...",
    "refreshToken": "...",
    "expiresAt": 1705324800000,
    "portalId": "12345"
  }
}
```

**Curl Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE_HERE"}' \
  http://localhost:4000/api/integrations/hubspot/oauth-callback
```

---

### Get GA4 OAuth Authorization URL
```http
GET /api/integrations/ga4/auth-url
Authorization: Bearer <CLERK_TOKEN>
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=..."
}
```

---

### Handle GA4 OAuth Callback
```http
POST /api/integrations/ga4/oauth-callback
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}
```

**Response:**
```json
{
  "ok": true,
  "credentials": {
    "accessToken": "ya29-...",
    "refreshToken": "1//...",
    "expiresAt": 1705324800000
  }
}
```

---

## Settings Endpoints

### Get User Settings
```http
GET /api/settings
Authorization: Bearer <CLERK_TOKEN>
```

**Response (if settings exist):**
```json
{
  "user_id": "user_123",
  "report_email": "user@example.com",
  "custom_domain": "track.example.com",
  "integrations": {
    "hubspot": {
      "accessToken": "pat-na1-...",
      "refreshToken": "...",
      "portalId": "12345"
    },
    "ga4": {
      "accessToken": "ya29-...",
      "refreshToken": "1//..."
    }
  },
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:05:00Z"
}
```

**Curl Example:**
```bash
curl -H "Authorization: Bearer $CLERK_TOKEN" \
  http://localhost:4000/api/settings
```

---

### Update User Settings (Partial)
```http
PATCH /api/settings
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "report_email": "newemail@example.com",
  "custom_domain": "track.company.com",
  "integrations": {
    "hubspot": {
      "accessToken": "pat-na1-..."
    }
  }
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "report_email": "newemail@example.com",
  "custom_domain": "track.company.com",
  "integrations": { ... },
  "updated_at": "2026-01-15T10:10:00Z"
}
```

**Curl Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_email":"new@example.com","custom_domain":"track.myco.com"}' \
  http://localhost:4000/api/settings
```

---

## Campaign Endpoints

### List Campaigns (Existing)
```http
GET /api/campaigns
Authorization: Bearer <CLERK_TOKEN>
```

**Response:**
```json
[
  {
    "id": "campaign_123",
    "user_id": "user_123",
    "name": "Summer Campaign",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer2026",
    "tracking_id": "ABC123",
    "destination_url": "https://example.com",
    "target_roi": 2.5,
    "asset_ids": ["asset_1", "asset_2"],
    "estimated_ad_spend": 5000,
    "estimated_production_cost": 1500,
    "revenue": 20000,
    "conversions": 45,
    "last_true_roi": 2.3,
    "last_reported_at": "2026-01-15T09:00:00Z",
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-15T09:00:00Z"
  }
]
```

---

### Create Campaign (Existing)
```http
POST /api/campaigns
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "name": "Q1 LinkedIn Campaign",
  "utm_source": "linkedin",
  "utm_medium": "paid",
  "utm_campaign": "q1_2026",
  "destination_url": "https://example.com/q1"
}
```

**Response:** 201 Created + campaign object

---

### Update Campaign (NEW)
```http
PUT /api/campaigns/:campaignId
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "name": "Updated Name",
  "asset_ids": ["asset_1", "asset_2", "asset_3"],
  "target_roi": 3.0,
  "estimated_ad_spend": 7500,
  "estimated_production_cost": 2000
}
```

**Response:** 200 OK + updated campaign object

**Curl Example:**
```bash
curl -X PUT \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset_ids":["asset_1","asset_2"],"target_roi":3.0}' \
  http://localhost:4000/api/campaigns/campaign_id_here
```

---

### Delete Campaign (NEW)
```http
DELETE /api/campaigns/:campaignId
Authorization: Bearer <CLERK_TOKEN>
```

**Response:** 200 OK
```json
{
  "ok": true,
  "message": "Campaign deleted"
}
```

**Curl Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  http://localhost:4000/api/campaigns/campaign_id_here
```

---

### Get Campaign Details (Existing)
```http
GET /api/campaigns/:campaignId
Authorization: Bearer <CLERK_TOKEN>
```

**Response:** 200 OK + campaign object with deals aggregated

---

### Get Campaign ROI History (NEW)
```http
GET /api/campaigns/:campaignId/history
Authorization: Bearer <CLERK_TOKEN>
```

**Response:**
```json
[
  {
    "generated_at": "2026-01-15T09:00:00Z",
    "report_json": {
      "summary": "Campaign performing 2.1x ROI...",
      "topPriorities": ["...", "...", "..."],
      "assetStrategy": { "refresh": [...], "scale": [...] },
      "channelInsights": "...",
      "campaignAdvice": "..."
    }
  }
]
```

---

### Export Campaigns as CSV (NEW)
```http
GET /api/campaigns/export/csv
Authorization: Bearer <CLERK_TOKEN>
```

**Response:** 200 OK with CSV file
```
Campaign Name,UTM Source,UTM Medium,UTM Campaign,Revenue,Conversions,Ad Spend,Production Cost,True ROI,Last Reported
"Summer Campaign","google","cpc","summer2026","20000","45","5000","1500","2.30","01/15/2026"
```

**Curl Example:**
```bash
curl -H "Authorization: Bearer $CLERK_TOKEN" \
  http://localhost:4000/api/campaigns/export/csv > campaigns.csv
```

---

## Asset Endpoints

### List Assets (NEW)
```http
GET /api/assets
Authorization: Bearer <CLERK_TOKEN>
```

**Response:**
```json
[
  {
    "id": "asset_1",
    "user_id": "user_123",
    "name": "LinkedIn Banner",
    "type": "BANNER",
    "cost_amount": 500,
    "cost_type": "ONE_OFF",
    "hubspot_id": null,
    "created_at": "2026-01-10T12:00:00Z",
    "smart_map": {}
  }
]
```

---

### Create/Update Asset (NEW)
```http
POST /api/assets
Authorization: Bearer <CLERK_TOKEN>
Content-Type: application/json

{
  "name": "Q1 Whitepaper",
  "type": "WHITEPAPER",
  "cost_amount": 2000,
  "cost_type": "ONE_OFF"
}
```

**Response:** 201 Created + asset object

**Curl Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Banner Ad","type":"BANNER","cost_amount":500,"cost_type":"ONE_OFF"}' \
  http://localhost:4000/api/assets
```

---

### Delete Asset (NEW)
```http
DELETE /api/assets/:assetId
Authorization: Bearer <CLERK_TOKEN>
```

**Response:** 200 OK
```json
{
  "ok": true,
  "message": "Asset deleted"
}
```

---

## Stats Endpoints

### Delete Individual Stat (NEW)
```http
DELETE /api/stats/:statId
Authorization: Bearer <CLERK_TOKEN>
```

**Response:** 200 OK
```json
{
  "ok": true,
  "message": "Stat deleted"
}
```

---

## Scheduler Endpoint

### Trigger Scheduler Run (NEW)
```http
GET /api/scheduler/run
X-Scheduler-Token: <SCHEDULER_TOKEN>
```

**Or with query parameter:**
```http
GET /api/scheduler/run?token=<SCHEDULER_TOKEN>
```

**Response:**
```json
{
  "ok": true,
  "message": "Scheduler run completed successfully"
}
```

**Curl Examples:**

Using header:
```bash
curl -H "x-scheduler-token: $SCHEDULER_TOKEN" \
  http://localhost:4000/api/scheduler/run
```

Using query parameter:
```bash
curl "http://localhost:4000/api/scheduler/run?token=$SCHEDULER_TOKEN"
```

**For External Cron Service (EasyCron):**
```
https://your-replit-url.replit.dev/api/scheduler/run?token=YOUR_SCHEDULER_TOKEN
```

---

## Error Responses

All endpoints follow this error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Missing or invalid fields |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Pro feature (if applicable) |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Check logs |

**Example:**
```bash
curl -X DELETE http://localhost:4000/api/campaigns/nonexistent

# Response:
# {"error":"Campaign not found"}
```

---

## Authentication

All endpoints (except `/api/scheduler/run`) require:

```
Authorization: Bearer <CLERK_TOKEN>
```

**Where to get CLERK_TOKEN:**
- Frontend: Use `@clerk/clerk-react` hook `useAuth()`
- Local testing: Use `x-user-id: test-user-123` header instead

---

## Rate Limiting

Global rate limit: **100 requests per 15 minutes**

Pixel endpoint limit: **100 requests per 15 minutes** (POST only)

---

## Typical Workflow

1. **Authenticate** with Clerk
2. **Get settings** → `GET /api/settings`
3. **Set OAuth URLs** → Get from `/api/integrations/*/auth-url`
4. **User completes OAuth** → `/api/integrations/*/oauth-callback` stores credentials
5. **Create campaign** → `POST /api/campaigns`
6. **Create assets** → `POST /api/assets`
7. **Link assets to campaign** → `PUT /api/campaigns/:id` with asset_ids
8. **Export data** → `GET /api/campaigns/export/csv`
9. **Scheduler runs Sunday** → Syncs deals, calculates ROI, stores reports
10. **User views intelligence** → Fetches latest intel_reports from database

---

## Testing Locally

```bash
# Start server
cd server && npm start

# In another terminal, test endpoints:
export CLERK_TOKEN="test-token"
export USER_ID="test-user-123"

# Test without Clerk (uses x-user-id header)
curl -H "x-user-id: $USER_ID" http://localhost:4000/api/settings

# Test scheduler
curl "http://localhost:4000/api/scheduler/run?token=test-token"
```

---

## Notification System Endpoints

### Health Check
**GET** `/api/health` - Check system health and service status
- Response: `{ status: "ok", services: { slack, resend, database } }`
- No auth required

### Track Signup
**POST** `/api/auth/track-signup` - Track new user and send Slack alert
- Auth: Clerk token
- Response: `{ ok: true, isNewUser: true }`

### Test Slack Alert
**POST** `/api/admin/test-slack` - Send test message to Slack
- Auth: Clerk token (admin)
- Rate Limited: 10/min
- Response: `{ ok: true, message: "Slack alert sent" }`

### Test Email
**POST** `/api/admin/test-email` - Send test email via Resend
- Auth: Clerk token (admin)
- Rate Limited: 10/min
- Body: `{ email: "test@example.com", template: "welcome_free" }`
- Available templates: welcome_free, welcome_paid, first_step_nudge, upgrade_after_month, winback_paid

### Process Notifications
**POST** `/api/admin/process-notifications` - Manually trigger email processing
- Auth: Clerk token (admin)
- Rate Limited: 10/min
- Response: `{ processed: 150, sent: 23, skipped: 127 }`
- Auto-runs every Sunday 9 AM GMT via scheduler

---

**For notification details, see:**
- `NOTIFICATIONS_SETUP.md` - Configuration guide
- `NOTIFICATION_IMPLEMENTATION_SUMMARY.md` - Architecture
- `NOTIFICATION_QUICK_REFERENCE.md` - Quick start
- `monitoring/notifications.sql` - Monitoring queries

