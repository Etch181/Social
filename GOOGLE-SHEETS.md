# Google Sheets Integration

Google Sheets acts as the agency's **operational mirror** — not as the primary database and never as
a secret store.

## 1. Create a service account
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
4. Open the service account → **Keys → Add key → Create new key → JSON**.
5. Download the JSON file. Its `client_email` and `private_key` are what the platform needs.

## 2. Create the spreadsheet
1. Create a Google Spreadsheet (any name, e.g. `FOX AI SOCIAL — Operations`).
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`
3. Share the spreadsheet with the service account `client_email` and give it **Editor** access.

## 3. Configure the platform
In `.env`:
```env
GOOGLE_SHEETS_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"fox@project.iam.gserviceaccount.com",...}
```
Put the whole JSON on **one line** (the platform converts `\n` automatically).

## 4. Sync
* **Google Sheets page → “Sync now”** for an immediate export.
* `POST /api/system` with `{ "action": "sheets.sync" }` for automation.
* The sync is **idempotent**: each run replaces worksheet contents with the current database state, so
  retries never create duplicates.

## Worksheet structure
| Tab | Contents |
|---|---|
| `AgencySettings` | Agency name, website, timezone, language, last sync |
| `Users` | User metadata only — **never password hashes** |
| `Clients` | Master client list |
| `Campaigns` | Campaign records |
| `Content` | All content records |
| `Calendar` | Scheduled items |
| `Leads` | Lead records |
| `Conversations` | Conversation metadata |
| `AuditLogs` | Recent audit events |
| `Client_<name>` | One dedicated worksheet per client, created automatically when the client is created |

Worksheet names are sanitised (no `[]:*?/\`), truncated to 90 characters and made unique automatically.

## Security rules
Sheets **never** receives: passwords, password hashes, API keys, access tokens, refresh tokens, JWT
secrets or encryption keys. Only business data and safe connection metadata (status, timestamps,
error summaries).
