import { useSyncExternalStore } from "react";
import { products, type CartItem, type OrderType } from "@/data/products";
import { type DiscountType } from "@/lib/discounts";
import { deductInventoryForOrder, refundInventoryForOrder } from "@/lib/inventory";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { sendWebhook, registerStatsGetter } from "@/lib/webhooks";

const ORDER_TABLE = "anvat_orders";

export type KitchenOrderStatus = "new" | "preparing" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid";
export type KitchenReleaseStatus = "hold" | "released";

export type Customer = {
  phone: string;
  name: string | null;
  points: number;
  createdAt: string;
  updatedAt: string;
};

export type PointHistory = {
  id: string;
  customerPhone: string;
  orderId: string | null;
  pointsChange: number;
  reason: string;
  createdAt: string;
};

export type KitchenOrderItem = {
  id: string;
  productId: string;
  image: string;
  name: string;
  quantity: number;
  variantName?: string;
  options: string[];
  note: string;
  totalPrice: number;
  unitPrice?: number;
  optionsDetail?: Array<{ name: string; price: number }>;
};

export type KitchenOrder = {
  id: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  status: KitchenOrderStatus;
  paymentStatus: PaymentStatus;
  kitchenReleaseStatus: KitchenReleaseStatus;
  orderType: OrderType;
  orderInfo: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  discountType: DiscountType | null;
  discountValue: number;
  total: number;
  itemCount: number;
  items: KitchenOrderItem[];
  customerPhone?: string | null;
  earnedPoints?: number;
  spentPoints?: number;
  customerName?: string | null;
  deliveryAddress?: string | null;
  customerNote?: string | null;
  orderSource?: 'pos' | 'kiosk';
  promoCode?: string | null;
};

type OrderRow = {
  id: string;
  number: string;
  created_at: string;
  updated_at: string;
  status: KitchenOrderStatus;
  payment_status?: PaymentStatus;
  kitchen_release_status?: KitchenReleaseStatus;
  order_type: OrderType;
  order_info: string;
  payment_method: string;
  subtotal?: number;
  discount_amount?: number;
  discount_type?: DiscountType | null;
  discount_value?: number;
  total: number;
  item_count: number;
  items: KitchenOrderItem[];
  customer_phone?: string | null;
  earned_points?: number;
  spent_points?: number;
  customer_name?: string | null;
  delivery_address?: string | null;
  customer_note?: string | null;
  order_source?: string;
  promo_code?: string | null;
};

type OrdersSnapshot = {
  orders: KitchenOrder[];
  isLoading: boolean;
  error: string | null;
};

type CreateKitchenOrderInput = {
  items: CartItem[];
  subtotal: number;
  total: number;
  orderType: OrderType;
  orderInfo: string;
  paymentMethod: string;
  paymentStatus?: PaymentStatus;
  kitchenReleaseStatus?: KitchenReleaseStatus;
  discountAmount: number;
  discountType: DiscountType | null;
  discountValue: number;
  customerPhone?: string | null;
  customerName?: string | null;
  spentPoints?: number;
  deliveryAddress?: string | null;
  customerNote?: string | null;
  orderSource?: 'pos' | 'kiosk';
  promoCode?: string | null;
};

type CreateKitchenOrderResult = {
  order: KitchenOrder;
  lowStockIngredients: { id: string; name: string; stockQuantity: number; lowStockThreshold: number; unit: string }[];
  inventoryError: string | null;
};

type SampleItemSelection = {
  productId: string;
  quantity: number;
  variantId?: string;
  optionChoiceIds?: string[];
  note?: string;
};

type SampleOrderTemplate = {
  orderType: OrderType;
  paymentMethod: string;
  items: SampleItemSelection[];
};

const STORAGE_KEY = "speedy-order-system:kitchen-orders";
const EVENT_NAME = "speedy-order-system:kitchen-orders-updated";
const CHANNEL_NAME = "speedy-order-system:kitchen-orders";
const releaseStatusOrder: Record<KitchenReleaseStatus, number> = {
  hold: 0,
  released: 1,
};

const statusOrder: Record<KitchenOrderStatus, number> = {
  new: 0,
  preparing: 1,
  completed: 2,
};

