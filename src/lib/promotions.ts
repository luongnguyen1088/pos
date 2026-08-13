import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export type PromotionType = "amount" | "percent";

export type Promotion = {
  code: string;
  description: string | null;
  discountType: PromotionType;
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
  /** Maximum total redemptions allowed. null = unlimited. */
  maxUses: number | null;
  /** Number of times this promo has been redeemed. */
  usesCount: number;
  /** Order types eligible for this promo. null = all types. */
  allowedOrderTypes: string[] | null;
  /** Specific product IDs allowed. null = all products. */
  allowedProductIds: string[] | null;
  /** Max discount amount (caps 100% promos). null = no cap. */
  maxDiscountValue: number | null;
  /** Start of valid time window. Format: "HH:MM" (24h). null = no restriction. */
  validFromTime: string | null;
  /** End of valid time window. Format: "HH:MM" (24h). null = no restriction. */
  validToTime: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PromotionRow = {
  code: string;
  description: string | null;
  discount_type: PromotionType;
  discount_value: number;
  min_order_value: number;
  is_active: boolean;
  max_uses: number | null;
  uses_count: number;
  allowed_order_types: string[] | null;
  allowed_product_ids: string[] | null;
  max_discount_value: number | null;
  valid_from_time: string | null;
  valid_to_time: string | null;
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "speedy-order-system:promotions";
const EVENT_NAME = "speedy-order-system:promotions-updated";
const CHANNEL_NAME = "speedy-order-system:promotions";

const normalizeRow = (row: PromotionRow): Promotion => ({
  code: row.code,
  description: row.description,
  discountType: row.discount_type,
  discountValue: Number(row.discount_value),
  minOrderValue: Number(row.min_order_value),
  isActive: row.is_active,
  maxUses: row.max_uses ?? null,
  usesCount: row.uses_count ?? 0,
  allowedOrderTypes: row.allowed_order_types ?? null,
  allowedProductIds: row.allowed_product_ids ?? null,
  maxDiscountValue: row.max_discount_value ?? null,
  validFromTime: row.valid_from_time ?? null,
  validToTime: row.valid_to_time ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (promo: Promotion): Omit<PromotionRow, "created_at" | "updated_at"> & { updated_at: string } => ({
  code: promo.code.trim().toUpperCase(),
  description: promo.description || null,
  discount_type: promo.discountType,
  discount_value: promo.discountValue,
  min_order_value: promo.minOrderValue,
  is_active: promo.isActive,
  max_uses: promo.maxUses ?? null,
  uses_count: promo.usesCount ?? 0,
  allowed_order_types: promo.allowedOrderTypes ?? null,
  allowed_product_ids: promo.allowedProductIds ?? null,
  max_discount_value: promo.maxDiscountValue ?? null,
  valid_from_time: promo.validFromTime ?? null,
  valid_to_time: promo.validToTime ?? null,
  updated_at: new Date().toISOString(),
});

let promoSnapshot: {
  promotions: Promotion[];
  isLoading: boolean;
  error: string | null;
} = {
  promotions: [],
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();
let channelInitialized = false;
let loadPromise: Promise<void> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const canUseDOM = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readLocalPromotions = (): Promotion[] => {
  if (!canUseDOM()) return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [
      {
        code: "MOKA20",
        description: "Giảm 20k cho đơn từ 200k",
        discountType: "amount",
        discountValue: 20000,
        minOrderValue: 200000,
        isActive: true,
      },
      {
        code: "MOKA10",
        description: "Giảm 10k cho đơn từ 100k",
        discountType: "amount",
        discountValue: 10000,
        minOrderValue: 100000,
        isActive: true,
      }
    ];
  } catch {
    return [];
  }
};

const writeLocalPromotions = (promos: Promotion[]) => {
  if (!canUseDOM()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(promos));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));

  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel ??= new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.postMessage({ type: "promotions-updated" });
  }
  notifyListeners();
};

const loadPromotionsFromSource = async (): Promise<Promotion[]> => {
  if (!supabase) {
    return readLocalPromotions();
  }

  const { data, error } = await supabase
    .from("anvat_promotions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeRow(row as PromotionRow));
};

const initializeRealtime = () => {
  if (!supabase || channelInitialized) return;
  channelInitialized = true;

  supabase
    .channel("promotions-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "anvat_promotions" },
      () => {
        void loadPromotions({ force: true, silent: true });
      }
    )
    .subscribe();
};

export const loadPromotions = async (options?: { force?: boolean; silent?: boolean }) => {
  if (loadPromise && !options?.force) return loadPromise;

  loadPromise = (async () => {
    if (!options?.silent) {
      promoSnapshot = { ...promoSnapshot, isLoading: true, error: null };
      notifyListeners();
    }

    try {
      const list = await loadPromotionsFromSource();
      promoSnapshot = { promotions: list, isLoading: false, error: null };
      notifyListeners();
      initializeRealtime();
    } catch (e) {
      promoSnapshot = {
        ...promoSnapshot,
        isLoading: false,
        error: e instanceof Error ? e.message : "Không thể tải khuyến mãi.",
      };
      notifyListeners();
    }
  })();

  return loadPromise;
};

const ensurePromotionsLoaded = () => {
  if (promoSnapshot.isLoading || promoSnapshot.promotions.length > 0 || promoSnapshot.error) return;
  void loadPromotions();
};

export const subscribePromotions = (listener: () => void) => {
  listeners.add(listener);

  if (canUseDOM()) {
    ensurePromotionsLoaded();

    const handleLocalChange = () => {
      if (!supabase) {
        promoSnapshot = { ...promoSnapshot, promotions: readLocalPromotions() };
        notifyListeners();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) handleLocalChange();
    };

    window.addEventListener(EVENT_NAME, handleLocalChange);
    window.addEventListener("storage", handleStorage);

    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel ??= new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.addEventListener("message", handleLocalChange);
    }

    return () => {
      listeners.delete(listener);
      window.removeEventListener(EVENT_NAME, handleLocalChange);
      window.removeEventListener("storage", handleStorage);
      if (broadcastChannel) broadcastChannel.removeEventListener("message", handleLocalChange);
    };
  }

  return () => {
    listeners.delete(listener);
  };
};

export const usePromotions = () =>
  useSyncExternalStore(subscribePromotions, () => promoSnapshot, () => promoSnapshot);

export const savePromotion = async (promo: Promotion): Promise<void> => {
  const rowData = toRow(promo);

  if (!supabase) {
    const list = readLocalPromotions();
    const idx = list.findIndex((p) => p.code === rowData.code);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...promo };
    } else {
      list.push(promo);
    }
    writeLocalPromotions(list);
    return;
  }

  const { error } = await supabase
    .from("anvat_promotions")
    .upsert(rowData);

  if (error) throw error;
  await loadPromotions({ force: true, silent: true });
};

