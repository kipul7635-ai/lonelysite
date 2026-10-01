export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const text = String(body.text ?? "").trim();
  if (!text) return json({ error: "empty" }, 400);
  if (text.length > 500) return json({ error: "too long" }, 400);

  const jobs = [sendTelegram(env, text)];
  if (env.DISCORD_WEBHOOK_URL) jobs.push(sendDiscord(env, text));

  const results = await Promise.allSettled(jobs);
  const anyOk = results.some((r) => r.status === "fulfilled" && r.value);

  if (!anyOk) return json({ error: "delivery failed" }, 502);
  return json({ ok: true });
}

async function sendTelegram(env, text) {
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: "💭 " + text,
      }),
    }
  );
  return res.ok;
}

async function sendDiscord(env, text) {
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "💭 " + text,
      allowed_mentions: { parse: [] },
    }),
  });
  return res.ok;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