const sortOrders = (orders: KitchenOrder[]) =>
  [...orders].sort((left, right) => {
    const byRelease = releaseStatusOrder[left.kitchenReleaseStatus] - releaseStatusOrder[right.kitchenReleaseStatus];
    if (byRelease !== 0) {
      return byRelease;
    }

    const byStatus = statusOrder[left.status] - statusOrder[right.status];
    if (byStatus !== 0) {
      return byStatus;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

const createSampleOrderDate = (daysAgo: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const shiftIsoMinutes = (iso: string, minutes: number) => {
  const next = new Date(iso);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
};

const productMap = new Map(products.map((product) => [product.id, product]));

const hoursBySlot = [8, 9, 10, 11, 13, 15, 17];
const minutesBySlot = [12, 28, 45, 5, 18, 32, 48];
const deliveryCustomers = [
  "Anh Minh - 0909000111",
  "Chi Linh - 0909000222",
  "Ban Ngoc - 0909000333",
  "Anh Tuan - 0909000444",
  "Chi Vy - 0909000555",
  "Ban Khoa - 0909000666",
];
const takeawayInfos = [
  "Mang đi",
  "Khách tới lấy",
  "Pickup 10 phút",
  "Mang đi nhiều đá",
];

const sampleOrderTemplates: SampleOrderTemplate[] = [
  {
    orderType: "dine-in",
    paymentMethod: "Tiền mặt",
    items: [
      { productId: "ft1", quantity: 1, optionChoiceIds: ["sugar-50", "ice-less"] },
      { productId: "k1", quantity: 1 },
    ],
  },
  {
    orderType: "takeaway",
    paymentMethod: "QR Code",
    items: [
      { productId: "mt1", quantity: 1, optionChoiceIds: ["sugar-70", "ice-normal", "top-tran-chau"] },
      { productId: "n5", quantity: 1 },
    ],
  },
  {
    orderType: "delivery",
    paymentMethod: "Thẻ",
    items: [
      { productId: "ft2", quantity: 1, optionChoiceIds: ["sugar-30", "ice-less"] },
      { productId: "k6", quantity: 1 },
    ],
  },
  {
    orderType: "dine-in",
    paymentMethod: "QR Code",
    items: [
      { productId: "n2", quantity: 1, optionChoiceIds: ["spicy-2"] },
      { productId: "ft1", quantity: 1, optionChoiceIds: ["sugar-50", "ice-normal"] },
    ],
  },
  {
    orderType: "takeaway",
    paymentMethod: "Tiền mặt",
    items: [
      { productId: "mt9", quantity: 1, optionChoiceIds: ["sugar-70", "ice-less", "top-tran-chau"] },
      { productId: "n5", quantity: 1 },
      { productId: "k1", quantity: 1 },
    ],
  },
  {
    orderType: "delivery",
    paymentMethod: "QR Code",
    items: [
      { productId: "n4", quantity: 1, optionChoiceIds: ["spicy-3"] },
      { productId: "ft3", quantity: 1, optionChoiceIds: ["sugar-50", "ice-less"] },
    ],
  },
  {
    orderType: "dine-in",
    paymentMethod: "QR Code",
    items: [
      { productId: "mt12", quantity: 1, optionChoiceIds: ["sugar-50", "ice-less"] },
      { productId: "k5", quantity: 1 },
    ],
  },
  {
    orderType: "takeaway",
    paymentMethod: "Thẻ",
    items: [
      { productId: "cf2", quantity: 1, optionChoiceIds: ["sugar-70", "ice-less"] },
      { productId: "n7", quantity: 1 },
    ],
  },
  {
    orderType: "delivery",
    paymentMethod: "QR Code",
    items: [
      { productId: "n4", quantity: 1, optionChoiceIds: ["spicy-1"] },
      { productId: "ft4", quantity: 1, optionChoiceIds: ["sugar-50", "ice-normal"] },
    ],
  },
  {
    orderType: "dine-in",
    paymentMethod: "Tiền mặt",
    items: [
      { productId: "n3", quantity: 1, optionChoiceIds: ["spicy-2"] },
      { productId: "k1", quantity: 1 },
    ],
  },
  {
    orderType: "takeaway",
    paymentMethod: "QR Code",
    items: [
      { productId: "k5", quantity: 1 },
      { productId: "ft1", quantity: 1, optionChoiceIds: ["sugar-30", "ice-less"] },
    ],
  },
  {
    orderType: "delivery",
    paymentMethod: "Thẻ",
    items: [
      { productId: "mt11", quantity: 1, optionChoiceIds: ["sugar-50", "ice-less"] },
      { productId: "n7", quantity: 1 },
      { productId: "k6", quantity: 1 },
    ],
  },
  {
    orderType: "dine-in",
    paymentMethod: "QR Code",
    items: [
      { productId: "n4", quantity: 1, optionChoiceIds: ["spicy-1"] },
      { productId: "ft2", quantity: 1, optionChoiceIds: ["sugar-50", "ice-normal"] },
    ],
  },
  {
    orderType: "takeaway",
    paymentMethod: "Tiền mặt",
    items: [
      { productId: "mt1", quantity: 2, optionChoiceIds: ["sugar-50", "ice-less", "top-tran-chau"] },
      { productId: "n5", quantity: 1 },
    ],
  },
  {
    orderType: "delivery",
    paymentMethod: "QR Code",
    items: [
      { productId: "n1", quantity: 1, optionChoiceIds: ["spicy-2"] },
      { productId: "ft9", quantity: 1 },
      { productId: "k1", quantity: 1 },
    ],
  },
  {
    orderType: "dine-in",
    paymentMethod: "Thẻ",
    items: [
      { productId: "mt3", quantity: 1, optionChoiceIds: ["sugar-50", "ice-less", "top-pudding"] },
      { productId: "k7", quantity: 1 },
    ],
  },
];

const getProductOrThrow = (productId: string) => {
  const product = productMap.get(productId);
  if (!product) {
    throw new Error(`Missing sample product ${productId}`);
  }
  return product;
};

const resolveOptionChoice = (productId: string, choiceId: string) => {
  const product = getProductOrThrow(productId);
  for (const option of product.options ?? []) {
    const choice = option.choices.find((item) => item.id === choiceId);
    if (choice) {
      return choice;
    }
  }
  return null;
};

const buildSampleItem = (id: string, selection: SampleItemSelection): KitchenOrderItem => {
  const product = getProductOrThrow(selection.productId);
  const variant = product.variants?.find((item) => item.id === selection.variantId);
  const choices = (selection.optionChoiceIds ?? [])
    .map((choiceId) => resolveOptionChoice(selection.productId, choiceId))
    .filter((choice): choice is NonNullable<typeof choice> => Boolean(choice));

  const unitPrice =
    product.price +
    (variant?.priceAdd ?? 0) +
    choices.reduce((sum, choice) => sum + choice.priceAdd, 0);

  return {
    id,
    productId: selection.productId,
    image: product.image,
    name: product.name,
    quantity: selection.quantity,
    totalPrice: unitPrice * selection.quantity,
    variantName: variant?.name,
    options: choices.map((choice) => choice.name),
    note: selection.note ?? "",
  };
};

const getSampleStatus = (daysAgo: number, slot: number, orderCountForDay: number): KitchenOrderStatus => {
  if (daysAgo === 0 && slot === orderCountForDay - 1) {
    return "new";
  }

  if (daysAgo === 0 && slot === orderCountForDay - 2) {
    return "preparing";
  }

  return "completed";
};

const getSampleOrderInfo = (orderType: OrderType, daysAgo: number, slot: number) => {
  if (orderType === "dine-in") {
    return `Bàn ${((daysAgo * 3 + slot) % 12) + 1}`;
  }

  if (orderType === "delivery") {
    return deliveryCustomers[(daysAgo + slot) % deliveryCustomers.length];
  }

  return takeawayInfos[(daysAgo + slot) % takeawayInfos.length];
};

const getSampleUpdatedAt = (createdAt: string, status: KitchenOrderStatus, slot: number) => {
  if (status === "completed") {
    return shiftIsoMinutes(createdAt, 10 + (slot % 3) * 6);
  }

  if (status === "preparing") {
    return shiftIsoMinutes(createdAt, 4);
  }

  return shiftIsoMinutes(createdAt, 1);
};

const buildSampleOrder = (
  orderIndex: number,
  daysAgo: number,
  slot: number,
  orderCountForDay: number,
  template: SampleOrderTemplate,
): KitchenOrder => {
  const createdAt = createSampleOrderDate(
    daysAgo,
    hoursBySlot[slot % hoursBySlot.length],
    (minutesBySlot[slot % minutesBySlot.length] + daysAgo * 7) % 60,
  );
  const status = getSampleStatus(daysAgo, slot, orderCountForDay);
  const items = template.items.map((item, itemIndex) =>
    buildSampleItem(`sample-item-${orderIndex}-${itemIndex + 1}`, item),
  );
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: `sample-order-${orderIndex}`,
    number: `#${String(240000 + orderIndex).padStart(6, "0")}`,
    createdAt,
    updatedAt: getSampleUpdatedAt(createdAt, status, slot),
    status,
    paymentStatus: "paid",
    kitchenReleaseStatus: "released",
    orderType: template.orderType,
    orderInfo: getSampleOrderInfo(template.orderType, daysAgo, slot),
    paymentMethod: template.paymentMethod,
    subtotal: total,
    discountAmount: 0,
    discountType: null,
    discountValue: 0,
    total,
    itemCount,
    items,
  };
};

const getOrderCountForDay = (daysAgo: number) => 4 + (daysAgo % 3) + (daysAgo % 5 === 0 ? 1 : 0);

const createDefaultOrders = () => {
  const nextOrders: KitchenOrder[] = [];
  let orderIndex = 1;

  for (let daysAgo = 27; daysAgo >= 0; daysAgo -= 1) {
    const orderCountForDay = getOrderCountForDay(daysAgo);

    for (let slot = 0; slot < orderCountForDay; slot += 1) {
      const template =
        sampleOrderTemplates[(daysAgo * 5 + slot * 3) % sampleOrderTemplates.length];
      nextOrders.push(buildSampleOrder(orderIndex, daysAgo, slot, orderCountForDay, template));
      orderIndex += 1;
    }
  }

  return sortOrders(nextOrders);
};

const defaultOrders: KitchenOrder[] = createDefaultOrders();

const shouldRefreshSampleOrders = (orders: Array<{ id: string }>) =>
  orders.length > 0 && orders.length < 20 && orders.every((order) => order.id.startsWith("sample-order-"));

let broadcastChannel: BroadcastChannel | null = null;
let ordersSnapshot: OrdersSnapshot = {
  orders: defaultOrders,
  isLoading: isSupabaseConfigured,
  error: null,
};
let loadPromise: Promise<void> | null = null;
let ordersChannelInitialized = false;

const listeners = new Set<() => void>();

const canUseDOM = () => typeof window !== "undefined";

const notifyListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

const createOrderNumber = () => `#${String(Date.now()).slice(-8)}`;

const resolveKitchenReleaseStatus = (
  paymentStatus?: PaymentStatus,
  kitchenReleaseStatus?: KitchenReleaseStatus,
): KitchenReleaseStatus => kitchenReleaseStatus ?? "released";

const isMissingKitchenReleaseColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const details = "details" in error && typeof error.details === "string" ? error.details : "";
  const hint = "hint" in error && typeof error.hint === "string" ? error.hint : "";
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  return combined.includes("kitchen_release_status");
};

const toLegacyOrderRow = (order: KitchenOrder & { paymentStatus?: string }) => {
  const { kitchen_release_status, ...legacyRow } = toOrderRow(order);
  return legacyRow;
};

const normalizeStoredOrder = (order: KitchenOrder): KitchenOrder => ({
  ...order,
  paymentStatus: order.paymentStatus ?? "paid",
  kitchenReleaseStatus: resolveKitchenReleaseStatus(order.paymentStatus, order.kitchenReleaseStatus),
  subtotal: Number(order.subtotal ?? order.total ?? 0),
  discountAmount: Number(order.discountAmount ?? 0),
  discountType: order.discountType ?? null,
  discountValue: Number(order.discountValue ?? 0),
});

const readLocalOrders = (): KitchenOrder[] => {
  if (!canUseDOM()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultOrders;
    }

    const parsed = JSON.parse(raw) as KitchenOrder[];
    if (Array.isArray(parsed) && shouldRefreshSampleOrders(parsed)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultOrders));
      return defaultOrders;
    }
    return Array.isArray(parsed) && parsed.length > 0
      ? sortOrders(parsed.map((order) => normalizeStoredOrder(order)))
      : defaultOrders;
  } catch {
    return defaultOrders;
  }
};

