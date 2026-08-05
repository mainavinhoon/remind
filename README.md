# remind [Hosted - https://remnd.in/]

A minimal URL-based clipboard with browser reminders.

Write a note to any URL, open it from another device, and optionally schedule a browser notification to remind yourself later. No accounts, no setup for users.

## Features

- URL-based temporary clipboard
- Cross-device note sharing
- Browser push notifications
- Human-readable reminder durations
- Automatic expiration after 7 days

## Examples

### Share a code snippet

A developer can save a command, configuration, or code snippet to a memorable path:

```text
http://localhost:3000/api-debug
```

Content:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","role":"developer"}'
```

A teammate can open the same URL on another device and copy the snippet immediately.

### Share temporary debugging notes

Use a project-specific path:

```text
http://localhost:3000/payment-service-debug
```

Content:

```text
Issue: webhook signature verification is failing

Check:
1. Confirm WEBHOOK_SECRET is available in production
2. Compare the raw request body before JSON parsing
3. Verify the timestamp tolerance
```

### Remember something for later

Save a reminder with a duration:

```text
2h
```

Content:

```text
Recheck the production deployment after the cache expires.
```

Supported reminder formats:

```text
30s
15m
1h
2h30m
1d
```

A plain number is interpreted as minutes.


## Getting Started

Clone the repository.

```bash
git clone https://github.com/mainavinhoon/remind.git
cd remind
npm install
```

Generate VAPID keys.

```bash
npx web-push generate-vapid-keys
```

Create a `.env.local` file.

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

Start the development server.

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

## Tech Stack

- Next.js
- React
- TypeScript
- Upstash Redis
- Upstash QStash
- Web Push API

## Contributing

Issues and pull requests are welcome.

## License

Licensed under the Apache License 2.0.
