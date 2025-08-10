/* Cloudflare Pages Function: POST /api/telegram/photo */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    const requiredShareCode = env.TELEGRAM_SHARING_CODE;

    if (!botToken || !chatId) {
      return json({ ok: false, error: "Telegram is not configured" }, 503);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ ok: false, error: "Unsupported Media Type" }, 415);
    }

    const payload = await request.json().catch(() => null);
    const imageBase64 = payload && payload.imageBase64;
    const mimeType = (payload && payload.mimeType) || "image/jpeg";
    const caption =
      payload && payload.caption ? String(payload.caption) : undefined;
    const shareCode =
      payload && payload.shareCode ? String(payload.shareCode) : undefined;

    if (requiredShareCode && shareCode !== requiredShareCode) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ ok: false, error: "imageBase64 is required" }, 400);
    }

    const photoBytes = base64ToUint8Array(imageBase64);
    const photoBlob = new Blob([photoBytes], { type: mimeType });

    const form = new FormData();
    form.set("chat_id", chatId);
    if (caption) form.set("caption", caption);
    form.set("photo", photoBlob, "plate.jpg");

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    const tgResponse = await fetch(tgUrl, { method: "POST", body: form });
    const tgJson = await tgResponse.json().catch(() => ({}));

    if (!tgResponse.ok || (tgJson && tgJson.ok === false)) {
      const errorMessage =
        (tgJson && tgJson.description) ||
        tgResponse.statusText ||
        "Telegram error";
      return json({ ok: false, error: errorMessage }, 502);
    }

    return json({
      ok: true,
      telegram: { message_id: tgJson.result && tgJson.result.message_id },
    });
  } catch (error) {
    return json({ ok: false, error: "Internal Server Error" }, 500);
  }
}

function base64ToUint8Array(base64String) {
  const binaryString = atob(base64String);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
