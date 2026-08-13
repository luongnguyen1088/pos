import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { products } from "@/data/products";
import { sendWebhook } from "@/lib/webhooks";

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  purchasePrice?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductRecipeItem = {
  id: string;
  productId: string;
  ingredientId: string;
  quantity: number;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  purchase_price?: number;
  created_at?: string;
  updated_at?: string;
};

type ProductRecipeRow = {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
};

type InventorySnapshot = {
  ingredients: Ingredient[];
  recipes: ProductRecipeItem[];
  isLoading: boolean;
  error: string | null;
};

const INGREDIENT_TABLE = "anvat_ingredients";
const RECIPE_TABLE = "anvat_product_ingredients";
const STORAGE_KEY = "speedy-order-system:inventory";
const EVENT_NAME = "speedy-order-system:inventory-updated";

const defaultIngredients: Ingredient[] = [
  { id: "ing-black-tea", name: "Trà đen", unit: "ml", stockQuantity: 9000, lowStockThreshold: 1500, purchasePrice: 100 },
  { id: "ing-milk", name: "Sữa tươi", unit: "ml", stockQuantity: 7000, lowStockThreshold: 1200, purchasePrice: 80 },
  { id: "ing-sugar", name: "Đường syrup", unit: "ml", stockQuantity: 4200, lowStockThreshold: 800, purchasePrice: 120 },
  { id: "ing-boba", name: "Trân châu", unit: "g", stockQuantity: 3200, lowStockThreshold: 500, purchasePrice: 110 },
  { id: "ing-matcha", name: "Bột matcha", unit: "g", stockQuantity: 1300, lowStockThreshold: 180, purchasePrice: 350 },
  { id: "ing-cacao", name: "Bột cacao", unit: "g", stockQuantity: 1500, lowStockThreshold: 220, purchasePrice: 250 },
  { id: "ing-peach-syrup", name: "Syrup đào", unit: "ml", stockQuantity: 2600, lowStockThreshold: 400, purchasePrice: 150 },
  { id: "ing-lemon-syrup", name: "Syrup chanh", unit: "ml", stockQuantity: 2400, lowStockThreshold: 350, purchasePrice: 150 },
  { id: "ing-passion-syrup", name: "Syrup chanh leo", unit: "ml", stockQuantity: 2200, lowStockThreshold: 350, purchasePrice: 150 },
  { id: "ing-strawberry-syrup", name: "Syrup dâu", unit: "ml", stockQuantity: 2600, lowStockThreshold: 400, purchasePrice: 150 },
  { id: "ing-mango-syrup", name: "Syrup xoài", unit: "ml", stockQuantity: 2400, lowStockThreshold: 350, purchasePrice: 150 },
  { id: "ing-noodle", name: "Mì gói", unit: "vắt", stockQuantity: 180, lowStockThreshold: 30, purchasePrice: 4000 },
  { id: "ing-broth", name: "Nước dùng", unit: "ml", stockQuantity: 12000, lowStockThreshold: 2000, purchasePrice: 50 },
  { id: "ing-sausage", name: "Xúc xích", unit: "cây", stockQuantity: 80, lowStockThreshold: 15, purchasePrice: 8000 },
  { id: "ing-egg", name: "Trứng", unit: "quả", stockQuantity: 90, lowStockThreshold: 20, purchasePrice: 3500 },
  { id: "ing-potato", name: "Khoai tây", unit: "phần", stockQuantity: 90, lowStockThreshold: 15, purchasePrice: 12000 },
  { id: "ing-chicken-ball", name: "Gà viên", unit: "phần", stockQuantity: 70, lowStockThreshold: 10, purchasePrice: 15000 },
  { id: "ing-cheese", name: "Phô mai", unit: "g", stockQuantity: 1600, lowStockThreshold: 250, purchasePrice: 400 },
  { id: "ing-icecream", name: "Kem tươi", unit: "viên", stockQuantity: 180, lowStockThreshold: 30, purchasePrice: 12000 },
  { id: "ing-waffle-cone", name: "Vỏ ốc quế", unit: "cái", stockQuantity: 120, lowStockThreshold: 20, purchasePrice: 3000 },
];

const defaultRecipes: ProductRecipeItem[] = [
  { id: "r-mt1-1", productId: "mt1", ingredientId: "ing-black-tea", quantity: 120 },
  { id: "r-mt1-2", productId: "mt1", ingredientId: "ing-milk", quantity: 80 },
  { id: "r-mt1-3", productId: "mt1", ingredientId: "ing-boba", quantity: 35 },
  { id: "r-ft1-1", productId: "ft1", ingredientId: "ing-lemon-syrup", quantity: 35 },
  { id: "r-ft2-1", productId: "ft2", ingredientId: "ing-black-tea", quantity: 140 },
  { id: "r-ft2-2", productId: "ft2", ingredientId: "ing-strawberry-syrup", quantity: 25 },
  { id: "r-k1-1", productId: "k1", ingredientId: "ing-icecream", quantity: 1 },
  { id: "r-k1-2", productId: "k1", ingredientId: "ing-waffle-cone", quantity: 1 },
  { id: "r-n1-1", productId: "n1", ingredientId: "ing-noodle", quantity: 1 },
  { id: "r-n1-2", productId: "n1", ingredientId: "ing-broth", quantity: 350 },
  { id: "r-n1-3", productId: "n1", ingredientId: "ing-sausage", quantity: 1 },
  { id: "r-n5-1", productId: "n5", ingredientId: "ing-sausage", quantity: 1 },
];