const seedOrdersFromDefaults = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from(ORDER_TABLE)
    .upsert(defaultOrders.map(toOrderRow), { onConflict: "id" });
  if (error) {
    throw error;
  }
};

const writeLocalOrders = (orders: KitchenOrder[]) => {
  if (!canUseDOM()) {
    return;
  }

  const nextOrders = sortOrders(orders);
  ordersSnapshot = {
    ...ordersSnapshot,
    orders: nextOrders,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOrders));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));

  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel ??= new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.postMessage({ type: "orders-updated" });
  }

  notifyListeners();
};

const normalizeOrderRow = (row: OrderRow): KitchenOrder & { paymentStatus: string } => ({
  id: row.id,
  number: row.number,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  status: row.status,
  paymentStatus: row.payment_status || "pending",
  kitchenReleaseStatus: resolveKitchenReleaseStatus(row.payment_status, row.kitchen_release_status),
  orderType: row.order_type,
  orderInfo: row.order_info,
  paymentMethod: row.payment_method,
  subtotal: Number(row.subtotal ?? row.total ?? 0),
  discountAmount: Number(row.discount_amount ?? 0),
  discountType: row.discount_type ?? null,
  discountValue: Number(row.discount_value ?? 0),
  total: Number(row.total),
  itemCount: Number(row.item_count),
  items: Array.isArray(row.items)
    ? row.items.map((item) => ({
        productId: "",
        ...item,
      }))
    : [],
  customerPhone: row.customer_phone,
  earnedPoints: row.earned_points,
  spentPoints: row.spent_points,
  customerName: row.customer_name,
  deliveryAddress: row.delivery_address,
  customerNote: row.customer_note,
  orderSource: (row.order_source as 'pos' | 'kiosk') || 'pos',
  promoCode: row.promo_code ?? null,
});

