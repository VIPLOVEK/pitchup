# ⚽ PitchUp — Deployment Guide

Full pickup soccer organizer. Players vote on real time slots via a web link.
Voting closes automatically 4 hours before the earliest slot — if enough
players (`min_players`) have joined, teams are generated and a WhatsApp
announcement fires automatically; otherwise the game is cancelled and
everyone is notified. The first `max_players` to join get a spot; anyone
after that goes on an auto-promoted waiting list.

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key (see "Push notifications" below) |
| `VAPID_PUBLIC_KEY` | same value as above |
| `VAPID_PRIVATE_KEY` | Web Push private key — keep secret |
| `VAPID_CONTACT_EMAIL` | contact email for push services, e.g. `you@example.com` |

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

## Step 3b — Push notifications (optional, ~2 min)

Players can opt into browser push notifications (game confirmed/cancelled,
voting-closes-soon reminders) from their Profile page — no app store needed.

1. Generate a VAPID key pair: `npx web-push generate-vapid-keys`
2. Add the keys to your env vars (table above): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and
   `VAPID_PUBLIC_KEY` get the **public** key, `VAPID_PRIVATE_KEY` gets the **private** key.
3. Set `VAPID_CONTACT_EMAIL` to any contact address.
4. Redeploy. Players visit `/profile` → "Enable notifications".

If these env vars aren't set, the notifications section is hidden and push
sends are silently skipped — everything else still works.

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
3. Create a poll — set title, location (pick a venue or "Other"), proposed time slots (real dates/times), min and max players
4. Copy the share link → paste into your WhatsApp group
5. Watch players join in real time — first `max` players are confirmed, the rest go on a waiting list
6. 4 hours before the earliest slot, voting closes automatically:
   - If `min` players joined → teams are generated + WhatsApp announcement fires
   - If not → the poll is cancelled and WhatsApp announces "game is off"
7. Or manually confirm early via "Confirm game now" button

### As player
1. Tap the link from WhatsApp
2. Enter your name, tap the times that work
3. Tap **I'm in ⚽**
4. See who else is joining (and the waiting list) live

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
│   ├── teams.js          # Team generator, slot picker, waitlist helpers
│   ├── pollStatus.js     # Cutoff time + confirm/cancel evaluation
│   ├── locations.js      # Venue presets (map links + boot type)
│   ├── whatsapp.js       # WhatsApp Cloud API sender
│   └── tokens.js         # Design tokens
├── styles/
│   └── globals.css
└── supabase-schema.sql   # Run this in Supabase SQL Editor
```

---

## Customization

- **Change the voting cutoff** (default 4 hours before the earliest slot) — edit `CUTOFF_HOURS` in `lib/pollStatus.js`
- **Change default min/max players** — edit the `minPlayers`/`maxPlayers` initial state in `pages/admin.js`
- **Add/edit venues** — edit `LOCATIONS` in `lib/locations.js`
- **Custom WhatsApp message** — edit `lib/whatsapp.js` → `sendWhatsAppAnnouncement` / `sendWhatsAppCancellation`
- **Add skill ratings for balanced teams** — extend the player object in the vote API and update `lib/teams.js`
- **Real-time updates** — swap `getServerSideProps` for Supabase Realtime subscriptions

---

## Cost

Everything runs on free tiers:
- Supabase free: 500MB storage, 2GB bandwidth
- Vercel free: 100GB bandwidth, unlimited deployments
- WhatsApp Cloud API: free up to 1,000 conversations/month