let inventorySnapshot: InventorySnapshot = {
  ingredients: defaultIngredients,
  recipes: defaultRecipes,
  isLoading: true,
  error: null,
};
let loadPromise: Promise<void> | null = null;
let inventoryChannelInitialized = false;
const listeners = new Set<() => void>();

const canUseDOM = () => typeof window !== "undefined";

const notifyListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

const getMissingIngredientIds = (ingredients: Array<{ id: string }>) => {
  const existingIds = new Set(ingredients.map((ingredient) => ingredient.id));
  return defaultIngredients.filter((ingredient) => !existingIds.has(ingredient.id)).map((ingredient) => ingredient.id);
};

const getMissingRecipeIds = (recipes: Array<{ id: string }>) => {
  const existingIds = new Set(recipes.map((recipe) => recipe.id));
  return defaultRecipes.filter((recipe) => !existingIds.has(recipe.id)).map((recipe) => recipe.id);
};

const normalizeIngredient = (row: IngredientRow): Ingredient => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  stockQuantity: Number(row.stock_quantity),
  lowStockThreshold: Number(row.low_stock_threshold),
  purchasePrice: row.purchase_price !== undefined ? Number(row.purchase_price) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeRecipe = (row: ProductRecipeRow): ProductRecipeItem => ({
  id: row.id,
  productId: row.product_id,
  ingredientId: row.ingredient_id,
  quantity: Number(row.quantity),
});

const toIngredientRow = (ingredient: Ingredient): IngredientRow => ({
  id: ingredient.id,
  name: ingredient.name,
  unit: ingredient.unit,
  stock_quantity: ingredient.stockQuantity,
  low_stock_threshold: ingredient.lowStockThreshold,
  purchase_price: ingredient.purchasePrice,
});

const toRecipeRow = (recipe: ProductRecipeItem): ProductRecipeRow => ({
  id: recipe.id,
  product_id: recipe.productId,
  ingredient_id: recipe.ingredientId,
  quantity: recipe.quantity,
});

const setInventorySnapshot = (next: InventorySnapshot) => {
  inventorySnapshot = next;

  if (!supabase && canUseDOM()) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ingredients: next.ingredients,
        recipes: next.recipes,
      }),
    );
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }

  notifyListeners();
};

const readLocalInventory = () => {
  if (!canUseDOM()) {
    return { ingredients: [], recipes: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ingredients: defaultIngredients, recipes: defaultRecipes };
    }

    const parsed = JSON.parse(raw) as {
      ingredients?: Ingredient[];
      recipes?: ProductRecipeItem[];
    };

    const ingredients = parsed.ingredients?.length ? parsed.ingredients : defaultIngredients;
    const recipes = parsed.recipes?.length ? parsed.recipes : defaultRecipes;

    return {
      ingredients,
      recipes,
    };
  } catch {
    return { ingredients: defaultIngredients, recipes: defaultRecipes };
  }
};

const seedInventoryFromDefaults = async () => {
  if (!supabase) {
    return;
  }

  const { error: ingredientError } = await supabase
    .from(INGREDIENT_TABLE)
    .upsert(defaultIngredients.map(toIngredientRow), { onConflict: "id" });
  if (ingredientError) {
    throw ingredientError;
  }

  const { error: recipeError } = await supabase
    .from(RECIPE_TABLE)
    .upsert(defaultRecipes.map(toRecipeRow), { onConflict: "id" });
  if (recipeError) {
    throw recipeError;
  }
};

const fetchInventoryFromSource = async () => {
  if (!supabase) {
    return readLocalInventory();
  }

  const [{ data: ingredientRows, error: ingredientError }, { data: recipeRows, error: recipeError }] =
    await Promise.all([
      supabase.from(INGREDIENT_TABLE).select("*").order("name"),
      supabase.from(RECIPE_TABLE).select("*"),
    ]);

  if (ingredientError) {
    throw ingredientError;
  }

  if (recipeError) {
    throw recipeError;
  }

  if ((ingredientRows?.length ?? 0) === 0 && (recipeRows?.length ?? 0) === 0) {
    await seedInventoryFromDefaults();
    return fetchInventoryFromSource();
  }
  return {
    ingredients: (ingredientRows ?? []).map((row) => normalizeIngredient(row as IngredientRow)),
    recipes: (recipeRows ?? []).map((row) => normalizeRecipe(row as ProductRecipeRow)),
  };
};

const initializeInventoryRealtime = () => {
  if (!supabase || inventoryChannelInitialized) {
    return;
  }

  inventoryChannelInitialized = true;

  supabase
    .channel("inventory-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: INGREDIENT_TABLE },
      () => {
        void loadInventory({ force: true, silent: true });
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: RECIPE_TABLE },
      () => {
        void loadInventory({ force: true, silent: true });
      },
    )
    .subscribe();
};