const toOrderRow = (order: KitchenOrder & { paymentStatus?: string }): OrderRow => ({
  id: order.id,
  number: order.number,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
  status: order.status,
  payment_status: order.paymentStatus || "pending",
  kitchen_release_status: resolveKitchenReleaseStatus(order.paymentStatus, order.kitchenReleaseStatus),
  order_type: order.orderType,
  order_info: order.orderInfo,
  payment_method: order.paymentMethod,
  subtotal: order.subtotal,
  discount_amount: order.discountAmount,
  discount_type: order.discountType,
  discount_value: order.discountValue,
  total: order.total,
  item_count: order.itemCount,
  items: order.items,
  customer_phone: order.customerPhone,
  earned_points: order.earnedPoints,
  spent_points: order.spentPoints,
  customer_name: order.customerName,
  delivery_address: order.deliveryAddress,
  customer_note: order.customerNote,
  order_source: order.orderSource || 'pos',
  promo_code: order.promoCode ?? null,
});

const loadOrdersFromSource = async () => {
  if (!supabase) {
    return readLocalOrders();
  }

  // Optimize: Load orders from the 1st of last month (capped at 5000 orders) to support full report analysis of this month & last month
  const filterDate = new Date();
  filterDate.setMonth(filterDate.getMonth() - 1);
  filterDate.setDate(1);
  filterDate.setHours(0, 0, 0, 0);
  const filterDateISO = filterDate.toISOString();

  const { data, error } = await supabase
    .from(ORDER_TABLE)
    .select("*")
    .gte("created_at", filterDateISO)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw error;
  }

  /* 
  if ((data?.length ?? 0) === 0) {
    await seedOrdersFromDefaults();
    return loadOrdersFromSource();
  }

  if (shouldRefreshSampleOrders((data ?? []) as Array<{ id: string }>)) {
    await seedOrdersFromDefaults();
    return loadOrdersFromSource();
  }
  */

  return (data ?? []).map((row) => normalizeOrderRow(row as OrderRow));
};

const initializeOrdersRealtime = () => {
  if (!supabase || ordersChannelInitialized) {
    return;
  }

  ordersChannelInitialized = true;

  supabase
    .channel("orders-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: ORDER_TABLE },
      () => {
        void loadKitchenOrders({ force: true, silent: true });
      },
    )
    .subscribe();
};

