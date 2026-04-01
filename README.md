# 🔔 remnd

Ephemeral browser-notification reminders. No accounts. Auto-deletes.

`remnd` is a lightweight tool that lets you set quick reminders in your browser. It uses Web Push notifications to alert you even if the tab is closed, and automatically deletes your reminder data once it's delivered.

## Features
- **Privacy First**: No user accounts, logins, or tracking.
- **Ephemeral Storage**: Reminders are stored temporarily in Redis and deleted immediately after notification.
- **Browser Native**: Uses the standard Web Push API.
- **Cloudflare Native**: Optimized to run on Cloudflare Pages and Workers.

## Setup

### 1. Prerequisites
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted) database.
- [Cloudflare Pages](https://pages.cloudflare.com/) account for deployment.

### 2. Environment Variables
Copy the example environment file and fill in your keys:
```bash
cp .env.example .env.local
```

### 3. Generate VAPID Keys
To use Web Push, you need to generate a pair of VAPID keys:
```bash
node scripts/gen-vapid.mjs
```
Copy these into your `.env.local` (or Cloudflare Environment Variables).

## Deployment (Cloudflare Pages)

1. Connect your repository to **Cloudflare Pages**.
2. Set the **Framework Preset** to `Next.js`.
3. Set the **Build Command** to `npx @cloudflare/next-on-pages`.
4. Set the **Build Output Directory** to `.vercel/output/static`.
5. Add your environment variables in **Settings > Variables**.
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
    - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
    - `VAPID_PRIVATE_KEY`
    - `VAPID_SUBJECT` (e.g. `mailto:admin@example.com`)

## License
MIT