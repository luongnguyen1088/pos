import { useSyncExternalStore } from "react";
import {
  categories as defaultCategories,
  products as defaultProducts,
  type Category,
  type Product,
} from "@/data/products";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const CATEGORY_TABLE = "anvat_categories";
const PRODUCT_TABLE = "anvat_products";
const BUCKET_NAME = "product-images";

export const uploadProductImage = async (file: File): Promise<string> => {
  if (!supabase) throw new Error("Supabase is not configured");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `moka/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
};

export const listProductImages = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list("moka", {
    limit: 100,
    offset: 0,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    throw error;
  }

  return data
    .filter((file) => file.name !== ".emptyFolderPlaceholder")
    .map((file) => {
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`moka/${file.name}`);
      return {
        name: file.name,
        url: urlData.publicUrl,
        created_at: file.created_at,
        metadata: file.metadata,
      };
    });
};

export const deleteProductImage = async (fileName: string) => {
  if (!supabase) throw new Error("Supabase is not configured");

  const path = fileName.startsWith("moka/") ? fileName : `moka/${fileName}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw error;
  }
};

type CatalogSnapshot = {
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  error: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  image: string;
  variants: Product["variants"] | null;
  options: Product["options"] | null;
  is_onsite: boolean;
};

const STORAGE_KEY = "speedy-order-system:catalog";
const EVENT_NAME = "speedy-order-system:catalog-updated";

let catalogSnapshot: CatalogSnapshot = {
  categories: defaultCategories,
  products: defaultProducts,
  isLoading: isSupabaseConfigured,
  isSupabaseConfigured,
  error: null,
};

let loadPromise: Promise<void> | null = null;
let catalogChannelInitialized = false;

const listeners = new Set<() => void>();

const canUseDOM = () => typeof window !== "undefined";

const notifyCatalogListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

const getMissingCategoryIds = (categories: Array<{ id: string }>) => {
  const existingIds = new Set(categories.map((category) => category.id));
  return defaultCategories.filter((category) => !existingIds.has(category.id)).map((category) => category.id);
};

const getMissingProductIds = (products: Array<{ id: string }>) => {
  const existingIds = new Set(products.map((product) => product.id));
  return defaultProducts.filter((product) => !existingIds.has(product.id)).map((product) => product.id);
};

const hasExtraItems = (categories: Category[], products: Product[]) => {
  const defaultCategoryIds = new Set(defaultCategories.map(c => c.id));
  const defaultProductIds = new Set(defaultProducts.map(p => p.id));
  
  const hasExtraCategories = categories.some(c => !defaultCategoryIds.has(c.id));
  const hasExtraProducts = products.some(p => !defaultProductIds.has(p.id));
  
  return hasExtraCategories || hasExtraProducts;
};

const setCatalogSnapshot = (next: CatalogSnapshot) => {
  catalogSnapshot = next;

  if (!isSupabaseConfigured && canUseDOM()) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        categories: next.categories,
        products: next.products,
      }),
    );
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }

  notifyCatalogListeners();
};

const readLocalCatalog = () => {
  if (!canUseDOM()) {
    return {
      categories: defaultCategories,
      products: defaultProducts,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        categories: defaultCategories,
        products: defaultProducts,
      };
    }

    const parsed = JSON.parse(raw) as {
      categories?: Category[];
      products?: Product[];
    };

    const categories = parsed.categories?.length ? parsed.categories : defaultCategories;
    const products = parsed.products?.length ? parsed.products : defaultProducts;
    

    return {
      categories,
      products,
    };
  } catch {
    return {
      categories: defaultCategories,
      products: defaultProducts,
    };
  }
};

const normalizeCategoryRow = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
});

const normalizeProductRow = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),
  categoryId: row.category_id,
  image: row.image,
  variants: row.variants?.length ? row.variants : undefined,
  options: row.options?.length ? row.options : undefined,
  isOnsite: row.is_onsite,
});

const toCategoryRow = (category: Category): CategoryRow => ({
  id: category.id,
  name: category.name,
  icon: category.icon,
});

const toProductRow = (product: Product): ProductRow => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category_id: product.categoryId,
  image: product.image,
  variants: product.variants ?? [],
  options: product.options ?? [],
  is_onsite: product.isOnsite ?? true,
});

const seedSupabaseCatalog = async () => {
  if (!supabase) {
    return;
  }

  // Delete all existing categories and products first to ensure strict menu
  await Promise.all([
    supabase.from(CATEGORY_TABLE).delete().neq("id", "force-delete-all"),
    supabase.from(PRODUCT_TABLE).delete().neq("id", "force-delete-all"),
  ]);

  const { error: categoryError } = await supabase.from(CATEGORY_TABLE).upsert(
    defaultCategories.map(toCategoryRow),
    { onConflict: "id" },
  );
  if (categoryError) {
    throw categoryError;
  }

  const { error: productError } = await supabase.from(PRODUCT_TABLE).upsert(
    defaultProducts.map(toProductRow),
    { onConflict: "id" },
  );
  if (productError) {
    throw productError;
  }
};