const loadInventory = async (options?: { force?: boolean; silent?: boolean }) => {
  if (loadPromise && !options?.force) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!options?.silent) {
      inventorySnapshot = {
        ...inventorySnapshot,
        isLoading: true,
        error: null,
      };
      notifyListeners();
    }

    try {
      const nextInventory = await fetchInventoryFromSource();
      setInventorySnapshot({
        ingredients: nextInventory.ingredients,
        recipes: nextInventory.recipes,
        isLoading: false,
        error: null,
      });
      initializeInventoryRealtime();
    } catch (error) {
      const fallbackInventory = readLocalInventory();
      let errMsg = "Không thể tải tồn kho.";
      if (error && typeof error === "object") {
        if ("message" in error && (error as any).message) {
          errMsg = `Không thể tải tồn kho: ${(error as any).message}`;
        } else if ("hint" in error && (error as any).hint) {
          errMsg = `Không thể tải tồn kho: ${(error as any).hint}`;
        } else {
          errMsg = `Không thể tải tồn kho: ${JSON.stringify(error)}`;
        }
      } else if (error) {
        errMsg = `Không thể tải tồn kho: ${String(error)}`;
      }
      setInventorySnapshot({
        ingredients: fallbackInventory.ingredients,
        recipes: fallbackInventory.recipes,
        isLoading: false,
        error: errMsg,
      });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

const upsertIngredientLocal = (ingredient: Ingredient) => {
  const nextIngredients = inventorySnapshot.ingredients.some((item) => item.id === ingredient.id)
    ? inventorySnapshot.ingredients.map((item) => (item.id === ingredient.id ? ingredient : item))
    : [...inventorySnapshot.ingredients, ingredient];

  setInventorySnapshot({
    ...inventorySnapshot,
    ingredients: nextIngredients,
  });
};

const removeIngredientLocal = (ingredientId: string) => {
  setInventorySnapshot({
    ...inventorySnapshot,
    ingredients: inventorySnapshot.ingredients.filter((item) => item.id !== ingredientId),
    recipes: inventorySnapshot.recipes.filter((item) => item.ingredientId !== ingredientId),
  });
};

const replaceRecipesLocal = (productId: string, recipes: ProductRecipeItem[]) => {
  setInventorySnapshot({
    ...inventorySnapshot,
    recipes: [
      ...inventorySnapshot.recipes.filter((item) => item.productId !== productId),
      ...recipes,
    ],
  });
};

export const listInventory = () => inventorySnapshot;

export const subscribeInventory = (listener: () => void) => {
  listeners.add(listener);

  if (canUseDOM()) {
    void loadInventory();

    const handleLocalChange = () => {
      if (!supabase) {
        const localInventory = readLocalInventory();
        inventorySnapshot = {
          ...inventorySnapshot,
          ingredients: localInventory.ingredients,
          recipes: localInventory.recipes,
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

    return () => {
      listeners.delete(listener);
      window.removeEventListener(EVENT_NAME, handleLocalChange);
      window.removeEventListener("storage", handleStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
};

export const saveIngredient = async (ingredient: Ingredient) => {
  if (!supabase) {
    upsertIngredientLocal(ingredient);
    void sendWebhook("inventory.adjusted", { reason: "manual_edit", ingredient });
    return;
  }

  const { error } = await supabase.from(INGREDIENT_TABLE).upsert(toIngredientRow(ingredient), {
    onConflict: "id",
  });
  if (error) {
    throw error;
  }

  await loadInventory({ force: true, silent: true });
  void sendWebhook("inventory.adjusted", { reason: "manual_edit", ingredient });
};

export const removeIngredient = async (ingredientId: string) => {
  if (!supabase) {
    removeIngredientLocal(ingredientId);
    void sendWebhook("inventory.adjusted", { reason: "manual_delete", ingredientId });
    return;
  }

  const { error } = await supabase.from(INGREDIENT_TABLE).delete().eq("id", ingredientId);
  if (error) {
    throw error;
  }

  await loadInventory({ force: true, silent: true });
  void sendWebhook("inventory.adjusted", { reason: "manual_delete", ingredientId });
};

export const saveProductRecipe = async (productId: string, recipes: ProductRecipeItem[]) => {
  if (!supabase) {
    replaceRecipesLocal(productId, recipes);
    return;
  }

  const { error: deleteError } = await supabase.from(RECIPE_TABLE).delete().eq("product_id", productId);
  if (deleteError) {
    throw deleteError;
  }

  if (recipes.length > 0) {
    const { error: insertError } = await supabase
      .from(RECIPE_TABLE)
      .insert(recipes.map(toRecipeRow));
    if (insertError) {
      throw insertError;
    }
  }

  await loadInventory({ force: true, silent: true });
};

const getRecipeRequirementsForItems = (items: { productId: string; quantity: number }[]) => {
  const requirements = new Map<string, number>();
  const currentRecipes = inventorySnapshot.recipes;

  for (const item of items) {
    const productRecipes = currentRecipes.filter((recipe) => recipe.productId === item.productId);
    if (productRecipes.length > 0) {
      for (const recipe of productRecipes) {
        const current = requirements.get(recipe.ingredientId) ?? 0;
        requirements.set(recipe.ingredientId, current + recipe.quantity * item.quantity);
      }
    } else {
      // Automatic implicit 1-1 mapping for products with no recipe defined
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const matchingIng = inventorySnapshot.ingredients.find(
          (ing) => ing.name.toLowerCase().trim() === product.name.toLowerCase().trim()
        );
        if (matchingIng) {
          const current = requirements.get(matchingIng.id) ?? 0;
          requirements.set(matchingIng.id, current + 1 * item.quantity);
        }
      }
    }
  }
  return requirements;
};

export const deductInventoryForOrder = async (
  items: { productId: string; quantity: number }[],
) => {
  if (items.length === 0) {
    return { lowStockIngredients: [] as Ingredient[] };
  }

  const recipeRequirements = getRecipeRequirementsForItems(items);

  if (recipeRequirements.size === 0) {
    return { lowStockIngredients: [] as Ingredient[] };
  }

  const nextIngredients = inventorySnapshot.ingredients.map((ingredient) => {
    const deduction = recipeRequirements.get(ingredient.id) ?? 0;
    if (deduction === 0) {
      return ingredient;
    }

    return {
      ...ingredient,
      stockQuantity: Math.max(0, ingredient.stockQuantity - deduction),
    };
  });

  const lowStockIngredients = nextIngredients.filter(
    (ingredient) => ingredient.stockQuantity <= ingredient.lowStockThreshold,
  );

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
    void sendWebhook("inventory.adjusted", { reason: "order_deduct", items });
    return { lowStockIngredients };
  }

  const changedIngredients = nextIngredients.filter((ingredient) =>
    recipeRequirements.has(ingredient.id),
  );

  const { error } = await supabase
    .from(INGREDIENT_TABLE)
    .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });

  if (error) {
    throw error;
  }

  await loadInventory({ force: true, silent: true });
  void sendWebhook("inventory.adjusted", { reason: "order_deduct", items });
  return { lowStockIngredients };
};

export const refundInventoryForOrder = async (
  items: { productId: string; quantity: number }[],
) => {
  if (items.length === 0) {
    return;
  }

  const recipeRequirements = getRecipeRequirementsForItems(items);

  if (recipeRequirements.size === 0) {
    return;
  }

  const nextIngredients = inventorySnapshot.ingredients.map((ingredient) => {
    const refund = recipeRequirements.get(ingredient.id) ?? 0;
    if (refund === 0) {
      return ingredient;
    }

    return {
      ...ingredient,
      stockQuantity: ingredient.stockQuantity + refund,
    };
  });

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
    void sendWebhook("inventory.adjusted", { reason: "order_refund", items });
    return;
  }

  const changedIngredients = nextIngredients.filter((ingredient) =>
    recipeRequirements.has(ingredient.id),
  );

  const { error } = await supabase
    .from(INGREDIENT_TABLE)
    .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });

  if (error) {
    throw error;
  }

  await loadInventory({ force: true, silent: true });
  void sendWebhook("inventory.adjusted", { reason: "order_refund", items });
};

