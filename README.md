<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ZxmOIEqa_4PMfzpvw8xSY8EPk5hO_eVk

## Run Locally

**Prerequisites:**  Node.js, Postgres (or Supabase)

1. Install dependencies:
   `npm install`
2. Create the database schema:
   - If starting fresh: run `psql $DATABASE_URL -f init_db.sql` (or use Supabase SQL runner)
   - If upgrading an existing DB: add the `revenue` column: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0;`
3. Set required env vars in `.env.local` (example below)

4. Run the app:
   `npm run dev`


Required environment variables (example):

```
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
CLERK_SECRET_KEY=your_clerk_secret
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
HUBSPOT_ACCESS_TOKEN=owner_fallback_token
```
