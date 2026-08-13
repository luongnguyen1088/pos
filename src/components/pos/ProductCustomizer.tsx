import { useState } from "react";
import { X } from "lucide-react";
import { type Product, type CartItem, type ProductVariant } from "@/data/products";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductImage } from "./ProductImage";

interface Props {
  product: Product;
  onAdd: (item: CartItem) => void;
  onClose: () => void;
}

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const ProductCustomizer = ({ product, onAdd, onClose }: Props) => {
  const isMobile = useIsMobile();
  const [variant, setVariant] = useState<ProductVariant | undefined>(product.variants?.[0]);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  const toggleChoice = (optionId: string, choiceId: string, type: "single" | "multi") => {
    setSelectedChoices((previous) => {
      if (type === "single") {
        return { ...previous, [optionId]: [choiceId] };
      }

      const current = previous[optionId] || [];
      return {
        ...previous,
        [optionId]: current.includes(choiceId)
          ? current.filter((choice) => choice !== choiceId)
          : [...current, choiceId],
      };
    });
  };

  const calcTotal = () => {
    let total = product.price + (variant?.priceAdd || 0);

    product.options?.forEach((option) => {
      (selectedChoices[option.id] || []).forEach((choiceId) => {
        const choice = option.choices.find((item) => item.id === choiceId);
        if (choice) {
          total += choice.priceAdd;
        }
      });
    });

    return total * quantity;
  };

  const handleAdd = () => {
    const selectedOptions: CartItem["selectedOptions"] = [];

    product.options?.forEach((option) => {
      (selectedChoices[option.id] || []).forEach((choiceId) => {
        const choice = option.choices.find((item) => item.id === choiceId);
        if (choice) {
          selectedOptions.push({
            optionId: option.id,
            choiceId,
            name: choice.name,
            priceAdd: choice.priceAdd,
          });
        }
      });
    });

    onAdd({
      id: crypto.randomUUID(),
      product,
      variant,
      selectedOptions,
      note,
      quantity,
      totalPrice: calcTotal(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-card shadow-2xl",
          isMobile
            ? "flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px]"
            : "flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-2xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-muted/50 sm:h-20 sm:w-20">
              <ProductImage image={product.image} name={product.name} fallbackClassName="text-3xl sm:text-4xl" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-foreground sm:text-xl">
                {product.name}
              </h3>
              <p className="font-semibold text-primary">{formatPrice(product.price)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pb-6 sm:pb-4">
          {product.variants ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">SIZE</h4>
              <div className="grid grid-cols-3 gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setVariant(item)}
                    className={cn(
                      "min-h-14 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
                      variant?.id === item.id
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border text-foreground hover:border-primary/50",
                    )}
                  >
                    {item.name}
                    {item.priceAdd > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        +{formatPrice(item.priceAdd)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.options?.map((option) => (
            <div key={option.id}>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                {option.name.toUpperCase()} {option.type === "multi" ? "(chọn nhiều)" : ""}
              </h4>
              <div className="flex flex-wrap gap-2">
                {option.choices.map((choice) => {
                  const selected = (selectedChoices[option.id] || []).includes(choice.id);

                  return (
                    <button
                      key={choice.id}
                      onClick={() => toggleChoice(option.id, choice.id, option.type)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all",
                        selected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border text-foreground hover:border-primary/50",
                      )}
                    >
                      {choice.name}
                      {choice.priceAdd > 0 ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{formatPrice(choice.priceAdd)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">GHI CHÚ</h4>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: không hành, ít cay..."
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-12 w-12 rounded-xl border-2 border-border text-xl font-bold transition-all hover:bg-muted"
            >
              -
            </button>
            <span className="w-12 text-center text-2xl font-bold text-foreground">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-12 w-12 rounded-xl border-2 border-border text-xl font-bold transition-all hover:bg-muted"
            >
              +
            </button>
          </div>
        </div>

        <div className="border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleAdd}
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Thêm vào giỏ — {formatPrice(calcTotal())}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCustomizer;
