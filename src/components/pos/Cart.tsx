import { useState, useEffect } from "react";
import { type CartItem, type OrderType } from "@/data/products";
import {
  Trash2,
  MapPin,
  Bike,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { type DiscountDraft, type DiscountSummary } from "@/lib/discounts";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getCustomerByPhone, type Customer } from "@/lib/orders";
import { usePromotions } from "@/lib/promotions";
import { toast } from "sonner";

interface CartProps {
  items: CartItem[];
  discount: DiscountDraft;
  discountSummary: DiscountSummary;
  onDiscountChange: (discount: DiscountDraft) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: (
    orderType: OrderType,
    tableOrInfo: string,
    loyaltyData?: { customerPhone: string; customerName: string; spentPoints: number }
  ) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  initialOrderType?: OrderType;
  initialCustomerPhone?: string;
  initialCustomerName?: string;
  initialOrderInfo?: string;
  editingOrderNumber?: string;
  onCancelEdit?: () => void;
  isSubmitting?: boolean;
}

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const orderTypes: { type: OrderType; label: string; icon: React.ReactNode }[] = [
  { type: "dine-in", label: "Tại chỗ", icon: <MapPin className="h-4 w-4" /> },
  { type: "takeaway", label: "Mang đi", icon: <ShoppingBag className="h-4 w-4" /> },
  { type: "delivery", label: "Giao hàng", icon: <Bike className="h-4 w-4" /> },
];