const loadKitchenOrders = async (options?: { force?: boolean; silent?: boolean }) => {
  if (loadPromise && !options?.force) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!options?.silent) {
      ordersSnapshot = {
        ...ordersSnapshot,
        isLoading: true,
        error: null,
      };
      notifyListeners();
    }

    try {
      const nextOrders = await loadOrdersFromSource();
      ordersSnapshot = {
        orders: sortOrders(nextOrders),
        isLoading: false,
        error: null,
      };
      notifyListeners();
      initializeOrdersRealtime();
    } catch (error) {
      ordersSnapshot = {
        orders: readLocalOrders(),
        isLoading: false,
        error: error instanceof Error ? error.message : "Không thể tải đơn hàng.",
      };
      notifyListeners();
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

const ensureKitchenOrdersLoaded = () => {
  void loadKitchenOrders();
};

export const formatOrderPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export const getOrderTypeLabel = (orderType: OrderType, orderInfo: string) => {
  if (orderType === "dine-in") {
    return orderInfo || "Tại chỗ";
  }

  if (orderType === "delivery") {
    return orderInfo || "Giao hàng";
  }

  return orderInfo || "Mang đi";
};

export const getKitchenStatusMeta = (status: KitchenOrderStatus) => {
  if (status === "new") {
    return {
      label: "Mới",
      className: "bg-warning/15 text-warning border-warning/30",
    };
  }

  if (status === "preparing") {
    return {
      label: "Đang làm",
      className: "bg-primary/10 text-primary border-primary/20",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      className: "bg-destructive/15 text-destructive border-destructive/25",
    };
  }

  return {
    label: "Hoàn thành",
    className: "bg-success/15 text-success border-success/25",
  };
};

export const isKitchenOrderReleased = (
  order: Pick<KitchenOrder, "paymentStatus" | "kitchenReleaseStatus">,
) => resolveKitchenReleaseStatus(order.paymentStatus, order.kitchenReleaseStatus) === "released";

export const getKitchenReleaseMeta = (status: KitchenReleaseStatus) => {
  if (status === "released") {
    return {
      label: "Đã nhả bếp",
      className: "border-success/20 bg-success/10 text-success",
    };
  }

  return {
    label: "Giữ ngoài bếp",
    className: "border-warning/30 bg-warning/15 text-warning",
  };
};

export const listKitchenOrders = () => ordersSnapshot.orders;

export const createKitchenOrder = async ({
  items,
  subtotal,
  total,
  orderType,
  orderInfo,
  paymentMethod,
  paymentStatus = "pending",
  kitchenReleaseStatus,
  discountAmount,
  discountType,
  discountValue,
  customerPhone,
  customerName,
  spentPoints,
  deliveryAddress,
  customerNote,
  orderSource = 'pos',
  promoCode,
}: CreateKitchenOrderInput): Promise<CreateKitchenOrderResult> => {
  const now = new Date().toISOString();
  const earnedPoints = Math.floor(total / 20000) * 1000;
  const spentPointsVal = spentPoints || 0;

  const order: KitchenOrder & { paymentStatus: string } = {
    id: crypto.randomUUID(),
    number: createOrderNumber(),
    createdAt: now,
    updatedAt: now,
    status: paymentStatus === "paid" ? "completed" : "new",
    paymentStatus,
    kitchenReleaseStatus: resolveKitchenReleaseStatus(paymentStatus, kitchenReleaseStatus),
    orderType,
    orderInfo,
    paymentMethod,
    subtotal,
    discountAmount,
    discountType,
    discountValue,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items: items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      image: item.product.image,
      name: item.product.name,
      quantity: item.quantity,
      variantName: item.variant?.name,
      options: item.selectedOptions.map((option) => option.name),
      note: item.note,
      totalPrice: item.totalPrice,
      unitPrice: item.totalPrice / item.quantity,
      optionsDetail: item.selectedOptions.map((option) => ({
        name: option.name,
        price: option.price || 0,
      })),
    })),
    customerPhone: customerPhone || null,
    earnedPoints,
    spentPoints: spentPointsVal,
    customerName: customerName || null,
    deliveryAddress: deliveryAddress || null,
    customerNote: customerNote || null,
    orderSource,
    promoCode: promoCode || null,
  };

  // Parallel loyalty handler
  const runLoyaltyTasks = async () => {
    if (!customerPhone) return;
    await upsertCustomer(customerPhone, customerName || undefined, earnedPoints - spentPointsVal);
    const logPromises = [
      logPointTransaction(customerPhone, earnedPoints, `Tích điểm đơn hàng ${order.number}`, order.id)
    ];
    if (spentPointsVal > 0) {
      logPromises.push(
        logPointTransaction(customerPhone, -spentPointsVal, `Tiêu điểm đơn hàng ${order.number}`, order.id)
      );
    }
    await Promise.all(logPromises);
  };

  if (!supabase) {
    writeLocalOrders([order, ...ordersSnapshot.orders]);
    void sendWebhook("order.created", order);
    
    const [_, inventoryResult] = await Promise.all([
      runLoyaltyTasks().catch(e => console.error("Lỗi cập nhật tích điểm thành viên:", e)),
      deductInventoryForOrder(
        order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      ).catch(error => ({ lowStockIngredients: [], error: error instanceof Error ? error.message : String(error) }))
    ]);

    const inventoryError = "error" in inventoryResult ? (inventoryResult as any).error : null;
    const lowStockIngredients = "lowStockIngredients" in inventoryResult ? (inventoryResult as any).lowStockIngredients : [];

    return {
      order,
      lowStockIngredients,
      inventoryError,
    };
  }

  const insertOrder = async () => {
    const primary = await supabase.from(ORDER_TABLE).insert(toOrderRow(order)).select("*").single();
    if (!primary.error) {
      return primary;
    }

    if (!isMissingKitchenReleaseColumnError(primary.error)) {
      throw primary.error;
    }

    const fallback = await supabase
      .from(ORDER_TABLE)
      .insert(toLegacyOrderRow(order))
      .select("*")
      .single();

    if (fallback.error) {
      throw fallback.error;
    }

    return fallback;
  };

  // Run loyalty updates, DB insertion, and inventory deductions concurrently!
  const [_, insertResult, inventoryResult] = await Promise.all([
    runLoyaltyTasks().catch(e => {
      console.error("Lỗi cập nhật tích điểm thành viên:", e);
      return null;
    }),
    insertOrder(),
    deductInventoryForOrder(
      order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    ).catch(error => ({ lowStockIngredients: [], error: error instanceof Error ? error.message : String(error) }))
  ]);

  const savedOrder = normalizeOrderRow(insertResult.data as OrderRow);
  ordersSnapshot = {
    ...ordersSnapshot,
    orders: sortOrders([savedOrder, ...ordersSnapshot.orders.filter((item) => item.id !== savedOrder.id)]),
  };
  notifyListeners();
  void sendWebhook("order.created", savedOrder);

  const inventoryError = "error" in inventoryResult ? (inventoryResult as any).error : null;
  const lowStockIngredients = "lowStockIngredients" in inventoryResult ? (inventoryResult as any).lowStockIngredients : [];

  return {
    order: savedOrder,
    lowStockIngredients,
    inventoryError,
  };
};

