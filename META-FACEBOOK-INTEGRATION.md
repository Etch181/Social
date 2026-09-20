# Meta — Facebook Integration

## 1. Create the Meta app
1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App**.
2. Choose **Business** as the app type.
3. Add the **Facebook Login** product.

## 2. Configure Facebook Login
* **Valid OAuth Redirect URIs**: `https://your-domain/api/integrations/meta/callback`
* Settings → Basic: copy the **App ID** and **App Secret** into `.env`:
  ```env
  META_APP_ID=...
  META_APP_SECRET=...
  META_REDIRECT_URI=https://your-domain/api/integrations/meta/callback
  ```

## 3. Permissions & tokens
Request these permissions (App Review is required for production):
* `pages_show_list`
* `pages_read_engagement`
* `pages_manage_posts`
* `business_management`

Generate a **Page access token** (Graph API Explorer → your page → `page_access_token`) and connect it
in **Social Accounts → Connect account → Facebook**.

> The token is encrypted with AES-256-GCM before storage and is never returned to the browser.

## 4. Publishing
The `facebookAdapter` in `src/lib/publishing/facebook.ts` supports:
* text feed posts (`POST /{page-id}/feed`)
* photo posts (`POST /{page-id}/photos`)
* video posts (`POST /{page-id}/videos`)
* link posts
* health checks (`GET /{page-id}?fields=id,name`)

## 5. Error handling
If Graph returns an error, the platform:
* marks the content item `FAILED` with the exact Graph error message,
* writes an audit entry (`content.publish_failed`),
* creates a notification,
* keeps the item retryable from the Content Studio.

## Troubleshooting
| Error | Fix |
|---|---|
| `Invalid OAuth access token` | Token expired — reconnect the page |
| `Permissions error` | The app is still in development mode; add yourself as a tester or submit for App Review |
| `Unsupported post request` | The page token lacks `pages_manage_posts` |
