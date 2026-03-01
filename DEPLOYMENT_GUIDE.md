# FleetOps — Deployment Guide
### Get your maintenance system live in ~45 minutes

---

## What you'll set up
- **Supabase** — free database that stores all your fleet data
- **Vercel** — free hosting so your team can access the app from any browser
- **Your domain** — optionally connect fleet.yourcompany.com

---

## STEP 1 — Set up Supabase (your database)
*Takes about 10 minutes*

1. Go to **https://supabase.com** and click "Start your project"
2. Sign up with your email (or Google account)
3. Click **"New project"**
   - Organization: create one with your company name
   - Project name: `fleetops`
   - Database password: create a strong password and **save it somewhere safe**
   - Region: pick the one closest to you (e.g. US East)
4. Click **"Create new project"** — wait about 2 minutes for it to set up

5. Once ready, go to **SQL Editor** (left sidebar, looks like a database icon)
6. Click **"New query"**
7. Open the file `supabase_schema.sql` from this folder
8. Copy the entire contents and paste into the SQL editor
9. Click **"Run"** (the green button)
   - You should see "Success. No rows returned" — that's correct!
   - This creates all your tables, security rules, and seed assets

10. Now get your connection keys:
    - Go to **Project Settings** → **API** (left sidebar)
    - Copy the **"Project URL"** — looks like `https://abcdefghijk.supabase.co`
    - Copy the **"anon public"** key — a long string starting with `eyJ...`
    - Keep this browser tab open, you'll need these in Step 3

---

## STEP 2 — Set up Vercel (your hosting)
*Takes about 5 minutes*

1. Go to **https://vercel.com** and click "Sign Up"
2. Sign up with GitHub (easiest) or your email
3. If you don't have GitHub: sign up at github.com first (it's free), then come back

4. Once in Vercel, click **"Add New Project"**
5. You'll need to upload your code. Two options:

   **Option A — GitHub (recommended):**
   - Create a new repository at github.com/new, name it `fleetops`, make it Private
   - Upload the entire `fleetops` folder to it
   - Back in Vercel, click "Import" next to your new repo

   **Option B — Vercel CLI (faster if you're comfortable with a terminal):**
   - Install Node.js from nodejs.org if you haven't
   - Open Terminal / Command Prompt
   - Run: `npm install -g vercel`
   - Navigate to your fleetops folder: `cd path/to/fleetops`
   - Run: `vercel`
   - Follow the prompts — choose "no" for all the configuration questions

---

## STEP 3 — Connect Supabase to your app
*This is the critical step — takes 5 minutes*

In Vercel, after importing your project:

1. Before deploying, click **"Environment Variables"**
2. Add these two variables (use the values you copied from Step 1):

   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | `https://yourprojectid.supabase.co` |
   | `REACT_APP_SUPABASE_ANON_KEY` | `eyJ...your long key...` |

3. Click **"Deploy"**
4. Wait 2-3 minutes — Vercel builds your app
5. When done, you'll get a URL like `fleetops-abc123.vercel.app`
6. Open it — you should see the FleetOps login screen! 🎉

---

## STEP 4 — Create your first user (you)
*Takes 2 minutes*

1. In Supabase, go to **Authentication** → **Users** → **"Invite user"**
2. Enter your email address
3. Check your email for the invite link
4. Click the link and set your password
5. Log into your FleetOps app
6. Your account will be created as `field_crew` by default
7. To make yourself an admin:
   - In Supabase, go to **Table Editor** → **profiles**
   - Find your row and change `role` from `field_crew` to `admin`
   - Save it
8. Refresh your FleetOps app — you now have full access!

---

## STEP 5 — Add your team
*Once you're logged in as admin*

1. Go to the **Users** section in your FleetOps app
2. Click **"Add User"** for each team member
3. Set their name, email, and role:
   - **Admin** — you (and anyone who needs full access)
   - **Office Manager** — whoever handles invoices and cost tracking
   - **Foreman** — crew leads who log work and review history
   - **Field Crew** — operators who submit damage reports and log maintenance
4. Each new user gets a confirmation email — they click it, set a password, and they're in

---

## STEP 6 — (Optional) Connect your own domain
*e.g. fleet.yourcompany.com*

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type in `fleet.yourcompany.com` (or whatever you want)
3. Vercel gives you two DNS records to add
4. Log into your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.)
5. Add those two DNS records
6. Wait up to 24 hours for DNS to propagate
7. Your app is now live at your custom domain!

---

## STEP 7 — Add the rest of your assets
1. Log into FleetOps as admin
2. Go to **Assets** → **Add Asset**
3. Add each of your 100+ assets one by one
   — OR — you can bulk-insert them via Supabase's SQL editor:

```sql
INSERT INTO public.assets (id, name, category, type, year, make, model) VALUES
('ASP-003', 'Your Asset Name', 'asphalt', 'truck', '2020', 'Make', 'Model'),
('CON-003', 'Another Asset',   'concrete', 'equipment', '2019', 'Make', 'Model');
-- add as many rows as you need
```

---

## Ongoing costs (spoiler: basically free)

| Service | Free Tier | When you'd pay |
|---------|-----------|----------------|
| Supabase | 500MB database, 2 projects | ~$25/mo if you exceed 500MB (unlikely for years) |
| Vercel | Unlimited deployments, custom domain | ~$20/mo only if you need team features |
| Domain | You likely already have one | ~$12/year if you need a new one |

**Your realistic cost to run this: $0–$12/year** until you have thousands of records.

---

## Troubleshooting

**"Invalid API key" error after logging in:**
→ Double-check your environment variables in Vercel. Make sure there are no spaces before/after the values.

**Login works but no data shows:**
→ Make sure you ran the full SQL schema in Step 1. Go to Supabase → Table Editor and confirm you see tables like `assets`, `maintenance_logs`, etc.

**"Email not confirmed" when trying to log in:**
→ Check the user's email for a confirmation link from Supabase. It might be in spam.

**Changes not showing up after deploy:**
→ In Vercel, trigger a "Redeploy" from the Deployments tab.

---

## Need help?

If you get stuck at any step, just describe exactly where you are and what you're seeing — 
paste any error messages — and I can walk you through it.
