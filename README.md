# Xero -> Zoho Books ETL (Catalyst AppSail)

This project connects Xero and Zoho Books using OAuth 2.0, exports Xero contacts to CSV, and imports the contacts into Zoho Books through the Zoho Books Contacts API.

## Important: Xero refresh-token error

Xero rotates refresh tokens. A successful refresh returns a new refresh token, and the previous one must not be reused. This project serializes Xero token refreshes with a provider lock so simultaneous API calls do not consume the same refresh token twice.

If the application already has an old/consumed token, you must reconnect Xero once:

1. Start the application.
2. Open `http://localhost:3000`.
3. Click **Disconnect Xero** if available, or call `POST /api/disconnect/xero`.
4. Click **Connect Xero** and approve the app again.
5. Click **Load Xero organizations**.
6. Select the organization and click **Select Xero organization**.

Do the same for Zoho if its token was revoked.

## Local setup

```bash
npm install
cp .env.example .env
```

Fill in the Xero and Zoho client credentials and a random `TOKEN_ENCRYPTION_KEY` of at least 32 characters.

Then:

```bash
npm start
```

Open:

`http://localhost:3000`

## Flow

1. Xero OAuth callback stores an encrypted access token and refresh token.
2. Xero organizations are loaded from `/connections`.
3. The selected Xero tenant ID is stored with the token.
4. Zoho OAuth callback stores its access/refresh token and API domain.
5. The selected Zoho Books organization ID is stored.
6. Export fetches all Xero Contacts and writes an audit CSV under `data/exports/`.
7. ETL imports the same contact data into Zoho Books using `POST /books/v3/contacts`.
8. `SKIP_EXISTING=true` prevents duplicate imports based on normalized contact name.

The CSV is an export/audit artifact. The production import path uses the Zoho Books Contacts API rather than attempting to automate the Zoho Books web UI CSV importer.

## Catalyst scheduling

Catalyst Job Scheduling can invoke an AppSail service with POST and custom headers.

Create an AppSail Job Pool and an AppSail Job targeting:

`POST /api/etl/scheduled`

Add this custom header:

`x-schedule-secret: <same value as SCHEDULE_SECRET>`

Then create a Pre-defined Cron that submits this job on your desired schedule. Catalyst supports POST and custom headers for AppSail jobs.

## Xero webhook

Configure the Xero webhook URL as:

`https://YOUR_APPSAIL_DOMAIN/webhooks/xero`

Set the Xero signing key in `XERO_WEBHOOK_KEY`.

The webhook acknowledges Xero quickly and asynchronously starts the same ETL. A process-level lock prevents overlapping ETL executions inside one AppSail instance.

## Production storage note

The included token store encrypts tokens with AES-256-GCM and writes them to `data/tokens.enc`. This is suitable for a single-instance/local deployment. For a production system with multiple AppSail instances or a requirement for durable storage across deployments, move the token store to a durable shared store such as Catalyst Data Store/Secret infrastructure.