export const useInventory = () =>
  useSyncExternalStore(subscribeInventory, listInventory, () => inventorySnapshot);

export type PurchaseOrderItem = {
  id: string;
  ingredientId: string;
  quantity: number;
  price: number;
};

export type PurchaseOrder = {
  id: string;
  supplierName: string;
  totalAmount: number;
  status: "completed" | "pending";
  note: string;
  items: PurchaseOrderItem[];
  createdAt: string;
};

export type CreatePurchaseOrderInput = Omit<PurchaseOrder, "id" | "createdAt">;

const PURCHASE_ORDER_STORAGE_KEY = "speedy-order-system:purchase-orders";
const PURCHASE_ORDER_EVENT_NAME = "speedy-order-system:purchase-orders-updated";
const PURCHASE_ORDER_TABLE = "anvat_purchase_orders";
const PURCHASE_ORDER_ITEM_TABLE = "anvat_purchase_order_items";

const defaultPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-1",
    supplierName: "Nhà phân phối trà sữa Đại Việt",
    totalAmount: 1850000,
    status: "completed",
    note: "Đơn nhập trà sữa và topping đầu tháng",
    items: [
      { id: "poi-1", ingredientId: "ing-black-tea", quantity: 5000, price: 100 },
      { id: "poi-2", ingredientId: "ing-milk", quantity: 10000, price: 80 },
      { id: "poi-3", ingredientId: "ing-boba", quantity: 5000, price: 110 },
    ],
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
  },
];

let purchaseOrdersSnapshot: PurchaseOrder[] = [];
let purchaseOrdersLoaded = false;
const poListeners = new Set<() => void>();

const notifyPoListeners = () => {
  for (const listener of poListeners) {
    listener();
  }
};