export const deletePromotion = async (code: string): Promise<void> => {
  const normalizedCode = code.trim().toUpperCase();

  if (!supabase) {
    const list = readLocalPromotions();
    const filtered = list.filter((p) => p.code !== normalizedCode);
    writeLocalPromotions(filtered);
    return;
  }

  const { error } = await supabase
    .from("anvat_promotions")
    .delete()
    .eq("code", normalizedCode);

  if (error) throw error;
  await loadPromotions({ force: true, silent: true });
};

export const validatePromoCode = async (
  code: string,
  subtotal: number,
  orderType?: string,
  customerPhone?: string,
  cartProductIds?: string[],
): Promise<{ isValid: boolean; discountAmount: number; error?: string; promo?: Promotion }> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { isValid: false, discountAmount: 0, error: "Chưa nhập mã." };

  let promo: Promotion | null = null;
  if (!supabase) {
    const list = readLocalPromotions();
    promo = list.find((p) => p.code === normalized) || null;
  } else {
    const { data, error } = await supabase
      .from("anvat_promotions")
      .select("*")
      .eq("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      promo = normalizeRow(data as PromotionRow);
    }
  }

  if (!promo || !promo.isActive) {
    return { isValid: false, discountAmount: 0, error: "Mã giảm giá không tồn tại hoặc đã hết hạn." };
  }

  // ── Check usage limit ──────────────────────────────────────────────────────
  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return {
      isValid: false,
      discountAmount: 0,
      error: "Hết suất miễn phí hôm nay rồi! Hẹn bạn sáng mai nhé 😊",
      promo,
    };
  }

  // ── Check time window ─────────────────────────────────────────────────────
  if (promo.validFromTime || promo.validToTime) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;
    if (promo.validFromTime && currentTime < promo.validFromTime) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `Mã chỉ áp dụng từ ${promo.validFromTime} sáng. Quá sớm rồi, bạn ơi ☕`,
        promo,
      };
    }
    if (promo.validToTime && currentTime >= promo.validToTime) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `Mã chỉ áp dụng tới ${promo.validToTime}. Hẹn bạn sáng mai nhé! ☀️`,
        promo,
      };
    }
  }

  // ── Check phone required ──────────────────────────────────────────────────
  // (Required when there's a weekly phone limit or max_uses is set)
  if (promo.maxUses !== null && !customerPhone?.trim()) {
    return {
      isValid: false,
      discountAmount: 0,
      error: "Vui lòng nhập số điện thoại để áp dụng mã này.",
      promo,
    };
  }

  // ── Check allowed order types ─────────────────────────────────────────────
  if (orderType && promo.allowedOrderTypes !== null && promo.allowedOrderTypes.length > 0) {
    if (!promo.allowedOrderTypes.includes(orderType)) {
      const orderTypeLabels: Record<string, string> = {
        "dine-in": "Ăn tại chỗ",
        takeaway: "Mang đi",
        delivery: "Giao hàng",
      };
      const allowed = promo.allowedOrderTypes
        .map((t) => orderTypeLabels[t] ?? t)
        .join(", ");
      return {
        isValid: false,
        discountAmount: 0,
        error: `Mã này chỉ áp dụng cho: ${allowed}.`,
        promo,
      };
    }
  }

  // ── Check weekly per-phone limit ──────────────────────────────────────────
  // If promo has max_uses (limited campaign), check this phone hasn't used
  // any promo with the same prefix in the current ISO week (Mon–Sun).
  if (customerPhone?.trim() && promo.maxUses !== null && supabase) {
    const phone = customerPhone.trim();
    // Get Monday 00:00:00 of current week (in local time, stored as UTC)
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1, Sun=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Extract prefix from code (e.g. "MOKA" from "MOKA8246")
    const prefix = normalized.match(/^[A-Z]+/)?.[0] ?? normalized;

    const { data: existingOrders } = await supabase
      .from("anvat_orders")
      .select("id")
      .eq("customer_phone", phone)
      .ilike("promo_code", `${prefix}%`)
      .gte("created_at", monday.toISOString())
      .limit(1);

    if (existingOrders && existingOrders.length > 0) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "Số điện thoại này đã sử dụng khuyến mãi tuần này rồi! Hẹn tuần sau nhé 😉",
        promo,
      };
    }
  }

  // ── Check allowed products ──────────────────────────────────────────────
  if (cartProductIds && cartProductIds.length > 0 && promo.allowedProductIds !== null) {
    const disallowed = cartProductIds.filter(id => !promo.allowedProductIds!.includes(id));
    if (disallowed.length > 0) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "Mã này chỉ áp dụng cho: Kem ốc quế hoặc Trà chanh các loại.",
        promo,
      };
    }
  }

  // ── Check minimum order value ─────────────────────────────────────────────
  if (subtotal < promo.minOrderValue) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `Đơn hàng tối thiểu để áp dụng mã này là ${new Intl.NumberFormat("vi-VN").format(promo.minOrderValue)}đ.`,
      promo,
    };
  }

  let amount = 0;
  if (promo.discountType === "amount") {
    amount = promo.discountValue;
  } else {
    amount = Math.round((subtotal * promo.discountValue) / 100);
  }

  // Cap by maxDiscountValue if set
  if (promo.maxDiscountValue !== null) {
    amount = Math.min(amount, promo.maxDiscountValue);
  }

  // Tiền giảm giá không vượt quá giá trị đơn hàng
  amount = Math.min(amount, subtotal);

  return {
    isValid: true,
    discountAmount: amount,
    promo,
  };
};

/**
 * Increments the uses_count of a promo code by 1 after a successful order.
 * Should be called once per successful order submission.
 */
export const incrementPromoUsage = async (code: string): Promise<void> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;

  if (!supabase) {
    // Local mode: update in localStorage
    const list = readLocalPromotions();
    const idx = list.findIndex((p) => p.code === normalized);
    if (idx !== -1) {
      list[idx] = { ...list[idx], usesCount: (list[idx].usesCount ?? 0) + 1 };
      writeLocalPromotions(list);
    }
    return;
  }

  // Use raw SQL increment to avoid race conditions
  const { error } = await supabase
    .from("anvat_promotions")
    .update({ uses_count: (await supabase
      .from("anvat_promotions")
      .select("uses_count")
      .eq("code", normalized)
      .single()
      .then(({ data }) => (data?.uses_count ?? 0) + 1)
    )})
    .eq("code", normalized);

  if (error) {
    console.warn(`[promotions] Failed to increment usage for ${normalized}:`, error.message);
  }
};
