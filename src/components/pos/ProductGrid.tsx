import { type Product } from "@/data/products";
import { ProductImage } from "./ProductImage";

interface ProductGridProps {
  categoryId: string;
  products: Product[];
  isLoading?: boolean;
  onSelect: (product: Product) => void;
  outOfStockMap?: Record<string, boolean>;
}

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const ProductGrid = ({
  categoryId,
  products,
  isLoading = false,
  onSelect,
  outOfStockMap = {},
}: ProductGridProps) => {
  const filteredProducts = products.filter((product) => product.categoryId === categoryId);

  if (isLoading) {
    return (
      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-2 pb-24 sm:grid-cols-3 sm:pb-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-border bg-card p-3 animate-pulse sm:min-h-[140px]"
          >
            <div className="h-16 w-16 rounded-xl bg-muted/60 sm:h-20 sm:w-20" />
            <div className="h-3 w-3/4 rounded bg-muted/70" />
            <div className="h-3 w-1/2 rounded bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Chưa có sản phẩm trong danh mục này.
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-2 pb-24 sm:grid-cols-3 sm:pb-3 lg:grid-cols-5 xl:grid-cols-6">
      {filteredProducts.map((product) => {
        const isOos = outOfStockMap[product.id] ?? false;
        return (
          <button
            key={product.id}
            onClick={() => !isOos && onSelect(product)}
            disabled={isOos}
            className={`relative flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-border bg-card p-3 transition-all ${
              isOos
                ? "cursor-not-allowed opacity-50 bg-muted/30"
                : "hover:border-primary hover:shadow-md active:scale-95"
            }`}
          >
            {/* Badges */}
            {product.badge && !isOos && (
              <span
                className={`absolute left-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm ${
                  product.badge === "best"
                    ? "bg-gradient-to-r from-red-500 to-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500"
                }`}
              >
                {product.badge === "best" ? "🔥 BEST" : "✨ NEW"}
              </span>
            )}

            {/* Out of Stock Overlay */}
            {isOos && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[18px] bg-background/85 backdrop-blur-[0.5px]">
                <span className="rounded bg-destructive px-1.5 py-0.5 text-[9px] font-black tracking-wider text-destructive-foreground shadow-md">
                  HẾT HÀNG
                </span>
              </div>
            )}

            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-muted/50 sm:h-20 sm:w-20">
              <ProductImage image={product.image} name={product.name} />
            </div>
            <span className="line-clamp-2 text-center text-xs font-semibold leading-tight text-foreground">
              {product.name}
            </span>
            <span className="text-xs font-bold text-primary sm:text-sm">
              {formatPrice(product.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ProductGrid;
