# Telegram Integration

## 1. Create the bot
1. Open Telegram and talk to **@BotFather**.
2. Send `/newbot`, choose a display name and a username ending in `bot`.
3. Copy the token — it looks like `123456789:AAE...`.

## 2. Configure the platform
```env
TELEGRAM_BOT_TOKEN=123456789:AAE...
TELEGRAM_WEBHOOK_URL=https://your-domain/api/telegram/webhook
# optional but recommended
TELEGRAM_WEBHOOK_SECRET=a-random-string
```
Restart the app after editing `.env`.

## 3. Register the webhook
Open **Integrations → Telegram Bot → Register webhook**, or:
```bash
curl -X POST https://your-domain/api/system \
  -H "Content-Type: application/json" \
  -d '{"action":"telegram.webhook"}'
```
The platform calls `https://api.telegram.org/bot<token>/setWebhook` with your `APP_URL`.

## Supported commands
| Command | Behaviour |
|---|---|
| `/start` | Welcome message and command overview |
| `/help` | Command list |
| `/status` | Platform status line |
| `/contact` | Tells the customer a human agent will join |
| `/agent` | Enables the AI assistant for the conversation |

Any non-command message is:
1. stored as a conversation + message in the unified inbox,
2. answered by the AI **only if** the conversation is not paused or escalated,
3. sent back through `sendMessage`.

## Human takeover
In **Inbox**, use *Pause AI* to stop automatic replies for a conversation, *Escalate* to flag it for
a human, and *Reply* to answer manually. The webhook respects both flags.

## Publishing to a channel
Connect the channel in **Social Accounts**:
* `accountId` = the channel chat id (e.g. `-1001234567890`) — you can get it by messaging the
  channel and reading the webhook logs, or via `getUpdates`.
* `accessToken` = the bot token (stored encrypted).

Approved content scheduled on the `telegram` platform is then delivered automatically.

## Troubleshooting
* **409 Conflict** — another webhook or polling client is active; call `deleteWebhook` first.
* **Bad Request: chat not found** — the bot is not an administrator of the target channel.
* **Webhook not firing** — confirm the domain is publicly reachable over HTTPS.
