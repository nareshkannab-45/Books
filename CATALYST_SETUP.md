# Catalyst procedure

1. Install/login to Catalyst CLI.
2. Put this project in a folder.
3. `npm install`.
4. Run `catalyst init`.
5. Associate/create your Catalyst project.
6. Add/initialize AppSail in this directory.
7. Choose Catalyst-managed runtime, Node.js, Node 22, build path `.`.
8. Keep the included `app-config.json` or merge its command/stack/build settings into the generated one.
9. Test with `catalyst serve`.
10. Deploy with `catalyst deploy appsail`.

In AppSail environment variables set:
`XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`, `XERO_WEBHOOK_KEY`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_ACCOUNTS_URL`, `ZOHO_API_DOMAIN`, `TOKEN_ENCRYPTION_KEY`, `SCHEDULE_SECRET`, `SKIP_EXISTING=true`, `CONTACT_TYPE=ALL`.

After deployment, replace localhost redirect URIs with the exact AppSail URL:
`https://YOUR_APPSAIL_DOMAIN/auth/xero/callback`
`https://YOUR_APPSAIL_DOMAIN/auth/zoho/callback`

Connect and select:
- Xero: `POST /api/xero/tenants`, then `POST /api/xero/tenant` with `{"tenantId":"..."}`.
- Zoho: `POST /api/zoho/organizations`, then `POST /api/zoho/organization` with `{"organizationId":"..."}`.

Run test:
`POST /api/etl/run` with `{"contactType":"ALL"}`.

Schedule:
Catalyst Console → Job Scheduling → create Job Pool with AppSail target → create Job for this AppSail target and configure POST `/api/etl/scheduled` with `x-schedule-secret` header → create a predefined Cron (for example daily at 01:00).

Xero webhook:
`https://YOUR_APPSAIL_DOMAIN/webhooks/xero`
with the Xero webhook signing key in `XERO_WEBHOOK_KEY`.

The previous webhook bug (using `events` before declaring it) and the previous `ContactWebhook` import problem are removed.
