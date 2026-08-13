/**
 * POST /api/webhooks/promotion
 *
 * Receives a webhook from Supa Claro / n8n to create/refresh a daily
 * promo code in the Moka system.
 *
 * Security: x-webhook-secret header must match PROMO_WEBHOOK_SECRET env var.
 * Uses Supabase REST API directly via fetch (no SDK) — works in Vercel ESM.
 */

const PROMO_WEBHOOK_SECRET = process.env.PROMO_WEBHOOK_SECRET;

// Use server-side keys if available, else fall back to VITE_ (anon key — RLS allows public write)
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. Verify Supabase config ─────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[promotion webhook] Missing Supabase config:", {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_KEY,
    });
    return res.status(500).json({ error: "Server misconfigured: missing Supabase credentials." });
  }

  // ── 2. Verify webhook secret ──────────────────────────────────────────────
  const incomingSecret = req.headers["x-webhook-secret"];
  if (!PROMO_WEBHOOK_SECRET || incomingSecret !== PROMO_WEBHOOK_SECRET) {
    console.warn("[promotion webhook] Unauthorized — invalid secret");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── 3. Parse & validate payload ───────────────────────────────────────────
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const {
    code,
    description,
    discount_type = "percent",
    discount_value = 100,
    min_order_value = 0,
    max_uses = 5,
    allowed_order_types = ["dine-in"],
    allowed_product_ids = ["k1","k2","ft1","ft8","ft9","ft10"],
    max_discount_value = 15000,
    valid_from_time = "07:00",
    valid_to_time = "12:00",
    valid_date,
    deactivate_prefix,
  } = body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'code' field." });
  }

  const normalizedCode = code.trim().toUpperCase();
  const supabaseHeaders = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // ── 4. Deactivate old promos with same prefix ─────────────────────────
    if (deactivate_prefix) {
      const prefix = deactivate_prefix.trim().toUpperCase();
      const deactivateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/anvat_promotions?code=ilike.${prefix}*&code=neq.${normalizedCode}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({ is_active: false }),
        }
      );
      if (!deactivateRes.ok) {
        console.warn("[promotion webhook] Deactivate warning:", await deactivateRes.text());
        // Non-fatal — continue with upsert
      } else {
        console.log(`[promotion webhook] Deactivated old '${prefix}*' promos`);
      }
    }

    // ── 5. Upsert new promo (merge-duplicates on code conflict) ──────────
    const promoRow = {
      code: normalizedCode,
      description: description || `Khuyến mãi ${valid_date || new Date().toLocaleDateString("vi-VN")}`,
      discount_type,
      discount_value,
      min_order_value,
      is_active: true,
      max_uses,
      uses_count: 0,
      allowed_order_types,
      allowed_product_ids: allowed_product_ids || null,
      max_discount_value: max_discount_value || null,
      valid_from_time: valid_from_time || null,
      valid_to_time: valid_to_time || null,
    };

    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/anvat_promotions`,
      {
        method: "POST",
        headers: {
          ...supabaseHeaders,
          "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(promoRow),
      }
    );

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error("[promotion webhook] Upsert failed:", errText);
      return res.status(500).json({ error: "Failed to save promotion: " + errText });
    }

    console.log(`[promotion webhook] ✅ ${normalizedCode} saved (max_uses: ${max_uses})`);
    return res.status(200).json({
      success: true,
      code: normalizedCode,
      max_uses,
      allowed_order_types,
    });

  } catch (err) {
    console.error("[promotion webhook] Unexpected error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}

