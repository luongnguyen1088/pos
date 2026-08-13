import { createClient } from "@supabase/supabase-js";

const ORDER_TABLE = "anvat_orders";
const WEBHOOK_SECRET_HEADER = "x-webhook-secret";

const normalizeOrderNumber = (value) => String(value ?? "").replace(/\D/g, "");

const parsePayload = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body;
};

const normalizeItems = (payload) => {
  const items = Array.isArray(payload) ? payload : [payload];

  return items.map((item) => ({
    order: normalizeOrderNumber(item?.order),
    transactionAmount: Number(item?.transactionAmount ?? 0),
  }));
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const isMissingKitchenReleaseColumnError = (error) => {
  const message = typeof error?.message === "string" ? error.message : "";
  const details = typeof error?.details === "string" ? error.details : "";
  const hint = typeof error?.hint === "string" ? error.hint : "";
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  return combined.includes("kitchen_release_status");
};

const findMatchingOrder = async (supabaseAdmin, normalizedOrder) => {
  const { data, error } = await supabaseAdmin
    .from(ORDER_TABLE)
    .select("id, number, total, payment_status")
    .ilike("number", `%${normalizedOrder}`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []).find((order) => normalizeOrderNumber(order.number) === normalizedOrder) ?? null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  const providedSecret = req.headers[WEBHOOK_SECRET_HEADER];

  if (expectedSecret && providedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  let payload;
  try {
    payload = parsePayload(req.body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const items = normalizeItems(payload);
  if (items.length === 0) {
    return res.status(400).json({ error: "Payload is empty" });
  }

  const invalidItem = items.find(
    (item) => item.order.length === 0 || !Number.isFinite(item.transactionAmount) || item.transactionAmount <= 0,
  );
  if (invalidItem) {
    return res.status(400).json({ error: "Each item must include order and transactionAmount" });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const results = [];

    for (const item of items) {
      const matchedOrder = await findMatchingOrder(supabaseAdmin, item.order);

      if (!matchedOrder) {
        results.push({
          order: item.order,
          transactionAmount: item.transactionAmount,
          status: "not_found",
        });
        continue;
      }

      if (Number(matchedOrder.total) !== item.transactionAmount) {
        results.push({
          order: item.order,
          transactionAmount: item.transactionAmount,
          status: "amount_mismatch",
          matchedOrderNumber: matchedOrder.number,
          matchedOrderTotal: Number(matchedOrder.total),
        });
        continue;
      }

      if (matchedOrder.payment_status === "paid") {
        results.push({
          order: item.order,
          transactionAmount: item.transactionAmount,
          status: "already_paid",
          matchedOrderId: matchedOrder.id,
          matchedOrderNumber: matchedOrder.number,
        });
        continue;
      }

      let { error } = await supabaseAdmin
        .from(ORDER_TABLE)
        .update({
          payment_status: "paid",
          kitchen_release_status: "released",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchedOrder.id);

      if (error && isMissingKitchenReleaseColumnError(error)) {
        ({ error } = await supabaseAdmin
          .from(ORDER_TABLE)
          .update({
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedOrder.id));
      }

      if (error) {
        throw error;
      }

      results.push({
        order: item.order,
        transactionAmount: item.transactionAmount,
        status: "paid",
        matchedOrderId: matchedOrder.id,
        matchedOrderNumber: matchedOrder.number,
      });
    }

    const successCount = results.filter(
      (item) => item.status === "paid" || item.status === "already_paid",
    ).length;
    const hasFailures = results.some(
      (item) => item.status !== "paid" && item.status !== "already_paid",
    );

    return res.status(hasFailures ? 207 : 200).json({
      ok: !hasFailures,
      processed: results.length,
      succeeded: successCount,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected webhook error",
    });
  }
}
