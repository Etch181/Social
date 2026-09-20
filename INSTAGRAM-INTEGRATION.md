# Instagram Integration

Instagram Business/Creator publishing uses the **Instagram Graph API** — the same Meta app as the
Facebook integration.

## Requirements
* An **Instagram Business or Creator account**.
* The account must be connected to a **Facebook Page** you control.
* A Meta app with the products **Instagram** and **Facebook Login**.
* Permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`.

## Configuration
```env
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://your-domain/api/integrations/meta/callback
META_GRAPH_VERSION=v21.0
```

Then connect the account in **Social Accounts → Instagram**:
* `accountId` = the Instagram Business account ID (`GET /me/accounts` on the Facebook page returns it)
* `accessToken` = the long-lived page/token with the Instagram permissions above.

## Publishing flow
The `instagramAdapter` implements the official two-step flow:
1. `POST /{ig-user-id}/media` — create the media container (`image_url` / `video_url` + caption)
2. `POST /{ig-user-id}/media_publish` — publish the container

Supported formats: single image, carousel, reel (`media_type=REELS`) and story.

> Instagram requires **publicly reachable media URLs**. Local or authenticated URLs are rejected by
> the Graph API — host media on a public CDN.

## Health check
`GET /{ig-user-id}?fields=id,username` verifies the token and shows the connected handle.

## Limitations imposed by Meta
* Rate limit: 200 API-published posts per 24 hours per account (Instagram Graph API rule).
* Video/reel uploads must be `mp4`/`mov` and within Meta's duration & size limits.
* Captions are limited to 2,200 characters and 30 hashtags.

## Troubleshooting
| Error | Fix |
|---|---|
| `Application does not have permission for this action` | Submit the app for App Review with `instagram_content_publish` |
| `Invalid media ID` | The container expired — republish to create a new one |
| `Media URL is not valid` | Use a public HTTPS media URL |