const readLocalPurchaseOrders = (): PurchaseOrder[] => {
  if (!canUseDOM()) {
    return defaultPurchaseOrders;
  }
  try {
    const raw = window.localStorage.getItem(PURCHASE_ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultPurchaseOrders;
  } catch {
    return defaultPurchaseOrders;
  }
};

const setPurchaseOrdersSnapshot = (next: PurchaseOrder[]) => {
  purchaseOrdersSnapshot = next;

  if (!supabase && canUseDOM()) {
    try {
      window.localStorage.setItem(PURCHASE_ORDER_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(PURCHASE_ORDER_EVENT_NAME));
    } catch (e) {
      console.error("Failed to write purchase orders to LocalStorage:", e);
    }
  }

  notifyPoListeners();
};

const fetchPurchaseOrdersFromSource = async (): Promise<PurchaseOrder[]> => {
  if (!supabase) {
    return readLocalPurchaseOrders();
  }

  const [{ data: orderRows, error: orderError }, { data: itemRows, error: itemError }] = await Promise.all([
    supabase.from(PURCHASE_ORDER_TABLE).select("*").order("created_at", { ascending: false }),
    supabase.from(PURCHASE_ORDER_ITEM_TABLE).select("*"),
  ]);

  if (orderError) throw orderError;
  if (itemError) throw itemError;

  const itemsGroupedByOrderId: Record<string, PurchaseOrderItem[]> = {};
  (itemRows ?? []).forEach((row) => {
    const item: PurchaseOrderItem = {
      id: row.id,
      ingredientId: row.ingredient_id,
      quantity: Number(row.quantity),
      price: Number(row.price),
    };
    const orderId = row.purchase_order_id;
    if (!itemsGroupedByOrderId[orderId]) {
      itemsGroupedByOrderId[orderId] = [];
    }
    itemsGroupedByOrderId[orderId].push(item);
  });

  return (orderRows ?? []).map((row) => ({
    id: row.id,
    supplierName: row.supplier_name,
    totalAmount: Number(row.total_amount),
    status: row.status as "completed" | "pending",
    note: row.note || "",
    createdAt: row.created_at,
    items: itemsGroupedByOrderId[row.id] || [],
  }));
};

let poLoadPromise: Promise<PurchaseOrder[]> | null = null;
let poChannelInitialized = false;

const initializePurchaseOrdersRealtime = () => {
  if (!supabase || poChannelInitialized) {
    return;
  }
  poChannelInitialized = true;
  supabase
    .channel("purchase-orders-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: PURCHASE_ORDER_TABLE },
      () => {
        void loadPurchaseOrders({ force: true, silent: true });
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: PURCHASE_ORDER_ITEM_TABLE },
      () => {
        void loadPurchaseOrders({ force: true, silent: true });
      },
    )
    .subscribe();
};

const loadPurchaseOrders = async (options?: { force?: boolean; silent?: boolean }) => {
  if (poLoadPromise && !options?.force) {
    return poLoadPromise;
  }

  poLoadPromise = (async () => {
    try {
      const nextOrders = await fetchPurchaseOrdersFromSource();
      setPurchaseOrdersSnapshot(nextOrders);
      initializePurchaseOrdersRealtime();
      return nextOrders;
    } catch (error) {
      console.error("Failed to load purchase orders from DB, fallback to local:", error);
      const fallbackOrders = readLocalPurchaseOrders();
      setPurchaseOrdersSnapshot(fallbackOrders);
      return fallbackOrders;
    } finally {
      poLoadPromise = null;
    }
  })();

  return poLoadPromise;
};

export const listPurchaseOrders = (): PurchaseOrder[] => {
  if (!purchaseOrdersLoaded) {
    if (canUseDOM()) {
      void loadPurchaseOrders();
    } else {
      purchaseOrdersSnapshot = defaultPurchaseOrders;
    }
    purchaseOrdersLoaded = true;
  }
  return purchaseOrdersSnapshot;
};

export const subscribePurchaseOrders = (listener: () => void) => {
  poListeners.add(listener);
  if (canUseDOM()) {
    void loadPurchaseOrders();

    const handleLocalChange = () => {
      if (!supabase) {
        const localOrders = readLocalPurchaseOrders();
        purchaseOrdersSnapshot = localOrders;
        listener();
      }
    };
    window.addEventListener(PURCHASE_ORDER_EVENT_NAME, handleLocalChange);
    return () => {
      poListeners.delete(listener);
      window.removeEventListener(PURCHASE_ORDER_EVENT_NAME, handleLocalChange);
    };
  }
  return () => poListeners.delete(listener);
};

export const usePurchaseOrders = () =>
  useSyncExternalStore(subscribePurchaseOrders, listPurchaseOrders, () => purchaseOrdersSnapshot);

export const createPurchaseOrder = async (input: CreatePurchaseOrderInput): Promise<PurchaseOrder> => {
  const generatedId = "po-" + crypto.randomUUID();
  const formattedItems = input.items.map((item) => ({
    ...item,
    id: (item as any).id || "poi-" + crypto.randomUUID(),
  }));

  const newOrder: PurchaseOrder = {
    ...input,
    id: generatedId,
    items: formattedItems,
    createdAt: new Date().toISOString(),
  };

  // 1. Save to Supabase (if configured)
  if (supabase) {
    // Save order
    const { error: orderError } = await supabase.from(PURCHASE_ORDER_TABLE).insert({
      id: newOrder.id,
      supplier_name: newOrder.supplierName,
      total_amount: newOrder.totalAmount,
      status: newOrder.status,
      note: newOrder.note,
      created_at: newOrder.createdAt,
    });

    if (orderError) {
      console.error("Lỗi khi tạo phiếu nhập kho lên database:", orderError);
      throw orderError;
    }

    // Save order items
    const dbItems = newOrder.items.map((item) => ({
      id: item.id,
      purchase_order_id: newOrder.id,
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from(PURCHASE_ORDER_ITEM_TABLE).insert(dbItems);
    if (itemsError) {
      console.error("Lỗi khi lưu danh sách nguyên liệu nhập lên database:", itemsError);
      throw itemsError;
    }
  }

  // 2. Update local memory snapshot & LocalStorage (via helper)
  const orders = purchaseOrdersSnapshot;
  const nextOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
  setPurchaseOrdersSnapshot(nextOrders);

  // 3. Add quantities to ingredients
  const currentIngredients = inventorySnapshot.ingredients;
  const nextIngredients = currentIngredients.map((ingredient) => {
    const matchedItem = newOrder.items.find((item) => item.ingredientId === ingredient.id);
    if (matchedItem) {
      return {
        ...ingredient,
        stockQuantity: ingredient.stockQuantity + matchedItem.quantity,
      };
    }
    return ingredient;
  });

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
  } else {
    const changedIngredients = nextIngredients.filter((ingredient) =>
      newOrder.items.some((item) => item.ingredientId === ingredient.id)
    );
    const { error: upsertError } = await supabase
      .from(INGREDIENT_TABLE)
      .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });
    if (upsertError) {
      console.error("Lỗi khi cập nhật tồn kho lên database:", upsertError);
      throw upsertError;
    }
    await loadInventory({ force: true, silent: true });
    await loadPurchaseOrders({ force: true, silent: true });
  }

  // 4. Create cashbook entry dynamically to avoid circular dependency
  try {
    const cashbookModule = await import("@/lib/cashbook");
    await cashbookModule.createCashEntry({
      title: `Nhập nguyên liệu: PO-${newOrder.id.substring(3, 7).toUpperCase()} (${newOrder.supplierName})`,
      amount: newOrder.totalAmount,
      entryType: "expense",
      category: "Nguyên liệu",
      note: newOrder.note || `Nhập kho tự động từ phiếu nhập ${newOrder.supplierName}`,
      channel: "cash",
      occurredAt: newOrder.createdAt,
    });
  } catch (err) {
    console.error("Không thể tự động đồng bộ sang Sổ quỹ:", err);
  }

  return newOrder;
};

export type InventoryAdjustment = {
  id: string;
  ingredientId: string;
  type: "increase" | "decrease";
  quantity: number;
  reason: string;
  createdAt: string;
};

export type CreateInventoryAdjustmentInput = Omit<InventoryAdjustment, "id" | "createdAt">;

const ADJUSTMENT_STORAGE_KEY = "speedy-order-system:inventory-adjustments";
const ADJUSTMENT_EVENT_NAME = "speedy-order-system:inventory-adjustments-updated";

const defaultAdjustments: InventoryAdjustment[] = [
  {
    id: "adj-1",
    ingredientId: "ing-milk",
    type: "decrease",
    quantity: 500,
    reason: "Hao hụt pha chế (Đổ sữa)",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
];

let adjustmentsSnapshot: InventoryAdjustment[] = [];
let adjustmentsLoaded = false;
const adjListeners = new Set<() => void>();

const notifyAdjListeners = () => {
  for (const listener of adjListeners) {
    listener();
  }
};

export const listInventoryAdjustments = (): InventoryAdjustment[] => {
  if (!adjustmentsLoaded) {
    if (canUseDOM()) {
      try {
        const raw = window.localStorage.getItem(ADJUSTMENT_STORAGE_KEY);
        if (raw) {
          adjustmentsSnapshot = JSON.parse(raw);
        } else {
          adjustmentsSnapshot = defaultAdjustments;
          window.localStorage.setItem(ADJUSTMENT_STORAGE_KEY, JSON.stringify(defaultAdjustments));
        }
      } catch {
        adjustmentsSnapshot = defaultAdjustments;
      }
    } else {
      adjustmentsSnapshot = defaultAdjustments;
    }
    adjustmentsLoaded = true;
  }
  return adjustmentsSnapshot;
};

export const subscribeInventoryAdjustments = (listener: () => void) => {
  adjListeners.add(listener);
  if (canUseDOM()) {
    const handleUpdate = () => {
      try {
        const raw = window.localStorage.getItem(ADJUSTMENT_STORAGE_KEY);
        if (raw) {
          adjustmentsSnapshot = JSON.parse(raw);
        }
      } catch {
        // Keep current snapshot
      }
      listener();
    };
    window.addEventListener(ADJUSTMENT_EVENT_NAME, handleUpdate);
    return () => {
      adjListeners.delete(listener);
      window.removeEventListener(ADJUSTMENT_EVENT_NAME, handleUpdate);
    };
  }
  return () => poListeners.delete(listener);
};

export const useInventoryAdjustments = () =>
  useSyncExternalStore(subscribeInventoryAdjustments, listInventoryAdjustments, () => adjustmentsSnapshot);

export const createInventoryAdjustment = async (input: CreateInventoryAdjustmentInput): Promise<InventoryAdjustment> => {
  const newAdj: InventoryAdjustment = {
    ...input,
    id: "adj-" + crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // 1. Save adjustment log to LocalStorage
  const adjs = listInventoryAdjustments();
  const nextAdjs = [newAdj, ...adjs];
  adjustmentsSnapshot = nextAdjs;

  if (canUseDOM()) {
    window.localStorage.setItem(ADJUSTMENT_STORAGE_KEY, JSON.stringify(nextAdjs));
    window.dispatchEvent(new CustomEvent(ADJUSTMENT_EVENT_NAME));
  }
  notifyAdjListeners();

  // 2. Adjust ingredient quantities in the inventory
  const currentIngredients = inventorySnapshot.ingredients;
  const nextIngredients = currentIngredients.map((ingredient) => {
    if (ingredient.id === newAdj.ingredientId) {
      const diff = newAdj.type === "increase" ? newAdj.quantity : -newAdj.quantity;
      return {
        ...ingredient,
        stockQuantity: Math.max(0, ingredient.stockQuantity + diff),
      };
    }
    return ingredient;
  });

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
  } else {
    // Sync update to supabase
    const changedIngredients = nextIngredients.filter((ingredient) => ingredient.id === newAdj.ingredientId);
    const { error: upsertError } = await supabase
      .from(INGREDIENT_TABLE)
      .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });
    if (upsertError) {
      console.error("Lỗi khi cập nhật tồn kho lên database:", upsertError);
      throw upsertError;
    }
    await loadInventory({ force: true, silent: true });
  }

  return newAdj;
};