const fetchCatalogFromSupabase = async () => {
  if (!supabase) {
    return readLocalCatalog();
  }

  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from(CATEGORY_TABLE).select("*").order("name"),
      supabase.from(PRODUCT_TABLE).select("*").order("name"),
    ]);

  if (categoryError) {
    throw categoryError;
  }

  if (productError) {
    throw productError;
  }

  // Only seed if both tables are empty
  if ((categoryRows?.length ?? 0) === 0 && (productRows?.length ?? 0) === 0) {
    await seedSupabaseCatalog();
    return fetchCatalogFromSupabase();
  }

  return {
    categories: (categoryRows ?? []).map((row) => normalizeCategoryRow(row as CategoryRow)),
    products: (productRows ?? []).map((row) => normalizeProductRow(row as ProductRow)),
  };
};

const initializeCatalogRealtime = () => {
  if (!supabase || catalogChannelInitialized) {
    return;
  }

  catalogChannelInitialized = true;

  supabase
    .channel("catalog-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: CATEGORY_TABLE },
      () => {
        void loadCatalog({ force: true, silent: true });
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: PRODUCT_TABLE },
      () => {
        void loadCatalog({ force: true, silent: true });
      },
    )
    .subscribe();
};

const loadCatalog = async (options?: { force?: boolean; silent?: boolean }) => {
  if (loadPromise && !options?.force) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!options?.silent) {
      catalogSnapshot = {
        ...catalogSnapshot,
        isLoading: true,
        error: null,
      };
      notifyCatalogListeners();
    }

    try {
      const nextCatalog = isSupabaseConfigured ? await fetchCatalogFromSupabase() : readLocalCatalog();

      setCatalogSnapshot({
        categories: nextCatalog.categories,
        products: nextCatalog.products,
        isLoading: false,
        isSupabaseConfigured,
        error: null,
      });

      initializeCatalogRealtime();
    } catch (error) {
      const fallbackCatalog = readLocalCatalog();
      setCatalogSnapshot({
        categories: fallbackCatalog.categories,
        products: fallbackCatalog.products,
        isLoading: false,
        isSupabaseConfigured,
        error: error instanceof Error ? error.message : "Không thể tải dữ liệu danh mục.",
      });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

const ensureCatalogLoaded = () => {
  void loadCatalog();
};

export const listCatalog = () => catalogSnapshot;

export const subscribeCatalog = (listener: () => void) => {
  listeners.add(listener);

  if (canUseDOM()) {
    ensureCatalogLoaded();

    const handleCatalogChange = () => {
      if (!isSupabaseConfigured) {
        const localCatalog = readLocalCatalog();
        catalogSnapshot = {
          ...catalogSnapshot,
          categories: localCatalog.categories,
          products: localCatalog.products,
        };
        notifyCatalogListeners();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        handleCatalogChange();
      }
    };

    window.addEventListener(EVENT_NAME, handleCatalogChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener(EVENT_NAME, handleCatalogChange);
      window.removeEventListener("storage", handleStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
};

const upsertCategoryLocal = (category: Category) => {
  const nextCategories = catalogSnapshot.categories.some((item) => item.id === category.id)
    ? catalogSnapshot.categories.map((item) => (item.id === category.id ? category : item))
    : [...catalogSnapshot.categories, category];

  setCatalogSnapshot({
    ...catalogSnapshot,
    categories: nextCategories,
  });
};

const deleteCategoryLocal = (categoryId: string) => {
  setCatalogSnapshot({
    ...catalogSnapshot,
    categories: catalogSnapshot.categories.filter((item) => item.id !== categoryId),
    products: catalogSnapshot.products.filter((item) => item.categoryId !== categoryId),
  });
};

const upsertProductLocal = (product: Product) => {
  const nextProducts = catalogSnapshot.products.some((item) => item.id === product.id)
    ? catalogSnapshot.products.map((item) => (item.id === product.id ? product : item))
    : [...catalogSnapshot.products, product];

  setCatalogSnapshot({
    ...catalogSnapshot,
    products: nextProducts,
  });
};

const deleteProductLocal = (productId: string) => {
  setCatalogSnapshot({
    ...catalogSnapshot,
    products: catalogSnapshot.products.filter((item) => item.id !== productId),
  });
};

export const saveCategory = async (category: Category) => {
  // Optimistic update
  upsertCategoryLocal(category);

  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase.from(CATEGORY_TABLE).upsert(toCategoryRow(category), {
      onConflict: "id",
    });
    if (error) throw error;
  } catch (err) {
    // Revert on error or handle it
    console.error("Error saving category to Supabase:", err);
    throw err;
  } finally {
    await loadCatalog({ force: true, silent: true });
  }
};

export const removeCategory = async (categoryId: string) => {
  // Optimistic delete
  deleteCategoryLocal(categoryId);

  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase.from(CATEGORY_TABLE).delete().eq("id", categoryId);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting category from Supabase:", err);
    throw err;
  } finally {
    await loadCatalog({ force: true, silent: true });
  }
};

export const saveProduct = async (product: Product) => {
  // Optimistic update
  upsertProductLocal(product);

  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase.from(PRODUCT_TABLE).upsert(toProductRow(product), {
      onConflict: "id",
    });
    if (error) throw error;
  } catch (err) {
    console.error("Error saving product to Supabase:", err);
    throw err;
  } finally {
    await loadCatalog({ force: true, silent: true });
  }
};

export const removeProduct = async (productId: string) => {
  // Optimistic delete
  deleteProductLocal(productId);

  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase.from(PRODUCT_TABLE).delete().eq("id", productId);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting product from Supabase:", err);
    throw err;
  } finally {
    await loadCatalog({ force: true, silent: true });
  }
};

export const useCatalog = () =>
  useSyncExternalStore(subscribeCatalog, listCatalog, () => catalogSnapshot);
