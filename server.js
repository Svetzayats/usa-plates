/* eslint-disable no-console */
const path = require("path");
const express = require("express");
const compression = require("compression");

// Ensure fetch/FormData/Blob are available in Node (Node < 18)
try {
  if (typeof fetch === "undefined") {
    // eslint-disable-next-line global-require
    const undici = require("undici");
    // eslint-disable-next-line no-undef
    globalThis.fetch = undici.fetch;
    // eslint-disable-next-line no-undef
    globalThis.FormData = undici.FormData;
    // eslint-disable-next-line no-undef
    globalThis.Blob = undici.Blob;
  }
} catch (_) {
  // no-op; will rely on global fetch in newer Node versions
}

function createServer() {
  const app = express();
  const rootDir = __dirname;

  // Allow JSON bodies for API routes (increase limit for image base64 payloads)
  app.use(
    express.json({
      limit: process.env.API_JSON_LIMIT || "20mb",
    })
  );

  app.use(compression());

  function setCustomCacheControl(res, filePath) {
    if (filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    }
  }

  app.use(
    express.static(rootDir, {
      setHeaders: setCustomCacheControl,
      extensions: ["html"],
    })
  );

  // API: forward photo to Telegram
  app.post("/api/telegram/photo", handleSendTelegramPhoto);

  app.get("*", function handleFallback(_req, res) {
    res.sendFile(path.join(rootDir, "index.html"));
  });

  return app;
}

async function handleSendTelegramPhoto(req, res) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      res.status(503).json({
        ok: false,
        error:
          "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars.",
      });
      return;
    }

    const { imageBase64, mimeType, caption } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      res.status(400).json({ ok: false, error: "imageBase64 is required" });
      return;
    }

    // Build multipart form-data request for Telegram sendPhoto
    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });
    const form = new FormData();
    form.set("chat_id", chatId);
    if (caption) form.set("caption", String(caption));
    form.set("photo", blob, "plate.jpg");

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    const tgResponse = await fetch(tgUrl, { method: "POST", body: form });
    const tgJson = await tgResponse.json().catch(() => ({}));

    if (!tgResponse.ok || (tgJson && tgJson.ok === false)) {
      // eslint-disable-next-line no-console
      console.error("Telegram API error", tgJson || tgResponse.statusText);
      res.status(502).json({
        ok: false,
        error: tgJson.description || tgResponse.statusText,
      });
      return;
    }

    res.json({ ok: true, telegram: { message_id: tgJson.result?.message_id } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/telegram/photo error", error);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

function start() {
  const port = process.env.PORT ? Number(process.env.PORT) : 5173;
  const host = process.env.HOST || "0.0.0.0";
  const app = createServer();
  app.listen(port, host, function onListen() {
    console.log(`Server running at http://${host}:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { createServer };