export type InventoryAuditItem = {
  ingredientId: string;
  theoreticalQty: number;
  physicalQty: number;
  variance: number;
};

export type InventoryAudit = {
  id: string;
  date: string;
  status: "completed";
  items: InventoryAuditItem[];
  note?: string;
  createdAt: string;
};

export type CreateInventoryAuditInput = Omit<InventoryAudit, "id" | "createdAt">;

const AUDIT_STORAGE_KEY = "speedy-order-system:inventory-audits";
const AUDIT_EVENT_NAME = "speedy-order-system:inventory-audits-updated";

const defaultAudits: InventoryAudit[] = [
  {
    id: "aud-1",
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10),
    status: "completed",
    note: "Kiểm kho cuối ca chiều ngày hôm qua",
    items: [
      {
        ingredientId: "ing-milk",
        theoreticalQty: 7500,
        physicalQty: 7000,
        variance: -500,
      },
      {
        ingredientId: "ing-boba",
        theoreticalQty: 3200,
        physicalQty: 3200,
        variance: 0,
      },
    ],
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
];

let auditsSnapshot: InventoryAudit[] = [];
let auditsLoaded = false;
const auditListeners = new Set<() => void>();

const notifyAuditListeners = () => {
  for (const listener of auditListeners) {
    listener();
  }
};

