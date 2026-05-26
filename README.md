# DMRC Job Information Demo

This is an unofficial informational/demo website built with Next.js App Router, TypeScript, Tailwind CSS, and Cashfree PG Orders API integration through backend API routes.

It is not affiliated with Delhi Metro Rail Corporation Limited. Candidates must verify all recruitment details on the official DMRC website before taking any action.

## Features

- Home page with job highlights and vacancy details
- Application form page
- Disclaimer-gated payment page
- Cashfree order creation from backend only
- Payment status page that verifies the latest status from Cashfree backend API
- Cashfree webhook endpoint with signature verification
- Admin-style application list protected by `ADMIN_PASSWORD`
- Simple JSON storage placeholder for applications and webhook events

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
copy .env.local.example .env.local
```

3. Add your Cashfree sandbox values to `.env.local`:

```env
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_ENV=sandbox
CASHFREE_API_VERSION=2025-01-01
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_PASSWORD=change_this_password
```

4. Run the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Cashfree Environment Variables

Never put Cashfree secrets in frontend code. Configure these only as environment variables:

- `CASHFREE_CLIENT_ID`
- `CASHFREE_CLIENT_SECRET`
- `CASHFREE_ENV`
- `CASHFREE_API_VERSION`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_PASSWORD`

The frontend receives only `payment_session_id` and `order_id`.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. In Vercel Project Settings, add environment variables:

```env
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_ENV=sandbox
CASHFREE_API_VERSION=2025-01-01
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
ADMIN_PASSWORD=strong_admin_password
```

4. Deploy.
5. In Cashfree dashboard, configure the webhook/notify URL:

```text
https://your-vercel-domain.vercel.app/api/cashfree-webhook
```

## Switch Sandbox To Production

1. Replace sandbox keys with production keys in Vercel.
2. Change:

```env
CASHFREE_ENV=production
```

3. Set:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

4. Redeploy on Vercel.

The backend uses:

- Sandbox: `https://sandbox.cashfree.com/pg/orders`
- Production: `https://api.cashfree.com/pg/orders`

## Storage Note

This project includes a simple JSON storage placeholder at `data/applications.json` for local/demo use. Vercel serverless filesystem storage is not persistent. For production applications, replace `lib/store.ts` with a database such as Supabase, Postgres, or another persistent datastore.

## Security Notes

- Fee amount is validated server-side using category rules.
- Browser-supplied amount is rejected if it does not match the server fee.
- Cashfree secret stays only in backend routes.
- Webhook signatures are verified with HMAC before events are accepted.
- Payment pages clearly show that this is an unofficial demo website.
- The UI avoids official DMRC/government portal branding.
