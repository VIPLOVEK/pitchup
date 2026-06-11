# ⚽ PitchUp — Deployment Guide

Full pickup soccer organizer. Players vote on time slots via a web link, game auto-confirms at your threshold, teams are generated, and a WhatsApp announcement fires automatically.

---

## Stack
- **Next.js 14** — frontend + API routes
- **Supabase** — Postgres database (free tier)
- **Vercel** — hosting (free tier)
- **Meta WhatsApp Cloud API** — outbound announcements (free)

---

## Step 1 — Supabase setup (~5 min)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL** and **anon key** (Settings → API)
3. Also copy the **service_role key** (keep this secret — server only)
4. Go to **SQL Editor** → paste and run `supabase-schema.sql`

---

## Step 2 — Deploy to Vercel (~5 min)

### Option A: GitHub (recommended)
```bash
# Push this folder to a GitHub repo
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/pitchup.git
git push -u origin main
```
Then go to [vercel.com](https://vercel.com) → **New Project** → import your repo.

### Option B: Vercel CLI
```bash
npm install -g vercel
cd pitchup
vercel
```

### Environment variables
In Vercel → your project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `ADMIN_PASSWORD` | pick a strong password |
| `WHATSAPP_PHONE_NUMBER_ID` | from Meta (see Step 3) |
| `WHATSAPP_ACCESS_TOKEN` | from Meta (see Step 3) |
| `WHATSAPP_GROUP_RECIPIENT` | phone number to notify (e.g. `15551234567`) |

After adding variables, **redeploy** from Vercel dashboard.

---

## Step 3 — WhatsApp Cloud API (~15 min)

This sends the game confirmation message automatically.

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App → Business**
2. Add **WhatsApp** product to your app
3. In **WhatsApp → Getting Started**:
   - Note your **Phone Number ID**
   - Generate or copy your **Access Token** (use a System User token for permanent access)
4. Add a **recipient number** in the test sandbox (your phone or a group admin's number)
5. For production: verify a real business number

> **Note on groups:** The Cloud API sends to individual numbers, not WhatsApp groups directly.
> Best workflow: send to the organizer's number → they forward to the group.
> Or set up a WhatsApp Broadcast List and use that number as the recipient.

---

## Step 4 — Local development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local
# Fill in your values in .env.local

# Run dev server
npm run dev
# → http://localhost:3000
```

---

## Usage

### As organizer (Admin)
1. Go to `your-app.vercel.app/admin`
2. Enter admin password
3. Create a poll — set title, location, time slots, player count
4. Copy the share link → paste into your WhatsApp group
5. Watch players join in real time
6. Game auto-confirms + WhatsApp fires when threshold is hit
7. Or manually confirm early via "Confirm game" button

### As player
1. Tap the link from WhatsApp
2. Enter your name, tap the times that work
3. Tap **I'm in ⚽**
4. See who else is joining live

---

## File structure

```
pitchup/
├── pages/
│   ├── index.js          # Homepage — active poll + recent games
│   ├── admin.js          # Admin dashboard
│   ├── poll/[id].js      # Vote page (shareable link)
│   └── api/
│       ├── polls.js      # POST — create poll
│       ├── poll/[id].js  # GET poll, POST vote
│       └── admin/
│           ├── polls.js  # GET — list all polls
│           └── [id].js   # PATCH (close/shuffle), DELETE
├── components/
│   ├── Layout.js         # Header + page wrapper
│   └── UI.js             # Shared components
├── lib/
│   ├── supabase.js       # DB client
│   ├── teams.js          # Team generator + slot picker
│   ├── whatsapp.js       # WhatsApp Cloud API sender
│   └── tokens.js         # Design tokens
├── styles/
│   └── globals.css
└── supabase-schema.sql   # Run this in Supabase SQL Editor
```

---

## Customization

- **Change player threshold default** — edit `THRESHOLD_OPTIONS` in `pages/admin.js`
- **Custom WhatsApp message** — edit `lib/whatsapp.js` → `sendWhatsAppAnnouncement`
- **Add skill ratings for balanced teams** — extend the player object in the vote API and update `lib/teams.js`
- **Real-time updates** — swap `getServerSideProps` for Supabase Realtime subscriptions

---

## Cost

Everything runs on free tiers:
- Supabase free: 500MB storage, 2GB bandwidth
- Vercel free: 100GB bandwidth, unlimited deployments
- WhatsApp Cloud API: free up to 1,000 conversations/month