export const listInventoryAudits = (): InventoryAudit[] => {
  if (!auditsLoaded) {
    if (canUseDOM()) {
      try {
        const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
        if (raw) {
          auditsSnapshot = JSON.parse(raw);
        } else {
          auditsSnapshot = defaultAudits;
          window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(defaultAudits));
        }
      } catch {
        auditsSnapshot = defaultAudits;
      }
    } else {
      auditsSnapshot = defaultAudits;
    }
    auditsLoaded = true;
  }
  return auditsSnapshot;
};

export const subscribeInventoryAudits = (listener: () => void) => {
  auditListeners.add(listener);
  if (canUseDOM()) {
    const handleUpdate = () => {
      try {
        const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
        if (raw) {
          auditsSnapshot = JSON.parse(raw);
        }
      } catch {
        // Keep current snapshot
      }
      listener();
    };
    window.addEventListener(ADJUSTMENT_EVENT_NAME, handleUpdate);
    window.addEventListener(AUDIT_EVENT_NAME, handleUpdate);
    return () => {
      auditListeners.delete(listener);
      window.removeEventListener(ADJUSTMENT_EVENT_NAME, handleUpdate);
      window.removeEventListener(AUDIT_EVENT_NAME, handleUpdate);
    };
  }
  return () => auditListeners.delete(listener);
};

export const useInventoryAudits = () =>
  useSyncExternalStore(subscribeInventoryAudits, listInventoryAudits, () => auditsSnapshot);

export const createInventoryAudit = async (input: CreateInventoryAuditInput): Promise<InventoryAudit> => {
  const newAudit: InventoryAudit = {
    ...input,
    id: "aud-" + crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // 1. Save audit to storage
  const audits = listInventoryAudits();
  const nextAudits = [newAudit, ...audits];
  auditsSnapshot = nextAudits;

  if (canUseDOM()) {
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(nextAudits));
    window.dispatchEvent(new CustomEvent(AUDIT_EVENT_NAME));
  }
  notifyAuditListeners();

  // 2. Update ingredient quantities in the inventory snapshot to match physicalQty
  const currentIngredients = inventorySnapshot.ingredients;
  const nextIngredients = currentIngredients.map((ingredient) => {
    const auditItem = newAudit.items.find((item) => item.ingredientId === ingredient.id);
    if (auditItem) {
      return {
        ...ingredient,
        stockQuantity: auditItem.physicalQty,
      };
    }
    return ingredient;
  });

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
  } else {
    // Sync update to supabase
    const changedIds = newAudit.items.map((item) => item.ingredientId);
    const changedIngredients = nextIngredients.filter((ing) => changedIds.includes(ing.id));
    const { error: upsertError } = await supabase
      .from(INGREDIENT_TABLE)
      .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });
    if (upsertError) {
      console.error("Lỗi khi cập nhật tồn kho lên database:", upsertError);
      throw upsertError;
    }
    await loadInventory({ force: true, silent: true });
  }

  // 3. Automatically record adjustments for variance to have a clean audit trail
  for (const item of newAudit.items) {
    if (item.variance !== 0) {
      await createInventoryAdjustment({
        ingredientId: item.ingredientId,
        type: item.variance > 0 ? "increase" : "decrease",
        quantity: Math.abs(item.variance),
        reason: `Lệch kiểm kho chốt ngày (Phiên ${newAudit.date})`,
      });
    }
  }

  return newAudit;
};

