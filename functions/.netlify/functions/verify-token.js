
const APP_ID = "2062402735";
const VERIFY_URL =
  "https://api.salla.dev/exchange-authority/v1/verify";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function onRequestGet() {
  return json({
    success: false,
    error: "Method not allowed"
  }, 405);
}

export async function onRequestPost({ request }) {
  const url = new URL(request.url);

  if (request.headers.get("Origin") !== url.origin) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  if (!(request.headers.get("Content-Type") || "")
      .toLowerCase().startsWith("application/json")) {
    return json({ success: false, error: "JSON required" }, 415);
  }

  try {
    const raw = await request.text();

    if (raw.length > 20000) {
      return json({ success: false, error: "Request too large" }, 413);
    }

    const body = JSON.parse(raw);
    const token = body?.token;
    const appId = String(body?.appId || "");

    if (
      typeof token !== "string" ||
      token.length < 16 ||
      token.length > 16384 ||
      !/^[A-Za-z0-9._-]+$/.test(token) ||
      appId !== APP_ID
    ) {
      return json({ success: false, error: "Invalid request" }, 400);
    }

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "S-Source": APP_ID,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        token,
        iss: "merchant-dashboard",
        subject: "embedded-page",
        env: "prod"
      }),
      signal: AbortSignal.timeout(10000)
    });

    const result = await response.json();

    return json(result, response.status);

  } catch {
    return json({
      success: false,
      error: "Verification service unavailable"
    }, 502);
  }
}
