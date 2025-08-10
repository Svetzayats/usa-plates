# Collecting Photos of USA Plates

A lightweight PWA game to collect photos of U.S. license plates by state. Mobile-first, offline-ready.

## Run locally (Node)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the local server:

   ```bash
   npm run start
   ```

   Server runs on `http://localhost:5173`.

## Telegram integration

Create a `.env` file in the project root with the following variables to enable auto-posting new photos to your Telegram channel/group:

- `TELEGRAM_BOT_TOKEN`: Bot token from BotFather.
- `TELEGRAM_CHAT_ID`: Target chat ID (channel username as `@channelname` or numeric ID for group/channel).
- `API_JSON_LIMIT` (optional): JSON body limit for uploads, default `20mb`.
- `TELEGRAM_SHARING_CODE` (optional): If set, only clients that provide this code will be allowed to forward photos to Telegram.

`.env.example`:

```
# Telegram bot credentials
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
TELEGRAM_CHAT_ID=@my_channel

# Optional: increase JSON body size
# API_JSON_LIMIT=20mb
```

Copy it to `.env`, edit values, then run:

```bash
npm run start
```

Behavior:

- When adding a state photo, the app posts the image with caption `#<STATE_CODE>` (e.g., `#CA`).
- When adding a gallery photo, the app posts the image with caption `#fun`.
- A "Sharing code" button in the header lets users enter a code; when set and valid, photos are forwarded to Telegram. Without a code, the app still works locally but does not forward photos.

## Expose via ngrok

Expose your local server over the internet:

```bash
npm run ngrok
```

This starts the server and then opens an ngrok tunnel to port 5173. Check the terminal output for the public URL.

Note: The service worker uses relative asset paths and `no-store` caching for `sw.js` to ensure updates.