export type InternalReleaseItem = {
  ingredientId: string;
  quantity: number;
};

export type InternalRelease = {
  id: string;
  receiver: string;
  note?: string;
  items: InternalReleaseItem[];
  createdAt: string;
};

export type CreateInternalReleaseInput = Omit<InternalRelease, "id" | "createdAt">;

const RELEASE_STORAGE_KEY = "speedy-order-system:internal-releases";
const RELEASE_EVENT_NAME = "speedy-order-system:internal-releases-updated";

const defaultReleases: InternalRelease[] = [
  {
    id: "rel-1",
    receiver: "Quầy pha chế",
    note: "Xuất sữa tươi và trân châu đầu ca sáng",
    items: [
      {
        ingredientId: "ing-milk",
        quantity: 2000,
      },
      {
        ingredientId: "ing-boba",
        quantity: 1000,
      },
    ],
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
];

let releasesSnapshot: InternalRelease[] = [];
let releasesLoaded = false;
const releaseListeners = new Set<() => void>();

const notifyReleaseListeners = () => {
  for (const listener of releaseListeners) {
    listener();
  }
};

export const listInternalReleases = (): InternalRelease[] => {
  if (!releasesLoaded) {
    if (canUseDOM()) {
      try {
        const raw = window.localStorage.getItem(RELEASE_STORAGE_KEY);
        if (raw) {
          releasesSnapshot = JSON.parse(raw);
        } else {
          releasesSnapshot = defaultReleases;
          window.localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify(defaultReleases));
        }
      } catch {
        releasesSnapshot = defaultReleases;
      }
    } else {
      releasesSnapshot = defaultReleases;
    }
    releasesLoaded = true;
  }
  return releasesSnapshot;
};

export const subscribeInternalReleases = (listener: () => void) => {
  releaseListeners.add(listener);
  if (canUseDOM()) {
    const handleUpdate = () => {
      try {
        const raw = window.localStorage.getItem(RELEASE_STORAGE_KEY);
        if (raw) {
          releasesSnapshot = JSON.parse(raw);
        }
      } catch {
        // Keep current snapshot
      }
      listener();
    };
    window.addEventListener(RELEASE_EVENT_NAME, handleUpdate);
    return () => {
      releaseListeners.delete(listener);
      window.removeEventListener(RELEASE_EVENT_NAME, handleUpdate);
    };
  }
  return () => releaseListeners.delete(listener);
};

export const useInternalReleases = () =>
  useSyncExternalStore(subscribeInternalReleases, listInternalReleases, () => releasesSnapshot);

export const createInternalRelease = async (input: CreateInternalReleaseInput): Promise<InternalRelease> => {
  const newRelease: InternalRelease = {
    ...input,
    id: "rel-" + crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // 1. Save release log
  const releases = listInternalReleases();
  const nextReleases = [newRelease, ...releases];
  releasesSnapshot = nextReleases;

  if (canUseDOM()) {
    window.localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify(nextReleases));
    window.dispatchEvent(new CustomEvent(RELEASE_EVENT_NAME));
  }
  notifyReleaseListeners();

  // 2. Subtract from stock quantity
  const currentIngredients = inventorySnapshot.ingredients;
  const nextIngredients = currentIngredients.map((ingredient) => {
    const releaseItem = newRelease.items.find((item) => item.ingredientId === ingredient.id);
    if (releaseItem) {
      return {
        ...ingredient,
        stockQuantity: Math.max(0, ingredient.stockQuantity - releaseItem.quantity),
      };
    }
    return ingredient;
  });

  if (!supabase) {
    setInventorySnapshot({
      ...inventorySnapshot,
      ingredients: nextIngredients,
    });
  } else {
    // Sync update to supabase
    const changedIds = newRelease.items.map((item) => item.ingredientId);
    const changedIngredients = nextIngredients.filter((ing) => changedIds.includes(ing.id));
    const { error: upsertError } = await supabase
      .from(INGREDIENT_TABLE)
      .upsert(changedIngredients.map(toIngredientRow), { onConflict: "id" });
    if (upsertError) {
      console.error("Lỗi khi cập nhật tồn kho lên database:", upsertError);
      throw upsertError;
    }
    await loadInventory({ force: true, silent: true });
  }

  // 3. Automatically record adjustments for variance to have a clean audit trail
  for (const item of newRelease.items) {
    await createInventoryAdjustment({
      ingredientId: item.ingredientId,
      type: "decrease",
      quantity: item.quantity,
      reason: `Xuất kho nội bộ (Người nhận: ${newRelease.receiver})`,
    });
  }

  return newRelease;
};
