import { brand } from "@/lib/brand";

const WEBHOOK_URL = "https://auto.claro.vn/webhook/moka";

export type WebhookEvent =
  | "order.created"
  | "order.updated"
  | "order.cancelled"
  | "inventory.adjusted"
  | "daily_report.generated";

function getWebhookUrl(): string {
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return `${window.location.origin}/api/webhooks/dispatch`;
  }
  return WEBHOOK_URL;
}

let statsGetter: (() => { todayRevenue: number; todayOrderCount: number; todayItemCount: number }) | null = null;

export function registerStatsGetter(getter: () => { todayRevenue: number; todayOrderCount: number; todayItemCount: number }) {
  statsGetter = getter;
}

export async function sendWebhook(event: WebhookEvent, payload: any) {
  try {
    // Skip sending webhook events for sample/mock orders
    if (
      payload &&
      typeof payload === "object" &&
      "id" in payload &&
      typeof payload.id === "string" &&
      payload.id.startsWith("sample-order-")
    ) {
      console.log(`[Webhook] Skipped sending '${event}' webhook for sample order: ${payload.id}`);
      return;
    }

    const targetUrl = getWebhookUrl();
    const stats = statsGetter ? statsGetter() : null;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        store: brand.name,
        todayRevenue: stats?.todayRevenue,
        todayOrderCount: stats?.todayOrderCount,
        todayItemCount: stats?.todayItemCount,
        data: payload,
      }),
      keepalive: true, // Crucial for background fetches on browser tab close/navigation
    });
    if (!response.ok) {
      console.warn(`Webhook ${event} sent to ${targetUrl}, but server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to dispatch webhook ${event}:`, error);
  }
}
