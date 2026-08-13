const WEBHOOK_URL = "https://auto.claro.vn/webhook/moka";

export default async function handler(req, res) {
  // Set CORS headers for local/production debugging
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    const status = response.status;
    const body = await response.text();

    res.status(status).send(body);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to forward webhook",
    });
  }
}