const Cart = ({
  items,
  discount,
  discountSummary,
  onDiscountChange,
  onRemove,
  onClear,
  onCheckout,
  onUpdateQuantity,
  initialOrderType,
  initialCustomerPhone,
  initialCustomerName,
  initialOrderInfo,
  editingOrderNumber,
  onCancelEdit,
  isSubmitting,
}: CartProps) => {
  const { promotions } = usePromotions();
  const activePromotions = promotions.filter(p => p.isActive);

  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [deliveryInfo, setDeliveryInfo] = useState({ name: "", phone: "" });

  // Loyalty Points States
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [usePoints, setUsePoints] = useState(false);

  // Load initial values when editing an order
  useEffect(() => {
    if (initialOrderType) {
      setOrderType(initialOrderType);
    }
  }, [initialOrderType]);

  useEffect(() => {
    if (initialCustomerPhone) {
      setCustomerPhone(initialCustomerPhone);
      setCustomerName(initialCustomerName || "");
      const fetchCustomer = async () => {
        setIsSearching(true);
        try {
          const res = await getCustomerByPhone(initialCustomerPhone);
          if (res) {
            setFoundCustomer(res);
            setIsNewCustomer(false);
          }
        } catch (e) {
          console.error("Lỗi tìm kiếm khách hàng cũ:", e);
        } finally {
          setIsSearching(false);
        }
      };
      void fetchCustomer();
    } else {
      setCustomerPhone("");
      setCustomerName("");
      setFoundCustomer(null);
      setIsNewCustomer(false);
      setUsePoints(false);
    }
  }, [initialCustomerPhone, initialCustomerName]);

  useEffect(() => {
    if (initialOrderInfo && initialOrderType === "delivery") {
      const parts = initialOrderInfo.split(" - ");
      if (parts.length >= 2) {
        setDeliveryInfo({ name: parts[0], phone: parts[1] });
      }
    } else {
      setDeliveryInfo({ name: "", phone: "" });
    }
  }, [initialOrderInfo, initialOrderType]);

  const subtotal = discountSummary.subtotal;
  const total = discountSummary.total;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePhoneChange = async (phoneStr: string) => {
    setCustomerPhone(phoneStr);
    const cleaned = phoneStr.trim();
    
    if (cleaned.length === 0) {
      setFoundCustomer(null);
      setIsNewCustomer(false);
      setCustomerName("");
      setUsePoints(false);
      return;
    }

    if (cleaned.length >= 9) {
      setIsSearching(true);
      try {
        const customer = await getCustomerByPhone(cleaned);
        if (customer) {
          setFoundCustomer(customer);
          setIsNewCustomer(false);
          setCustomerName(customer.name || "");
        } else {
          setFoundCustomer(null);
          setIsNewCustomer(true);
          setCustomerName("");
        }
      } catch (error) {
        console.error("Lỗi tìm kiếm khách hàng:", error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setFoundCustomer(null);
      setIsNewCustomer(false);
      setCustomerName("");
      setUsePoints(false);
    }
  };

  const maxRedeemablePoints = foundCustomer && foundCustomer.points >= 10000
    ? Math.min(foundCustomer.points, Math.floor(total / 1000) * 1000)
    : 0;

  const pointsDiscountAmount = usePoints ? maxRedeemablePoints : 0;
  const finalTotal = Math.max(0, total - pointsDiscountAmount);

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }

    let info = "";
    if (orderType === "delivery") {
      info = `${deliveryInfo.name} - ${deliveryInfo.phone}`;
    }

    if (isMobile) {
      setIsOpen(false);
    }

    const loyaltyData = customerPhone.trim().length >= 9
      ? {
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim(),
          spentPoints: usePoints ? maxRedeemablePoints : 0,
        }
      : undefined;

    onCheckout(orderType, info, loyaltyData);
  };

  const discountEditor = (
    <>
      {activePromotions.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block pl-0.5">
            Chọn mã khuyến mãi nhanh
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-dashed border-border rounded-xl bg-card">
            {activePromotions.map((p) => {
              const isSelected = discount.value === p.discountValue && discount.type === p.discountType;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    if (subtotal < p.minOrderValue) {
                      toast.error(`Đơn tối thiểu ${formatPrice(p.minOrderValue)} để áp dụng mã ${p.code}`);
                      return;
                    }
                    onDiscountChange({ type: p.discountType, value: p.discountValue });
                    toast.success(`Đã áp dụng mã ${p.code}`);
                  }}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-lg font-bold border transition-all active:scale-95",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  )}
                  title={p.description || ""}
                >
                  {p.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="inline-flex rounded-xl border border-border bg-muted p-1">
        <button
          onClick={() => onDiscountChange({ type: "amount", value: discount.value })}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            discount.type === "amount"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          Số tiền
        </button>
        <button
          onClick={() => onDiscountChange({ type: "percent", value: discount.value })}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            discount.type === "percent"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          %
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min="0"
          value={discount.value === 0 ? "" : String(discount.value)}
          onChange={(event) =>
            onDiscountChange({
              type: discount.type,
              value: Number(event.target.value) || 0,
            })
          }
          placeholder={discount.type === "percent" ? "Ví dụ 10" : "Ví dụ 20000"}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="shrink-0 rounded-xl bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground">
          {discount.type === "percent" ? "%" : "VND"}
        </div>
      </div>
    </>
  );

  const cartContent = (
    <>
      {editingOrderNumber && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 px-3 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
          <span className="truncate">✏️ Đang sửa đơn #{editingOrderNumber}</span>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 transition-all active:scale-95"
            >
              Hủy sửa
            </button>
          )}
        </div>
      )}
      {/* Desktop Cart Header */}
      {!isMobile && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5 bg-muted/40 sm:px-4">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Đơn hàng hiện tại</span>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              title="Xóa toàn bộ giỏ hàng"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa giỏ</span>
            </button>
          )}
        </div>
      )}

      <div className="border-b border-border p-3 sm:p-4">
        <div className="flex gap-1">
          {orderTypes.map((option) => (
            <button
              key={option.type}
              onClick={() => setOrderType(option.type)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-[11px] font-semibold transition-all sm:text-xs",
                orderType === option.type
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {option.icon}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>

        {orderType === "delivery" ? (
          <div className="mt-2 space-y-1.5">
            <input
              placeholder="Tên khách"
              value={deliveryInfo.name}
              onChange={(event) =>
                setDeliveryInfo((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <input
              placeholder="Số điện thoại"
              value={deliveryInfo.phone}
              onChange={(event) =>
                setDeliveryInfo((previous) => ({ ...previous, phone: event.target.value }))
              }
              className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
        {items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingBag className="mb-2 h-12 w-12 opacity-30" />
            <p className="text-sm">Chưa có sản phẩm</p>
            <p className="mt-1 text-xs">Thêm món rồi mở giỏ để thanh toán.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group relative rounded-xl bg-muted p-3">
              <button
                onClick={() => onRemove(item.id)}
                className="absolute right-2 top-2 rounded-lg p-1.5 opacity-100 transition-all hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Xóa ${item.product.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
              <div className="flex flex-col gap-1 pr-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.product.name}
                  </p>
                  {item.variant ? (
                    <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                  ) : null}
                  {item.selectedOptions.length > 0 ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.selectedOptions.map((option) => option.name).join(", ")}
                    </p>
                  ) : null}
                  {item.note ? (
                    <p className="text-xs italic text-primary">📝 {item.note}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 mt-2 border-t border-border/40 pt-2">
                  {/* Quantity Adjuster */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQuantity ? onUpdateQuantity(item.id, item.quantity - 1) : onRemove(item.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all"
                    >
                      <span className="text-xs font-bold">-</span>
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all"
                    >
                      <span className="text-xs font-bold">+</span>
                    </button>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-foreground">
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 border-t-2 border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        {/* Loyalty Member Section */}
        <div className="rounded-2xl border border-border bg-background p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thành viên & Tích điểm</span>
          </div>
          
          <div className="relative">
            <input
              type="tel"
              placeholder="Nhập SĐT tích điểm..."
              value={customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary placeholder:text-muted-foreground/60"
            />
          </div>

          {isSearching && (
            <div className="text-[10px] text-muted-foreground animate-pulse pl-1">Đang tìm thành viên...</div>
          )}

          {!isSearching && foundCustomer && (
            <div className="rounded-xl bg-success/5 border border-success/20 p-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-success">✓ {foundCustomer.name || "Khách quen"}</span>
                <span className="font-black text-foreground">{new Intl.NumberFormat("vi-VN").format(foundCustomer.points)} điểm</span>
              </div>
              {foundCustomer.points >= 10000 ? (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold pt-1 border-t border-success/10">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Dùng {new Intl.NumberFormat("vi-VN").format(maxRedeemablePoints)} điểm (Giảm -{formatPrice(maxRedeemablePoints)})</span>
                </label>
              ) : (
                <div className="text-[10px] text-muted-foreground border-t border-success/10 pt-1">
                  Cần tối thiểu 10.000 điểm để quy đổi giảm giá.
                </div>
              )}
            </div>
          )}

          {!isSearching && isNewCustomer && customerPhone.length >= 9 && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-2 space-y-2">
              <div className="text-xs font-bold text-primary">⭐ Thành viên mới!</div>
              <input
                type="text"
                placeholder="Nhập tên khách hàng mới..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
            </div>
          )}
        </div>

        {/* Collapsible Discount Accodion */}
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <button
            type="button"
            onClick={() => setIsDiscountOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giảm giá & Ưu đãi</span>
              {discountSummary.amount > 0 ? (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-black text-success">
                  - {formatPrice(discountSummary.amount)}
                </span>
              ) : null}
            </div>
            {isDiscountOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isDiscountOpen && (
            <div className="mt-2.5 border-t border-border/50 pt-2.5">
              {discountEditor}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {discountSummary.amount > 0
                  ? `Đang giảm ${formatPrice(discountSummary.amount)}`
                  : "Chưa áp dụng giảm giá"}
              </p>
            </div>
          )}
        </div>

        {!isMobile && (discountSummary.amount > 0 || pointsDiscountAmount > 0) && (
          <div className="space-y-1 rounded-2xl bg-muted/60 p-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountSummary.amount > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Giảm giá</span>
                <span>- {formatPrice(discountSummary.amount)}</span>
              </div>
            )}
            {pointsDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Dùng điểm</span>
                <span>- {formatPrice(pointsDiscountAmount)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between py-1">
          <span className="text-base font-bold text-foreground">Tổng cộng</span>
          <span className="text-lg font-black text-primary">{formatPrice(finalTotal)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={items.length === 0 || isSubmitting}
          className="w-full rounded-2xl bg-primary py-3.5 text-base font-black text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            "THANH TOÁN"
          )}
        </button>
      </div>
    </>
  );

  if (!isMobile) {
    return (
      <div className="flex h-full w-full flex-col border-l-2 border-border bg-card lg:w-[380px]">
        {cartContent}
      </div>
    );
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[86dvh] rounded-t-[28px] border-border bg-card">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-2 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle>Giỏ hàng</DrawerTitle>
                <DrawerDescription>
                  {itemCount} món • {formatPrice(finalTotal)}
                </DrawerDescription>
              </div>
              <DrawerClose className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Đóng
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex h-full flex-col overflow-hidden">{cartContent}</div>
        </DrawerContent>
      </Drawer>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto flex w-full items-center justify-between rounded-3xl border border-border bg-card px-4 py-3 text-left shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.35)]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                {itemCount}
              </span>
              <span className="text-sm font-semibold text-foreground">Xem giỏ hàng</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {itemCount === 0
                ? "Chưa có món nào"
                : `${formatPrice(finalTotal)} • Vuốt lên để thanh toán`}
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-base font-bold">{formatPrice(finalTotal)}</span>
            <ChevronUp className="h-5 w-5" />
          </div>
        </button>
      </div>
    </>
  );
};

export default Cart;
