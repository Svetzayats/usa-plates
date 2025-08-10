# Collecting Photos of USA Plates

A lightweight PWA game to collect photos of U.S. license plates by state. Mobile-first. 

## Story behind it 

I recently moved to the US and started collecting photos of license plates from different states. I used a Telegram channel for this, where I sent photos of plates from different states and also funny plates I spotted.

It was a shared channel for me and my husband, but after a month I realized I didn’t always remember which state plates we had and which we didn’t. It would be nice to have a checklist, wouldn’t it?

GPT-5 was announced last week, and one of the examples showed how easily it can create small applications or games, and how good it is at frontend coding. It seemed like a good idea to use this power to quickly get a working solution.

> Spoiler: yes, it worked! Not as beautifully and effortlessly as I hoped, but still.

I asked it to write a simple PWA that stores data in IndexedDB, using only JS/HTML/CSS. The result was:
- 650 lines of JS code
- 150 lines of HTML
- 370 lines of CSS

**It took about an hour to get a working version**. Interestingly, in most cases the code worked without changes, but there were a couple of CSS issues that were easier to fix manually, and also a couple of obvious bugs in the JS code. For example, when transforming a state name into a hashtag, it should remove spaces, but it generated this:

```js
const stateName = String(text || "")
  .replace(/[A-Za-z0-9]/g, "")
  .trim()
  .replace(/\s+/g, "");
```

Easy to fix if you know what to look for, but funny nonetheless. Is it intentional — so you use more tokens and spend more time debugging? (I love dystopias, and this scenario fits right in.)

I spent another half hour adding functionality to send photos to a Telegram chat. That part was implemented nicely with no problems. The longest step was creating the bot and group. The only thing I didn’t like at this stage was that GPT-5 tried to add dotenv, which in my opinion was unnecessary, so I asked it not to use it and re-implement.

After that, I thought about where to host it and decided on Cloudflare. Since it’s a small project and only my husband and I will use it, their limits are reasonable. I asked GPT-5 to make changes for Cloudflare hosting, so it moved all the logic for posting to the Telegram channel into a function — and that was it. It also provided detailed instructions on how to set everything up.

**Overall, I have a good impression, but it still requires a lot of attention.** For example, in CSS GPT-5 created variables but used them inconsistently, sometimes hardcoding colors for which it already had variables.

I plan to experiment with refactoring and adding tests later, because that’s something I often need at work when dealing with legacy code. But for a pet project, it looks solid. We definitely need to sharpen our review skills, because AI gives us plenty to read.

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