export const updateKitchenOrder = async (
  orderId: string,
  input: CreateKitchenOrderInput,
): Promise<CreateKitchenOrderResult> => {
  const oldOrder = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (!oldOrder) {
    throw new Error("Không tìm thấy đơn hàng cần sửa.");
  }

  // 1 & 2. Revert customer loyalty points and inventory of the old order in parallel
  const revertPromises = [
    refundInventoryForOrder(
      oldOrder.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    )
  ];
  if (oldOrder.customerPhone) {
    revertPromises.push((async () => {
      const oldEarned = oldOrder.earnedPoints || 0;
      const oldSpent = oldOrder.spentPoints || 0;
      const oldNetChange = oldSpent - oldEarned;
      await upsertCustomer(oldOrder.customerPhone!, undefined, oldNetChange);
      await logPointTransaction(
        oldOrder.customerPhone!,
        oldNetChange,
        `Hoàn trả điểm của đơn cũ ${oldOrder.number} để sửa`,
        oldOrder.id,
      );
    })().catch(e => console.error("Lỗi hoàn trả điểm thành viên khi sửa đơn:", e)));
  }
  await Promise.all(revertPromises);

  // 3. Create updated order structure
  const now = new Date().toISOString();
  const earnedPoints = Math.floor(input.total / 20000) * 1000;
  const spentPointsVal = input.spentPoints || 0;

  const updatedOrder: KitchenOrder & { paymentStatus: string } = {
    id: orderId,
    number: oldOrder.number,
    createdAt: oldOrder.createdAt,
    updatedAt: now,
    status: input.paymentStatus === "paid" ? "completed" : "new",
    paymentStatus: input.paymentStatus || oldOrder.paymentStatus,
    kitchenReleaseStatus: resolveKitchenReleaseStatus(input.paymentStatus || oldOrder.paymentStatus, input.kitchenReleaseStatus),
    orderType: input.orderType,
    orderInfo: input.orderInfo,
    paymentMethod: input.paymentMethod,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    discountType: input.discountType,
    discountValue: input.discountValue,
    total: input.total,
    itemCount: input.items.reduce((sum, item) => sum + item.quantity, 0),
    items: input.items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      image: item.product.image,
      name: item.product.name,
      quantity: item.quantity,
      variantName: item.variant?.name,
      options: item.selectedOptions.map((option) => option.name),
      note: item.note,
      totalPrice: item.totalPrice,
      unitPrice: item.totalPrice / item.quantity,
      optionsDetail: item.selectedOptions.map((option) => ({
        name: option.name,
        price: option.price || 0,
      })),
    })),
    customerPhone: input.customerPhone || null,
    earnedPoints,
    spentPoints: spentPointsVal,
    customerName: input.customerName || null,
    deliveryAddress: input.deliveryAddress || null,
    customerNote: input.customerNote || null,
    orderSource: input.orderSource || oldOrder.orderSource || 'pos',
  };

  // 4. Helper for parallel loyalty tasks
  const runLoyaltyTasks = async () => {
    if (!input.customerPhone) return;
    await upsertCustomer(input.customerPhone, input.customerName || undefined, earnedPoints - spentPointsVal);
    const logPromises = [
      logPointTransaction(input.customerPhone, earnedPoints, `Tích điểm đơn hàng cập nhật ${updatedOrder.number}`, updatedOrder.id)
    ];
    if (spentPointsVal > 0) {
      logPromises.push(
        logPointTransaction(input.customerPhone, -spentPointsVal, `Tiêu điểm đơn hàng cập nhật ${updatedOrder.number}`, updatedOrder.id)
      );
    }
    await Promise.all(logPromises);
  };

  // 5. Save updated order in local storage or database
  let saveOrderPromise: Promise<any>;
  if (!supabase) {
    saveOrderPromise = (async () => {
      const updatedOrders = ordersSnapshot.orders.map((o) => o.id === orderId ? updatedOrder : o);
      writeLocalOrders(updatedOrders);
      ordersSnapshot = { ...ordersSnapshot, orders: updatedOrders };
      notifyListeners();
      void sendWebhook("order.updated", updatedOrder);
      return { data: toOrderRow(updatedOrder) };
    })();
  } else {
    const updateOrderInDB = async () => {
      const primary = await supabase.from(ORDER_TABLE).update(toOrderRow(updatedOrder)).eq("id", orderId).select("*").single();
      if (!primary.error) {
        return primary;
      }

      if (!isMissingKitchenReleaseColumnError(primary.error)) {
        throw primary.error;
      }

      const fallback = await supabase
        .from(ORDER_TABLE)
        .update(toLegacyOrderRow(updatedOrder))
        .eq("id", orderId)
        .select("*")
        .single();

      if (fallback.error) {
        throw fallback.error;
      }

      return fallback;
    };
    saveOrderPromise = (async () => {
      const { data } = await updateOrderInDB();
      const savedOrder = normalizeOrderRow(data as OrderRow);
      ordersSnapshot = {
        ...ordersSnapshot,
        orders: sortOrders([savedOrder, ...ordersSnapshot.orders.filter((item) => item.id !== orderId)]),
      };
      notifyListeners();
      void sendWebhook("order.updated", savedOrder);
      return { data };
    })();
  }

  // Deduct new inventory and update points/database in parallel!
  const [_, __, inventoryResult] = await Promise.all([
    runLoyaltyTasks().catch(e => {
      console.error("Lỗi cập nhật điểm thành viên mới khi sửa đơn:", e);
      return null;
    }),
    saveOrderPromise,
    deductInventoryForOrder(
      updatedOrder.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    ).catch(error => ({ lowStockIngredients: [], error: error instanceof Error ? error.message : String(error) }))
  ]);

  const inventoryError = "error" in inventoryResult ? (inventoryResult as any).error : null;
  const lowStockIngredients = "lowStockIngredients" in inventoryResult ? (inventoryResult as any).lowStockIngredients : [];

  return {
    order: updatedOrder,
    lowStockIngredients,
    inventoryError,
  };
};

