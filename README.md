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

## Expose via ngrok

Expose your local server over the internet:

```bash
npm run ngrok
```

This starts the server and then opens an ngrok tunnel to port 5173. Check the terminal output for the public URL.

Note: The service worker uses relative asset paths and `no-store` caching for `sw.js` to ensure updates.