export const updateKitchenOrderStatus = async (orderId: string, status: KitchenOrderStatus) => {
  if (!supabase) {
    const updatedOrders = ordersSnapshot.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
          }
        : order,
    );
    writeLocalOrders(updatedOrders);
    ordersSnapshot = { ...ordersSnapshot, orders: updatedOrders };
    notifyListeners();
    const updated = updatedOrders.find((o) => o.id === orderId);
    if (updated) void sendWebhook("order.updated", updated);
    return;
  }

  const { error } = await supabase
    .from(ORDER_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }

  await loadKitchenOrders({ force: true, silent: true });
  const updated = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (updated) void sendWebhook("order.updated", updated);
};

export const cancelKitchenOrder = async (orderId: string, reason?: string) => {
  const order = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng.");
  }

  if (order.status === "cancelled") {
    return;
  }

  // Revert customer loyalty points
  if (order.customerPhone) {
    try {
      const earned = order.earnedPoints || 0;
      const spent = order.spentPoints || 0;
      const netPointsChange = spent - earned;
      await upsertCustomer(order.customerPhone, undefined, netPointsChange);
      await logPointTransaction(
        order.customerPhone,
        netPointsChange,
        `Hoàn điểm đơn hàng ${order.number} (do hủy đơn)`,
        order.id,
      );
    } catch (e) {
      console.error("Lỗi hoàn trả điểm thành viên khi hủy đơn:", e);
    }
  }

  if (!supabase) {
    const updatedOrders = ordersSnapshot.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "cancelled" as const,
            updatedAt: new Date().toISOString(),
            orderInfo: reason ? `${o.orderInfo} (Hủy: ${reason})` : o.orderInfo,
          }
        : o,
    );
    writeLocalOrders(updatedOrders);
    ordersSnapshot = { ...ordersSnapshot, orders: updatedOrders };
    notifyListeners();
    await refundInventoryForOrder(
      order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    );
    const updated = updatedOrders.find((o) => o.id === orderId);
    if (updated) void sendWebhook("order.cancelled", updated);
    return;
  }

  const updatedInfo = reason ? `${order.orderInfo} (Hủy: ${reason})` : order.orderInfo;

  const { error } = await supabase
    .from(ORDER_TABLE)
    .update({
      status: "cancelled",
      order_info: updatedInfo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }

  await refundInventoryForOrder(
    order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  );

  await loadKitchenOrders({ force: true, silent: true });
  const updated = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (updated) void sendWebhook("order.cancelled", updated);
};

export const updateKitchenOrderReleaseStatus = async (
  orderId: string,
  kitchenReleaseStatus: KitchenReleaseStatus,
) => {
  if (!supabase) {
    const updatedOrders = ordersSnapshot.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            kitchenReleaseStatus,
            updatedAt: new Date().toISOString(),
          }
        : order,
    );
    writeLocalOrders(updatedOrders);
    ordersSnapshot = { ...ordersSnapshot, orders: updatedOrders };
    notifyListeners();
    const updated = updatedOrders.find((o) => o.id === orderId);
    if (updated) void sendWebhook("order.updated", updated);
    return;
  }

  const { error } = await supabase
    .from(ORDER_TABLE)
    .update({
      kitchen_release_status: kitchenReleaseStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    if (isMissingKitchenReleaseColumnError(error)) {
      throw new Error("Supabase chưa có cột kitchen_release_status. Hãy chạy schema mới để dùng tính năng nhả bếp thủ công.");
    }
    throw error;
  }

  await loadKitchenOrders({ force: true, silent: true });
  const updated = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (updated) void sendWebhook("order.updated", updated);
};

export const updateKitchenOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: string,
): Promise<void> => {
  const now = new Date().toISOString();
  if (!supabase) {
    const localOrders = readLocalOrders();
    const updated = localOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paymentStatus,
            paymentMethod: paymentMethod || o.paymentMethod,
            status: paymentStatus === "paid" ? ("completed" as const) : o.status,
            updatedAt: now,
          }
        : o,
    );
    writeLocalOrders(updated);
    // Reload local snapshot
    ordersSnapshot = {
      ...ordersSnapshot,
      orders: updated,
    };
    notifyListeners();
    const updatedOrder = updated.find((o) => o.id === orderId);
    if (updatedOrder) void sendWebhook("order.updated", updatedOrder);
    return;
  }

  const updateData: any = {
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    updated_at: now,
  };
  if (paymentStatus === "paid") {
    updateData.status = "completed";
  }

  const { error } = await supabase
    .from(ORDER_TABLE)
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    throw error;
  }

  await loadKitchenOrders({ force: true, silent: true });
  const updated = ordersSnapshot.orders.find((o) => o.id === orderId);
  if (updated) void sendWebhook("order.updated", updated);
};

export const subscribeKitchenOrders = (listener: () => void) => {
  listeners.add(listener);

  if (canUseDOM()) {
    ensureKitchenOrdersLoaded();

    const handleLocalChange = () => {
      if (!supabase) {
        ordersSnapshot = {
          ...ordersSnapshot,
          orders: readLocalOrders(),
        };
        notifyListeners();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        handleLocalChange();
      }
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
      if (broadcastChannel) {
        broadcastChannel.removeEventListener("message", handleLocalChange);
      }
    };
  }

  return () => {
    listeners.delete(listener);
  };
};

export const useKitchenOrders = () =>
  useSyncExternalStore(subscribeKitchenOrders, listKitchenOrders, () => ordersSnapshot.orders);

export const useKitchenOrdersSnapshot = () =>
  useSyncExternalStore(subscribeKitchenOrders, () => ordersSnapshot, () => ordersSnapshot);

// =========================================================================
// LOYALTY SYSTEM HELPERS
// =========================================================================

export const getCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) return null;

  if (!supabase) {
    const localCustomersStr = window.localStorage.getItem("speedy-order-system:customers") || "[]";
    const localCustomers: any[] = JSON.parse(localCustomersStr);
    const found = localCustomers.find((c) => c.phone === normalizedPhone);
    if (!found) return null;
    return {
      phone: found.phone,
      name: found.name,
      points: found.points,
      createdAt: found.created_at || new Date().toISOString(),
      updatedAt: found.updated_at || new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("anvat_customers")
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    console.error("Error fetching customer by phone:", error);
    return null;
  }

  if (!data) return null;

  return {
    phone: data.phone,
    name: data.name,
    points: data.points,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const upsertCustomer = async (phone: string, name?: string, pointsChange: number = 0): Promise<Customer> => {
  const normalizedPhone = phone.trim();
  const now = new Date().toISOString();
  
  if (!supabase) {
    const localCustomersStr = window.localStorage.getItem("speedy-order-system:customers") || "[]";
    const localCustomers: any[] = JSON.parse(localCustomersStr);
    const existingIndex = localCustomers.findIndex((c) => c.phone === normalizedPhone);

    let updatedCustomer: any;
    if (existingIndex !== -1) {
      const existing = localCustomers[existingIndex];
      updatedCustomer = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        points: Math.max(0, existing.points + pointsChange),
        updated_at: now,
      };
      localCustomers[existingIndex] = updatedCustomer;
    } else {
      updatedCustomer = {
        phone: normalizedPhone,
        name: name || null,
        points: Math.max(0, pointsChange),
        created_at: now,
        updated_at: now,
      };
      localCustomers.push(updatedCustomer);
    }
    window.localStorage.setItem("speedy-order-system:customers", JSON.stringify(localCustomers));
    return {
      phone: updatedCustomer.phone,
      name: updatedCustomer.name,
      points: updatedCustomer.points,
      createdAt: updatedCustomer.created_at,
      updatedAt: updatedCustomer.updated_at,
    };
  }

  const existing = await getCustomerByPhone(normalizedPhone);
  if (existing) {
    const nextPoints = Math.max(0, existing.points + pointsChange);
    const { data, error } = await supabase
      .from("anvat_customers")
      .update({
        name: name !== undefined ? name : existing.name,
        points: nextPoints,
        updated_at: now,
      })
      .eq("phone", normalizedPhone)
      .select()
      .single();

    if (error) throw error;
    return {
      phone: data.phone,
      name: data.name,
      points: data.points,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else {
    const { data, error } = await supabase
      .from("anvat_customers")
      .insert({
        phone: normalizedPhone,
        name: name || null,
        points: Math.max(0, pointsChange),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      phone: data.phone,
      name: data.name,
      points: data.points,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
};

export const logPointTransaction = async (
  phone: string,
  pointsChange: number,
  reason: string,
  orderId?: string | null,
): Promise<void> => {
  const now = new Date().toISOString();
  if (!supabase) {
    const localHistoryStr = window.localStorage.getItem("speedy-order-system:point-history") || "[]";
    const localHistory: any[] = JSON.parse(localHistoryStr);
    localHistory.push({
      id: crypto.randomUUID(),
      customer_phone: phone,
      order_id: orderId || null,
      points_change: pointsChange,
      reason,
      created_at: now,
    });
    window.localStorage.setItem("speedy-order-system:point-history", JSON.stringify(localHistory));
    return;
  }

  const { error } = await supabase.from("anvat_point_history").insert({
    customer_phone: phone,
    order_id: orderId || null,
    points_change: pointsChange,
    reason,
  });

  if (error) {
    console.error("Error logging point transaction:", error);
  }
};

export const getCustomers = async (): Promise<Customer[]> => {
  if (!supabase) {
    const localCustomersStr = window.localStorage.getItem("speedy-order-system:customers") || "[]";
    const localCustomers: any[] = JSON.parse(localCustomersStr);
    return localCustomers.map((c) => ({
      phone: c.phone,
      name: c.name,
      points: c.points,
      createdAt: c.created_at || new Date().toISOString(),
      updatedAt: c.updated_at || new Date().toISOString(),
    })).sort((a, b) => b.points - a.points);
  }

  const { data, error } = await supabase
    .from("anvat_customers")
    .select("*")
    .order("points", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return (data || []).map((row) => ({
    phone: row.phone,
    name: row.name,
    points: row.points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const getPointHistory = async (phone?: string): Promise<PointHistory[]> => {
  if (!supabase) {
    const localHistoryStr = window.localStorage.getItem("speedy-order-system:point-history") || "[]";
    const localHistory: any[] = JSON.parse(localHistoryStr);
    const filtered = phone 
      ? localHistory.filter((h) => h.customer_phone === phone)
      : localHistory;
    return filtered.map((h) => ({
      id: h.id,
      customerPhone: h.customer_phone,
      orderId: h.order_id,
      pointsChange: h.points_change,
      reason: h.reason,
      createdAt: h.created_at,
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  let query = supabase
    .from("anvat_point_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (phone) {
    query = query.eq("customer_phone", phone);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching point history:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    customerPhone: row.customer_phone,
    orderId: row.order_id,
    pointsChange: row.points_change,
    reason: row.reason,
    createdAt: row.created_at,
  }));
};

export const adjustCustomerPointsManually = async (
  phone: string,
  pointsChange: number,
  reason: string
): Promise<Customer> => {
  const updatedCustomer = await upsertCustomer(phone, undefined, pointsChange);
  await logPointTransaction(phone, pointsChange, `[Điều chỉnh thủ công] ${reason}`);
  return updatedCustomer;
};

// Đăng ký hàm tính tổng thống kê tích lũy trong ngày cho Webhook
registerStatsGetter(() => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = ordersSnapshot.orders.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.status !== "cancelled" &&
      !order.id.startsWith("sample-order-") &&
      new Date(order.createdAt).toISOString().slice(0, 10) === todayStr
  );
  
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const todayOrderCount = todayOrders.length;
  const todayItemCount = todayOrders.reduce((sum, order) => sum + order.itemCount, 0);

  return { todayRevenue, todayOrderCount, todayItemCount };
});
