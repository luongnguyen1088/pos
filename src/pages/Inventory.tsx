import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChefHat,
  ClipboardList,
  FlaskConical,
  Package,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Trash,
  Wallet,
  Search,
  Calendar,
  FileText,
  ExternalLink,
  X,
  ChevronRight,
  Banknote,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCatalog } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  removeIngredient,
  saveIngredient,
  saveProductRecipe,
  useInventory,
  usePurchaseOrders,
  createPurchaseOrder,
  useInventoryAdjustments,
  createInventoryAdjustment,
  useInventoryAudits,
  createInventoryAudit,
  useInternalReleases,
  createInternalRelease,
  type Ingredient,
  type ProductRecipeItem,
  type PurchaseOrder,
  type InventoryAdjustment,
  type InventoryAudit,
  type InventoryAuditItem,
  type InternalRelease,
  type InternalReleaseItem,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";

type InventoryView = "inventory" | "recipes" | "purchase_orders" | "audits";

const IngredientForm = ({
  initial,
  onSave,
  onCancel,
  isMobile,
}: {
  initial?: Ingredient;
  onSave: (ingredient: Ingredient) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean;
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [unit, setUnit] = useState(initial?.unit || "ml");
  const [stockQuantity, setStockQuantity] = useState(initial?.stockQuantity || 0);
  const [lowStockThreshold, setLowStockThreshold] = useState(initial?.lowStockThreshold || 0);
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        id: initial?.id || crypto.randomUUID(),
        name: name.trim(),
        unit: unit.trim(),
        stockQuantity,
        lowStockThreshold,
        purchasePrice: purchasePrice > 0 ? purchasePrice : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const presetUnits = ["ml", "g", "kg", "cái", "hộp", "lon", "vắt"];

  return (
    <div className={cn("space-y-5 border border-border bg-card shadow-2xl transition-all relative", isMobile ? "rounded-[28px] p-5" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="text-base font-black uppercase tracking-wider text-primary">
          {initial ? "✏️ Cập nhật nguyên liệu" : "➕ Thêm nguyên liệu mới"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tên nguyên liệu */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tên nguyên liệu</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="VD: Trà đen, Trân châu..."
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
          />
        </div>

        {/* Đơn vị đo lường & Chọn nhanh */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Đơn vị tính</label>
          <div className="flex gap-2">
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="Đơn vị"
              className="w-24 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
            />
            <div className="flex-1 flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
              {presetUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border",
                    unit === u
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Đơn giá nhập đơn vị */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Đơn giá nhập định mức (VND)</label>
          <input
            type="number"
            value={purchasePrice || ""}
            onChange={(event) => setPurchasePrice(Number(event.target.value))}
            placeholder="Ví dụ: 100đ, 3500đ..."
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
            min={0}
          />
        </div>

        {/* Tồn hiện tại */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Số lượng tồn kho hiện tại</label>
          <input
            type="number"
            value={stockQuantity}
            onChange={(event) => setStockQuantity(Number(event.target.value))}
            placeholder="Tồn hiện tại"
            disabled={Boolean(initial)}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground disabled:opacity-60 disabled:bg-muted/40"
          />
          {initial && (
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">
              ⚠️ Số tồn chỉ sửa qua Phiếu nhập hoặc Phiếu điều chỉnh.
            </p>
          )}
        </div>

        {/* Ngưỡng cảnh báo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ngưỡng cảnh báo sắp hết</label>
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(event) => setLowStockThreshold(Number(event.target.value))}
            placeholder="Ngưỡng cảnh báo"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
          />
        </div>
      </div>

      <div className={cn("flex gap-2 pt-2", isMobile ? "grid grid-cols-2" : "justify-end")}>
        <button
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
        >
          Hủy bỏ
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving || !name.trim() || !unit.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 transition-opacity"
        >
          {isSaving ? "Đang lưu..." : "Lưu nguyên liệu"}
        </button>
      </div>
    </div>
  );
};

const IngredientCombobox = ({
  ingredients,
  value,
  onChange,
  disabledIngredients = [],
}: {
  ingredients: Ingredient[];
  value: string;
  onChange: (val: string) => void;
  disabledIngredients?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const selectedIng = ingredients.find((ing) => ing.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-medium hover:bg-muted/50 transition-colors"
        >
          <span className="truncate">
            {selectedIng ? `${selectedIng.name} (${selectedIng.unit})` : "Chọn nguyên liệu..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm nguyên liệu..." />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>Không tìm thấy nguyên liệu nào.</CommandEmpty>
            <CommandGroup>
              {ingredients.map((ing) => {
                const isDisabled = disabledIngredients.includes(ing.id) && ing.id !== value;
                return (
                  <CommandItem
                    key={ing.id}
                    value={ing.name.toLowerCase()}
                    disabled={isDisabled}
                    onSelect={() => {
                      onChange(ing.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-2 py-2 text-sm cursor-pointer rounded-lg",
                      isDisabled ? "opacity-40 cursor-not-allowed" : ""
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{ing.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Đơn vị: {ing.unit} | Tồn: {ing.stockQuantity}
                      </span>
                    </div>
                    {value === ing.id && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const NumericInput = ({
  value,
  onChange,
  placeholder,
  className,
  prefix,
  suffix,
  min = 0,
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  min?: number;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value === 0 ? "" : value.toString());
    }
  }, [value, isFocused]);

  const displayValue = isFocused
    ? inputValue
    : value === 0
    ? ""
    : new Intl.NumberFormat("vi-VN").format(value);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/[^0-9,.]/g, "");
    setInputValue(cleanVal);

    const normalized = cleanVal.replace(/\./g, "").replace(/,/g, ".");
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      onChange(Math.max(min, num));
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = inputValue.replace(/\./g, "").replace(/,/g, ".");
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      const clamped = Math.max(min, num);
      onChange(clamped);
      setInputValue(clamped.toString());
    } else {
      onChange(0);
      setInputValue("");
    }
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && prefix}
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => {
          setIsFocused(true);
          setInputValue(value === 0 ? "" : value.toString());
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {suffix && suffix}
    </div>
  );
};

const POCreatorForm = ({
  ingredients,
  onSave,
  onCancel,
  isMobile,
}: {
  ingredients: Ingredient[];
  onSave: (order: {
    supplierName: string;
    note: string;
    items: Omit<PurchaseOrderItem, "id">[];
    totalAmount: number;
    status: "completed" | "pending";
  }) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean;
}) => {
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Array<{ ingredientId: string; quantity: number; price: number }>>([
    { ingredientId: ingredients[0]?.id || "", quantity: 1, price: ingredients[0]?.purchasePrice || 0 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [items]);

  const handleAddItem = () => {
    setItems([...items, { ingredientId: ingredients[0]?.id || "", quantity: 1, price: ingredients[0]?.purchasePrice || 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "ingredientId" | "quantity" | "price", value: string | number) => {
    const next = [...items];
    let nextItem = { ...next[index], [field]: value } as any;
    if (field === "ingredientId") {
      const selectedIng = ingredients.find(ing => ing.id === value);
      nextItem.price = selectedIng?.purchasePrice || 0;
    }
    next[index] = nextItem;
    setItems(next);
  };

  const lowStockIngredients = useMemo(() => {
    return ingredients.filter(
      (ing) => ing.lowStockThreshold > 0 && ing.stockQuantity <= ing.lowStockThreshold
    );
  }, [ingredients]);

  const handleImportLowStock = () => {
    const newItems = lowStockIngredients.map((ing) => ({
      ingredientId: ing.id,
      quantity: Math.max(1, ing.lowStockThreshold * 2 - ing.stockQuantity),
      price: ing.purchasePrice || 0,
    }));

    if (newItems.length === 0) {
      toast.info("Không có nguyên liệu nào đang sắp hết hàng!");
      return;
    }

    if (items.length === 1 && items[0].quantity === 1 && items[0].price === 0 && items[0].ingredientId === ingredients[0]?.id) {
      setItems(newItems);
      toast.success(`Đã tự động thêm ${newItems.length} nguyên liệu sắp hết hàng!`);
    } else {
      const existingIds = new Set(items.map((item) => item.ingredientId));
      const filteredNew = newItems.filter((item) => !existingIds.has(item.ingredientId));
      if (filteredNew.length > 0) {
        setItems([...items, ...filteredNew]);
        toast.success(`Đã thêm nhanh ${filteredNew.length} nguyên liệu sắp hết hàng!`);
      } else {
        toast.info("Tất cả nguyên liệu sắp hết đã có trong danh sách");
      }
    }
  };

  const selectedIngredientIds = useMemo(() => {
    return items.map((item) => item.ingredientId);
  }, [items]);

  const handleSubmit = async () => {
    if (!supplierName.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }
    const validItems = items.filter((item) => item.ingredientId && item.quantity > 0 && item.price >= 0);
    if (validItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất một nguyên liệu nhập kho hợp lệ");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        supplierName: supplierName.trim(),
        note: note.trim(),
        items: validItems,
        totalAmount,
        status: "completed",
      });
    } catch (err) {
      toast.error("Không thể lưu phiếu nhập kho");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-5 border border-border bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          📥 Tạo phiếu nhập kho mới
        </h3>
        <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nhà cung cấp *</label>
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Tên nhà cung cấp (VD: Chợ đầu mối, Cty Đại Việt...)"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú phiếu nhập (VD: Thanh toán tiền mặt, nhập bù...)"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
          />
        </div>
      </div>

      {/* Item rows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách nguyên liệu nhập</label>
          {lowStockIngredients.length > 0 && (
            <button
              type="button"
              onClick={handleImportLowStock}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <span>⚠️ Thêm nhanh {lowStockIngredients.length} nguyên liệu sắp hết</span>
            </button>
          )}
        </div>
        
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {/* Desktop Column Headers */}
          {!isMobile && (
            <div className="grid grid-cols-[1fr_120px_140px_110px_44px] gap-2 px-1 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div>Nguyên liệu</div>
              <div>Số lượng</div>
              <div>Đơn giá (đ)</div>
              <div className="text-right pr-2">Thành tiền</div>
              <div></div>
            </div>
          )}

          {items.map((item, index) => {
            const selectedIng = ingredients.find((i) => i.id === item.ingredientId);
            return (
              <div
                key={index}
                className={cn(
                  "gap-2 items-center",
                  isMobile
                    ? "rounded-2xl border border-border p-3 space-y-2 bg-background/50"
                    : "grid grid-cols-[1fr_120px_140px_110px_44px]"
                )}
              >
                {/* Searchable Select Ingredient */}
                <div>
                  <IngredientCombobox
                    ingredients={ingredients}
                    value={item.ingredientId}
                    onChange={(val) => handleItemChange(index, "ingredientId", val)}
                    disabledIngredients={selectedIngredientIds}
                  />
                </div>

                {/* Quantity */}
                <NumericInput
                  value={item.quantity}
                  onChange={(val) => handleItemChange(index, "quantity", val)}
                  placeholder="Số lượng"
                  className="w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-sm text-foreground font-bold outline-none focus:border-primary"
                  min={1}
                  suffix={
                    <span className="absolute right-3 text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none select-none">
                      {selectedIng?.unit || ""}
                    </span>
                  }
                />

                {/* Price */}
                <NumericInput
                  value={item.price}
                  onChange={(val) => handleItemChange(index, "price", val)}
                  placeholder="Đơn giá"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-bold outline-none focus:border-primary pl-7"
                  min={0}
                  prefix={
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">đ</span>
                  }
                />

                {/* Row Total */}
                <div className="text-right pr-2 text-sm font-black text-foreground/80">
                  {isMobile ? "Thành tiền: " : ""}
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.quantity * item.price)}
                </div>

                {/* Remove button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="rounded-xl h-10 w-10 border border-border text-muted-foreground hover:border-destructive/20 hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center justify-center disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="text-sm font-bold text-primary hover:underline"
        >
          + Thêm nguyên liệu nhập
        </button>
      </div>

      {/* Footer / Summary */}
      <div className="border-t border-border pt-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Tổng giá trị phiếu nhập:</div>
          <div className="text-2xl font-black text-primary">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Đang lưu..." : "Xác nhận nhập kho"}
          </button>
        </div>
      </div>
    </div>
  );
};

const PODetailView = ({
  order,
  ingredients,
  onClose,
  isMobile,
}: {
  order: PurchaseOrder;
  ingredients: Ingredient[];
  onClose: () => void;
  isMobile: boolean;
}) => {
  const getIngredientName = (id: string) => {
    const ing = ingredients.find((i) => i.id === id);
    return ing ? `${ing.name} (${ing.unit})` : "Nguyên liệu không xác định";
  };

  return (
    <div className={cn("space-y-5 border border-border bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
            Thành công
          </span>
          <h3 className="text-lg font-bold text-foreground mt-1.5 flex items-center gap-2">
            📄 Chi tiết phiếu nhập: PO-{order.id.substring(3, 7).toUpperCase()}
          </h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="space-y-1">
          <div className="text-muted-foreground font-semibold">Nhà cung cấp:</div>
          <div className="font-bold text-foreground text-base">{order.supplierName}</div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground font-semibold">Ngày nhập kho:</div>
          <div className="font-bold text-foreground">
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </div>
        </div>
        {order.note && (
          <div className="space-y-1 sm:col-span-2">
            <div className="text-muted-foreground font-semibold">Ghi chú:</div>
            <div className="text-foreground italic">{order.note}</div>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách nguyên liệu đã nhập</div>
        
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-background/30">
          {order.items.map((item, index) => (
            <div
              key={item.id || index}
              className={cn(
                "flex justify-between items-center p-3 text-sm",
                isMobile ? "flex-col items-start gap-1" : ""
              )}
            >
              <div className="font-bold text-foreground">
                {getIngredientName(item.ingredientId)}
              </div>
              <div className={cn("flex gap-8 items-center", isMobile ? "w-full justify-between mt-1" : "")}>
                <div className="text-muted-foreground font-semibold">
                  Số lượng: <span className="text-foreground font-black">{item.quantity}</span>
                </div>
                <div className="text-muted-foreground font-semibold">
                  Đơn giá: <span className="text-foreground font-bold">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.price)}</span>
                </div>
                <div className="font-black text-foreground text-right min-w-[100px]">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.quantity * item.price)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-border pt-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tổng giá trị phiếu nhập</div>
          <div className="text-2xl font-black text-primary">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.totalAmount)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

const StockAdjustmentForm = ({
  ingredient,
  onSave,
  onCancel,
  isMobile,
}: {
  ingredient: Ingredient;
  onSave: (adj: {
    ingredientId: string;
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean;
}) => {
  const [type, setType] = useState<"increase" | "decrease">("decrease");
  const [quantity, setQuantity] = useState(1);
  const [reasonCategory, setReasonCategory] = useState("Hao hụt pha chế");
  const [customReason, setCustomReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reasonsMap: Record<"increase" | "decrease", string[]> = {
    decrease: ["Hao hụt pha chế", "Hao phí nguyên liệu", "Hỏng / Hết hạn", "Khác"],
    increase: ["Kiểm kho định kỳ", "Bù tồn kho lẻ", "Khác"],
  };

  const handleSave = async () => {
    if (quantity <= 0) {
      toast.error("Vui lòng nhập số lượng lớn hơn 0");
      return;
    }
    
    const finalReason = reasonCategory === "Khác"
      ? (customReason.trim() || "Lý do khác")
      : reasonCategory;

    setIsSaving(true);
    try {
      await onSave({
        ingredientId: ingredient.id,
        type,
        quantity,
        reason: finalReason,
      });
      toast.success("Điều chỉnh kho thành công");
    } catch {
      toast.error("Không thể điều chỉnh tồn kho");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-4 border border-border bg-card shadow-2xl transition-all", isMobile ? "rounded-[28px] p-5" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="text-base font-black uppercase tracking-wider text-warning flex items-center gap-1.5">
          🛠️ Điều chỉnh tồn: {ingredient.name}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Tồn hiện tại: <strong className="text-foreground">{ingredient.stockQuantity} {ingredient.unit}</strong>. Số lượng thay đổi sẽ được cộng/trừ trực tiếp và ghi nhật ký kiểm kho.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Type adjustment */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hình thức</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("decrease");
                setReasonCategory(reasonsMap.decrease[0]);
              }}
              className={cn(
                "rounded-xl py-2.5 text-xs font-bold border transition-colors",
                type === "decrease"
                  ? "border-rose-200 bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              📉 Giảm hao phí
            </button>
            <button
              type="button"
              onClick={() => {
                setType("increase");
                setReasonCategory(reasonsMap.increase[0]);
              }}
              className={cn(
                "rounded-xl py-2.5 text-xs font-bold border transition-colors",
                type === "increase"
                  ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              📈 Tăng cân kho
            </button>
          </div>
        </div>

        {/* Quantity delta */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Số lượng điều chỉnh ({ingredient.unit})</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Nhập số lượng lệch..."
            min={1}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
          />
        </div>

        {/* Reason category */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lý do điều chỉnh</label>
          <div className="flex flex-wrap gap-1">
            {reasonsMap[type].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setReasonCategory(reason)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border",
                  reasonCategory === reason
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Custom reason */}
        {reasonCategory === "Khác" && (
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chi tiết lý do khác</label>
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập lý do điều chỉnh cụ thể..."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || quantity <= 0}
          className="rounded-xl bg-warning px-5 py-2 text-sm font-bold text-warning-foreground disabled:opacity-50 transition-opacity"
        >
          {isSaving ? "Đang điều chỉnh..." : "Xác nhận điều chỉnh"}
        </button>
      </div>
    </div>
  );
};

const AuditCreatorForm = ({
  ingredients,
  onSave,
  onCancel,
  isMobile,
}: {
  ingredients: Ingredient[];
  onSave: (audit: {
    date: string;
    status: "completed";
    items: InventoryAuditItem[];
    note?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean;
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [physicalValues, setPhysicalValues] = useState<Record<string, number>>(() => {
    const vals: Record<string, number> = {};
    ingredients.forEach((ing) => {
      vals[ing.id] = ing.stockQuantity;
    });
    return vals;
  });

  const handleInputChange = (id: string, value: number) => {
    setPhysicalValues((prev) => ({
      ...prev,
      [id]: Math.max(0, value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const items: InventoryAuditItem[] = ingredients.map((ing) => {
      const physicalQty = physicalValues[ing.id] ?? ing.stockQuantity;
      const theoreticalQty = ing.stockQuantity;
      return {
        ingredientId: ing.id,
        theoreticalQty,
        physicalQty,
        variance: physicalQty - theoreticalQty,
      };
    });

    try {
      await onSave({
        date,
        status: "completed",
        items,
        note: note.trim() || undefined,
      });
      toast.success("Đã hoàn tất phiên kiểm kho!");
    } catch {
      toast.error("Không thể lưu phiên kiểm kho");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4 border border-border bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div>
        <h2 className="text-lg font-black text-foreground">Phiên kiểm kho mới</h2>
        <p className="text-xs text-muted-foreground">
          Cân đong lượng nguyên liệu thực tế tại quầy bar và nhập số tồn chính xác để đối soát hao hụt.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ngày kiểm kho</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-primary text-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú phiên kiểm</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Kiểm kho chốt ca chiều..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary text-foreground"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background mt-4">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Nguyên liệu</th>
              <th className="p-3 text-center">ĐVT</th>
              <th className="p-3 text-right">Tồn hệ thống (Lý thuyết)</th>
              <th className="p-3 text-center">Tồn thực tế</th>
              <th className="p-3 text-right">Chênh lệch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
            {ingredients.map((ing) => {
              const physicalVal = physicalValues[ing.id] ?? ing.stockQuantity;
              const variance = physicalVal - ing.stockQuantity;

              return (
                <tr key={ing.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-bold text-foreground">{ing.name}</td>
                  <td className="p-3 text-center text-muted-foreground uppercase font-black text-[10px]">{ing.unit}</td>
                  <td className="p-3 text-right font-medium text-muted-foreground">{ing.stockQuantity}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      value={physicalVal}
                      onChange={(e) => handleInputChange(ing.id, Number(e.target.value))}
                      className="w-24 rounded-lg border border-border bg-card px-2 py-1 text-center font-bold text-sm outline-none focus:border-primary"
                      min={0}
                    />
                  </td>
                  <td className="p-3 text-right font-black">
                    {variance === 0 ? (
                      <span className="text-muted-foreground/60">-</span>
                    ) : variance > 0 ? (
                      <span className="text-emerald-600">+{variance}</span>
                    ) : (
                      <span className="text-rose-600">{variance}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={isSaving || ingredients.length === 0}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {isSaving ? "Đang lưu..." : "Xác nhận kết quả"}
        </button>
      </div>
    </form>
  );
};

const AuditDetailView = ({
  audit,
  ingredients,
  isMobile,
  onClose,
}: {
  audit: InventoryAudit;
  ingredients: Ingredient[];
  isMobile: boolean;
  onClose: () => void;
}) => {
  const formattedDate = new Date(audit.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("space-y-4 border border-border bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-primary text-sm uppercase tracking-wide">
              AUD-{audit.id.substring(3, 7).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">• {formattedDate}</span>
          </div>
          <h2 className="text-base font-bold text-foreground">Chi tiết đối soát chênh lệch kiểm kho</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-xl bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Ngày kiểm kho</div>
          <div className="mt-1 font-bold text-foreground">
            {new Date(audit.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        </div>
        <div className="rounded-xl bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Trạng thái</div>
          <div className="mt-1 font-bold text-emerald-600 flex items-center gap-1">
            🟢 Hoàn tất đối soát
          </div>
        </div>
        {audit.note && (
          <div className="rounded-xl bg-muted/20 p-3 sm:col-span-2">
            <div className="text-xs text-muted-foreground">Ghi chú phiên kiểm</div>
            <div className="mt-1 font-medium text-foreground italic">"{audit.note}"</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background mt-4">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Nguyên liệu</th>
              <th className="p-3 text-center">ĐVT</th>
              <th className="p-3 text-right">Tồn hệ thống</th>
              <th className="p-3 text-right">Tồn thực tế</th>
              <th className="p-3 text-right">Chênh lệch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
            {audit.items.map((item) => {
              const ing = ingredients.find((i) => i.id === item.ingredientId);
              const ingName = ing ? ing.name : "Nguyên liệu";
              const ingUnit = ing ? ing.unit : "";

              return (
                <tr key={item.ingredientId} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-bold text-foreground">{ingName}</td>
                  <td className="p-3 text-center text-muted-foreground uppercase font-black text-[10px]">{ingUnit}</td>
                  <td className="p-3 text-right font-medium text-muted-foreground">{item.theoreticalQty}</td>
                  <td className="p-3 text-right font-bold text-foreground">{item.physicalQty}</td>
                  <td className="p-3 text-right font-black">
                    {item.variance === 0 ? (
                      <span className="text-muted-foreground/60">-</span>
                    ) : item.variance > 0 ? (
                      <span className="text-emerald-600">+{item.variance}</span>
                    ) : (
                      <span className="text-rose-600">{item.variance}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-3">
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          Đóng chi tiết
        </button>
      </div>
    </div>
  );
};

const InternalReleaseCreatorForm = ({
  ingredients,
  onSave,
  onCancel,
  isMobile,
}: {
  ingredients: Ingredient[];
  onSave: (release: {
    receiver: string;
    note?: string;
    items: InternalReleaseItem[];
  }) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean;
}) => {
  const [receiver, setReceiver] = useState("Quầy pha chế");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ ingredientId: string; quantity: number }[]>([
    { ingredientId: ingredients[0]?.id || "", quantity: 1000 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { ingredientId: ingredients[0]?.id || "", quantity: 1000 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "ingredientId" | "quantity", value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const isInvalid = useMemo(() => {
    if (items.length === 0) return true;
    return items.some((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      return !ing || item.quantity <= 0 || item.quantity > ing.stockQuantity;
    });
  }, [items, ingredients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;
    setIsSaving(true);

    try {
      await onSave({
        receiver,
        note: note.trim() || undefined,
        items,
      });
      toast.success("Đã tạo phiếu xuất kho nội bộ thành công!");
    } catch {
      toast.error("Không thể tạo phiếu xuất kho");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4 border border-rose-500/10 bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div>
        <h2 className="text-lg font-black text-foreground text-rose-600 dark:text-rose-400">Tạo phiếu xuất kho nội bộ</h2>
        <p className="text-xs text-muted-foreground">
          Ghi nhận xuất nguyên vật liệu ra quầy bar, bếp, hoặc dùng cho các mục đích nội bộ khác.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bộ phận nhận NVL</label>
          <select
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-primary text-foreground"
          >
            <option value="Quầy pha chế">Quầy pha chế (Bar)</option>
            <option value="Bếp">Bếp (Kitchen)</option>
            <option value="Mẫu thử / Tặng">Mẫu thử / Tặng (Sampling)</option>
            <option value="Hủy bỏ / Hết hạn">Hủy bỏ / Hết hạn (Discarded)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Xuất sữa tươi và boba đầu ca sáng..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary text-foreground"
          />
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách nguyên liệu xuất</label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm dòng
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((item, index) => {
            const ing = ingredients.find((i) => i.id === item.ingredientId);
            const stockQty = ing ? ing.stockQuantity : 0;
            const unit = ing ? ing.unit : "";
            const isExceeded = item.quantity > stockQty;

            return (
              <div key={index} className={cn("grid gap-2 items-center", isMobile ? "grid-cols-1 border border-border/40 p-3 rounded-2xl bg-muted/10 relative" : "grid-cols-[1.5fr_1fr_40px] pr-2")}>
                <div className="space-y-1">
                  <select
                    value={item.ingredientId}
                    onChange={(e) => handleItemChange(index, "ingredientId", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary text-foreground"
                  >
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Tồn: {i.stockQuantity} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    className={cn(
                      "w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold text-center outline-none",
                      isExceeded ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-primary"
                    )}
                    placeholder="Số lượng"
                    min={1}
                  />
                  <span className="text-xs font-black text-muted-foreground uppercase">{unit}</span>
                </div>

                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="absolute top-2 right-2 rounded-lg p-1 text-rose-500 hover:bg-rose-50/50"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded-xl p-2.5 text-muted-foreground hover:text-rose-500 hover:bg-muted/50 flex items-center justify-center"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                )}

                {isExceeded && (
                  <p className="text-[10px] text-rose-500 font-bold sm:col-span-3">
                    ⚠️ Lượng xuất vượt quá lượng tồn hiện có trong kho ({stockQty} {unit})!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t border-border/40 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={isSaving || isInvalid}
          className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
        >
          {isSaving ? "Đang xuất kho..." : "Xác nhận xuất kho"}
        </button>
      </div>
    </form>
  );
};

const InternalReleaseDetailView = ({
  release,
  ingredients,
  isMobile,
  onClose,
}: {
  release: InternalRelease;
  ingredients: Ingredient[];
  isMobile: boolean;
  onClose: () => void;
}) => {
  const formattedDate = new Date(release.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("space-y-4 border border-rose-500/10 bg-card p-5 shadow-sm", isMobile ? "rounded-[28px]" : "rounded-3xl p-6")}>
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-rose-600 dark:text-rose-400 text-sm uppercase tracking-wide">
              REL-{release.id.substring(4, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">• {formattedDate}</span>
          </div>
          <h2 className="text-base font-bold text-foreground">Phiếu xuất kho nội bộ</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-xl bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Người / Bộ phận nhận</div>
          <div className="mt-1 font-bold text-foreground">{release.receiver}</div>
        </div>
        <div className="rounded-xl bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Trạng thái</div>
          <div className="mt-1 font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            🔴 Đã xuất kho
          </div>
        </div>
        {release.note && (
          <div className="rounded-xl bg-muted/20 p-3 sm:col-span-2">
            <div className="text-xs text-muted-foreground">Ghi chú</div>
            <div className="mt-1 font-medium text-foreground italic">"{release.note}"</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background mt-4">
        <table className="w-full text-left border-collapse min-w-[400px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Nguyên liệu</th>
              <th className="p-3 text-center">ĐVT</th>
              <th className="p-3 text-right">Số lượng xuất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
            {release.items.map((item) => {
              const ing = ingredients.find((i) => i.id === item.ingredientId);
              const ingName = ing ? ing.name : "Nguyên liệu";
              const ingUnit = ing ? ing.unit : "";

              return (
                <tr key={item.ingredientId} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-bold text-foreground">{ingName}</td>
                  <td className="p-3 text-center text-muted-foreground uppercase font-black text-[10px]">{ingUnit}</td>
                  <td className="p-3 text-right font-black text-rose-600">-{item.quantity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-3">
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          Đóng chi tiết
        </button>
      </div>
    </div>
  );
};

const Inventory = () => {
  const isMobile = useIsMobile();
  const { products } = useCatalog();
  const { ingredients, recipes, isLoading, error } = useInventory();
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | "new" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [draftRecipes, setDraftRecipes] = useState<ProductRecipeItem[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryView>("inventory");
  const purchaseOrders = usePurchaseOrders();
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poSubTab, setPoSubTab] = useState<"purchase_orders" | "releases" | "adjustments">("purchase_orders");
  const adjustments = useInventoryAdjustments();
  const [adjustingIngredient, setAdjustingIngredient] = useState<Ingredient | null>(null);
  const audits = useInventoryAudits();
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);
  const releases = useInternalReleases();
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const [isPrintingReleaseVoucher, setIsPrintingReleaseVoucher] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<InternalRelease | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "value">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<"all" | "ready_made" | "material" | "low_stock">("all");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<"all" | "has_recipe" | "no_recipe">("all");

  const latestPrices = useMemo(() => {
    const prices = new Map<string, number>();
    const sortedPOs = [...purchaseOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const po of sortedPOs) {
      for (const item of po.items) {
        prices.set(item.ingredientId, item.price);
      }
    }
    return prices;
  }, [purchaseOrders]);

  const totalInventoryValue = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const price = ing.purchasePrice || latestPrices.get(ing.id) || 0;
      return sum + (ing.stockQuantity * price);
    }, 0);
  }, [ingredients, latestPrices]);

  const inventoryStats = useMemo(() => {
    let readyMadeCount = 0;
    let readyMadeValue = 0;
    let materialCount = 0;
    let materialValue = 0;

    const productNamesLower = new Set(
      products.map((p) => p.name.toLowerCase().trim())
    );

    ingredients.forEach((ing) => {
      const price = ing.purchasePrice || latestPrices.get(ing.id) || 0;
      const val = ing.stockQuantity * price;
      
      if (productNamesLower.has(ing.name.toLowerCase().trim())) {
        readyMadeCount++;
        readyMadeValue += val;
      } else {
        materialCount++;
        materialValue += val;
      }
    });

    return {
      readyMadeCount,
      readyMadeValue,
      materialCount,
      materialValue,
    };
  }, [ingredients, products, latestPrices]);

  const filteredIngredientsList = useMemo(() => {
    let list = ingredients.filter((ing) =>
      ing.name.toLowerCase().includes(ingredientSearch.toLowerCase().trim())
    );

    const productNamesLower = new Set(
      products.map((p) => p.name.toLowerCase().trim())
    );

    if (filterType === "ready_made") {
      list = list.filter((ing) => productNamesLower.has(ing.name.toLowerCase().trim()));
    } else if (filterType === "material") {
      list = list.filter((ing) => !productNamesLower.has(ing.name.toLowerCase().trim()));
    } else if (filterType === "low_stock") {
      list = list.filter((ing) => ing.stockQuantity <= ing.lowStockThreshold);
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name, "vi");
      } else if (sortBy === "stock") {
        comparison = a.stockQuantity - b.stockQuantity;
      } else if (sortBy === "value") {
        const priceA = a.purchasePrice || latestPrices.get(a.id) || 0;
        const valueA = priceA * a.stockQuantity;
        const priceB = b.purchasePrice || latestPrices.get(b.id) || 0;
        const valueB = priceB * b.stockQuantity;
        comparison = valueA - valueB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [ingredients, ingredientSearch, sortBy, sortOrder, latestPrices, filterType, products]);

  const handleSort = (field: "name" | "stock" | "value") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  const effectiveProductId = selectedProductId || (isMobile ? "" : (products[0]?.id || ""));

  const currentRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.productId === effectiveProductId),
    [recipes, effectiveProductId],
  );

  const lowStockIngredients = useMemo(
    () =>
      ingredients.filter(
        (ingredient) => ingredient.stockQuantity <= ingredient.lowStockThreshold,
      ),
    [ingredients],
  );

  const selectedProduct =
    products.find((product) => product.id === effectiveProductId) ?? null;

  const displayedRecipes =
    draftRecipes.length > 0 || currentRecipes.length === 0 ? draftRecipes : currentRecipes;

  const recipeProductCount = new Set(recipes.map((recipe) => recipe.productId)).size;

  const syncRecipeDraft = (productId: string) => {
    setSelectedProductId(productId);
    if (productId) {
      setDraftRecipes(recipes.filter((recipe) => recipe.productId === productId));
    } else {
      setDraftRecipes([]);
    }
  };

  const recipeStats = useMemo(() => {
    const productsWithRecipes = new Set(recipes.map((r) => r.productId));
    const total = products.length;
    const hasRecipe = products.filter((p) => productsWithRecipes.has(p.id)).length;
    const noRecipe = total - hasRecipe;
    const percent = total > 0 ? Math.round((hasRecipe / total) * 100) : 0;
    return { total, hasRecipe, noRecipe, percent };
  }, [products, recipes]);

  const filteredProductsForRecipe = useMemo(() => {
    const productsWithRecipes = new Set(recipes.map((r) => r.productId));
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(recipeSearch.toLowerCase().trim());
      const hasRecipe = productsWithRecipes.has(product.id);
      const matchesFilter = 
        recipeFilter === "all" ||
        (recipeFilter === "has_recipe" && hasRecipe) ||
        (recipeFilter === "no_recipe" && !hasRecipe);
      return matchesSearch && matchesFilter;
    });
  }, [products, recipes, recipeSearch, recipeFilter]);

  const recipeCost = useMemo(() => {
    if (!effectiveProductId) return 0;
    return displayedRecipes.reduce((sum, item) => {
      const ingredient = ingredients.find((ing) => ing.id === item.ingredientId);
      if (!ingredient) return sum;
      const price = ingredient.purchasePrice || latestPrices.get(ingredient.id) || 0;
      return sum + (item.quantity * price);
    }, 0);
  }, [displayedRecipes, ingredients, latestPrices, effectiveProductId]);

  const renderIngredientList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-foreground">Danh sách nguyên liệu</h2>
          {filterType !== "all" && (
            <Badge 
              variant="secondary" 
              className={cn(
                "h-5 gap-1 text-[10px] font-black uppercase rounded-full pl-2 pr-1 shadow-xs border cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all",
                filterType === "ready_made" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
                filterType === "material" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400",
                filterType === "low_stock" && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"
              )}
              onClick={() => setFilterType("all")}
              title="Click để bỏ lọc"
            >
              {filterType === "ready_made" && "Thành phẩm bán sẵn"}
              {filterType === "material" && "Nguyên vật liệu"}
              {filterType === "low_stock" && "Sắp hết"}
              <X className="h-3 w-3 shrink-0" />
            </Badge>
          )}
        </div>
        <button
          onClick={() => setEditingIngredient("new")}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Thêm mới
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={ingredientSearch}
          onChange={(e) => setIngredientSearch(e.target.value)}
          placeholder="Tìm kiếm nguyên liệu..."
          className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground"
        />
      </div>

      {lowStockIngredients.length > 0 ? (
        <div className="rounded-[28px] border border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 p-4">
          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 animate-bounce text-rose-600 dark:text-rose-400" />
            Cảnh báo: {lowStockIngredients.length} nguyên liệu sắp hết!
          </div>
          <div className="mt-3 grid gap-2">
            {lowStockIngredients.slice(0, isMobile ? 4 : 5).map((ingredient) => (
              <div
                key={ingredient.id}
                className="rounded-xl bg-background/80 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-100/40 dark:border-rose-950/20 shadow-sm flex justify-between items-center"
              >
                <span>{ingredient.name}</span>
                <span className="font-black text-rose-600 dark:text-rose-400">Còn lại: {ingredient.stockQuantity} {ingredient.unit}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editingIngredient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl relative">
            <IngredientForm
              initial={editingIngredient === "new" ? undefined : editingIngredient}
              isMobile={isMobile}
              onSave={async (ingredient) => {
                try {
                  await saveIngredient(ingredient);
                  setEditingIngredient(null);
                  toast.success("Đã lưu nguyên liệu");
                } catch (saveError) {
                  toast.error("Không thể lưu nguyên liệu", {
                    description:
                      saveError instanceof Error ? saveError.message : "Có lỗi xảy ra.",
                  });
                }
              }}
              onCancel={() => setEditingIngredient(null)}
            />
          </div>
        </div>
      ) : null}

      {adjustingIngredient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl relative">
            <StockAdjustmentForm
              ingredient={adjustingIngredient}
              isMobile={isMobile}
              onCancel={() => setAdjustingIngredient(null)}
              onSave={async (adjInput) => {
                try {
                  await createInventoryAdjustment(adjInput);
                  setAdjustingIngredient(null);
                } catch (err) {
                  console.error(err);
                  throw err;
                }
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground select-none">
              <th className="p-4">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-black uppercase tracking-wider hover:text-primary transition-colors"
                >
                  Nguyên liệu <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                </button>
              </th>
              <th className="p-4 font-black uppercase tracking-wider">Trạng thái</th>
              <th className="p-4">
                <button
                  onClick={() => handleSort("stock")}
                  className="flex items-center gap-1 font-black uppercase tracking-wider hover:text-primary transition-colors"
                >
                  Tồn thực tế / ĐVT <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                </button>
              </th>
              <th className="p-4 font-black uppercase tracking-wider">Ngưỡng báo</th>
              <th className="p-4 font-black uppercase tracking-wider">Giá nhập định mức</th>
              <th className="p-4">
                <button
                  onClick={() => handleSort("value")}
                  className="flex items-center gap-1 font-black uppercase tracking-wider hover:text-primary transition-colors"
                >
                  Trị giá tồn <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                </button>
              </th>
              <th className="p-4 text-center font-black uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold">
                  Đang tải tồn kho...
                </td>
              </tr>
            ) : filteredIngredientsList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold">
                  Không tìm thấy nguyên liệu phù hợp.
                </td>
              </tr>
            ) : (
              filteredIngredientsList.map((ingredient) => {
                const isLow = ingredient.stockQuantity <= ingredient.lowStockThreshold;
                const isWarning = !isLow && ingredient.stockQuantity <= ingredient.lowStockThreshold * 1.5;

                const badgeStyle = isLow
                  ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
                  : isWarning
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
                    : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30";

                const price = ingredient.purchasePrice || latestPrices.get(ingredient.id) || 0;
                const value = price * ingredient.stockQuantity;

                return (
                  <tr key={ingredient.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name */}
                    <td className="p-4 font-bold text-foreground">
                      {ingredient.name}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", badgeStyle)}>
                        {isLow ? "Sắp hết 🚨" : isWarning ? "Cận ngưỡng ⚠️" : "An toàn ✅"}
                      </span>
                    </td>

                    {/* Stock / Unit */}
                    <td className="p-4 font-black text-foreground">
                      {new Intl.NumberFormat("vi-VN").format(ingredient.stockQuantity)} <span className="text-[10px] text-muted-foreground uppercase font-black">{ingredient.unit}</span>
                    </td>

                    {/* Threshold */}
                    <td className="p-4 font-medium text-muted-foreground">
                      {new Intl.NumberFormat("vi-VN").format(ingredient.lowStockThreshold)} <span className="text-[10px] uppercase">{ingredient.unit}</span>
                    </td>

                    {/* Cost Price */}
                    <td className="p-4 font-semibold text-muted-foreground">
                      {price > 0 ? `${new Intl.NumberFormat("vi-VN").format(price)}đ` : <span className="text-muted-foreground/40 italic text-xs">Chưa có</span>}
                    </td>

                    {/* Inventory Value */}
                    <td className="p-4 font-black text-violet-600 dark:text-violet-400">
                      {new Intl.NumberFormat("vi-VN").format(value)}đ
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setAdjustingIngredient(ingredient)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-warning/10 hover:text-warning transition-colors"
                          title={`Điều chỉnh tồn kho ${ingredient.name}`}
                          aria-label={`Điều chỉnh ${ingredient.name}`}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingIngredient(ingredient)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          aria-label={`Sửa ${ingredient.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Bạn có chắc muốn xóa nguyên liệu "${ingredient.name}"?`)) return;
                            try {
                              await removeIngredient(ingredient.id);
                              toast.success("Đã xóa nguyên liệu");
                            } catch (removeError) {
                              toast.error("Không thể xóa nguyên liệu", {
                                description:
                                  removeError instanceof Error
                                    ? removeError.message
                                    : "Có lỗi xảy ra.",
                              });
                            }
                          }}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors"
                          aria-label={`Xóa ${ingredient.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRecipeEditor = () => (
    <div className="space-y-6">
      {/* Recipe stats cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        {/* Card 1: Total products */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Tổng sản phẩm</div>
            <div className="text-lg sm:text-2xl font-black text-foreground">{recipeStats.total}</div>
            <div className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/80">Trong thực đơn</div>
          </div>
          <div className="absolute right-3 top-3 p-1.5 bg-muted rounded-xl text-muted-foreground hidden sm:block">
            <Package className="h-4 w-4" />
          </div>
        </div>

        {/* Card 2: Has recipe */}
        <div className="rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50/20 to-background dark:from-emerald-950/5 dark:to-card p-4 shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Đã định lượng</div>
            <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {recipeStats.hasRecipe}
            </div>
            {/* Simple progress bar */}
            <div className="w-full bg-muted dark:bg-muted/40 rounded-full h-1.5 mt-1 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${recipeStats.percent}%` }}
              />
            </div>
            <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              Đạt {recipeStats.percent}%
            </div>
          </div>
        </div>

        {/* Card 3: No recipe */}
        <div className={cn(
          "rounded-3xl border p-4 shadow-sm relative overflow-hidden group transition-all",
          recipeStats.noRecipe > 0
            ? "border-amber-500/10 bg-gradient-to-br from-amber-50/20 to-background dark:from-amber-950/5 dark:to-card"
            : "border-border bg-card"
        )}>
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Chưa định lượng</div>
            <div className={cn(
              "text-lg sm:text-2xl font-black",
              recipeStats.noRecipe > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}>
              {recipeStats.noRecipe}
            </div>
            <div className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/80">
              {recipeStats.noRecipe > 0 ? "⚠️ Cần cập nhật" : "Mọi thứ đã xong"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left pane: Product search and list */}
        {(!isMobile || !effectiveProductId) && (
          <div className="lg:col-span-4 space-y-4 rounded-[32px] border border-border bg-card p-4 shadow-sm sm:p-5">
            <div>
              <h3 className="font-bold text-foreground">Danh sách sản phẩm</h3>
              <p className="text-xs text-muted-foreground">Tìm kiếm và chọn sản phẩm để cấu hình định lượng nguyên liệu.</p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Tìm sản phẩm..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs outline-none focus:border-primary transition-all font-medium text-foreground"
                />
                {recipeSearch && (
                  <button 
                    onClick={() => setRecipeSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Segmented Filters */}
              <div className="grid grid-cols-3 p-0.5 bg-muted dark:bg-muted/30 rounded-xl border border-border/40 text-[10px] font-black">
                <button
                  onClick={() => setRecipeFilter("all")}
                  className={cn(
                    "py-1.5 rounded-lg transition-all",
                    recipeFilter === "all" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setRecipeFilter("has_recipe")}
                  className={cn(
                    "py-1.5 rounded-lg transition-all",
                    recipeFilter === "has_recipe" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Có công thức
                </button>
                <button
                  onClick={() => setRecipeFilter("no_recipe")}
                  className={cn(
                    "py-1.5 rounded-lg transition-all",
                    recipeFilter === "no_recipe" ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chưa có
                </button>
              </div>
            </div>

            {/* Scrollable Product List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
              {filteredProductsForRecipe.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  Không tìm thấy sản phẩm nào.
                </div>
              ) : (
                filteredProductsForRecipe.map((product) => {
                  const productRecipeItems = recipes.filter((r) => r.productId === product.id);
                  const hasRecipe = productRecipeItems.length > 0;
                  const isSelected = product.id === effectiveProductId;

                  return (
                    <div
                      key={product.id}
                      onClick={() => syncRecipeDraft(product.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3 items-center group relative overflow-hidden select-none",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-primary/20 bg-background/50 hover:bg-muted/40"
                      )}
                    >
                      {/* Product Thumbnail Placeholder or Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border transition-colors",
                        isSelected ? "bg-primary/10 border-primary/20" : "bg-muted border-border/50"
                      )}>
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }} />
                        ) : null}
                        {/* Fallback to emoji based on category */}
                        <span className="group-hover:scale-110 transition-transform">
                          {product.categoryId === "kem" && "🍦"}
                          {product.categoryId === "tra-hoa-qua" && "🍋"}
                          {product.categoryId === "tra-sua" && "🧋"}
                          {product.categoryId === "cafe" && "☕"}
                          {product.categoryId === "my-cay" && "🍜"}
                          {product.categoryId === "an-vat" && "🍿"}
                          {!["kem", "tra-hoa-qua", "tra-sua", "cafe", "my-cay", "an-vat"].includes(product.categoryId) && "🛒"}
                        </span>
                      </div>

                      {/* Name & Badge */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {new Intl.NumberFormat("vi-VN").format(product.price)}đ
                          </span>
                          <span className="text-[8px] text-muted-foreground/60">•</span>
                          {hasRecipe ? (
                            <span className="inline-flex items-center text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                              {productRecipeItems.length} NL
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                              Chưa có
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron indicator */}
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 transition-transform shrink-0",
                        isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/30 group-hover:text-muted-foreground"
                      )} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right pane: Recipe details and builder */}
        {(!isMobile || effectiveProductId) && (
          <div className="lg:col-span-8 space-y-4 rounded-[32px] border border-border bg-card p-4 shadow-sm sm:p-5">
            {selectedProduct ? (
              <div className="space-y-4">
                {/* Product Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <button
                        onClick={() => setSelectedProductId("")}
                        className="rounded-xl border border-border p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Công thức pha chế
                      </span>
                      <h3 className="text-lg font-black text-foreground mt-1">
                        {selectedProduct.name}
                      </h3>
                    </div>
                  </div>

                  {/* Business metrics: Cost breakdown */}
                  <div className="flex items-center gap-3 bg-muted/40 dark:bg-muted/10 border border-border/50 rounded-2xl px-3.5 py-2 shrink-0">
                    <div className="text-left">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground block leading-none">Giá bán</span>
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {new Intl.NumberFormat("vi-VN").format(selectedProduct.price)}đ
                      </span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-left">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground block leading-none">Giá vốn NL</span>
                      <span className={cn(
                        "text-xs sm:text-sm font-black",
                        recipeCost > selectedProduct.price * 0.4 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {new Intl.NumberFormat("vi-VN").format(recipeCost)}đ
                      </span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-left">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground block leading-none">Tỷ lệ vốn</span>
                      <span className={cn(
                        "text-xs sm:text-sm font-black",
                        recipeCost > selectedProduct.price * 0.4 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {selectedProduct.price > 0 ? Math.round((recipeCost / selectedProduct.price) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit status indicator */}
                {draftRecipes.length > 0 && (
                  <div className="rounded-xl px-4 py-2.5 text-xs flex justify-between items-center font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <span>⚠️ Bạn có các thay đổi chưa lưu cho sản phẩm này.</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Nháp
                    </span>
                  </div>
                )}

                {/* Ingredient lines */}
                <div className="space-y-2.5">
                  {displayedRecipes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                      Chưa khai báo nguyên liệu định mức cho sản phẩm này.
                    </div>
                  ) : (
                    displayedRecipes.map((recipe, index) => {
                      const ing = ingredients.find((i) => i.id === recipe.ingredientId);
                      const unit = ing ? ing.unit : "";
                      const price = ing ? (ing.purchasePrice || latestPrices.get(ing.id) || 0) : 0;
                      const lineCost = recipe.quantity * price;

                      return (
                        <div
                          key={recipe.id}
                          className={cn(
                            "gap-2 border border-border/40 shadow-xs",
                            isMobile
                              ? "rounded-2xl bg-background p-3"
                              : "grid md:grid-cols-[1fr_120px_100px_44px] items-center rounded-2xl bg-background/40 p-2 pl-3",
                          )}
                        >
                          {isMobile ? (
                            <div className="space-y-2">
                              <select
                                value={recipe.ingredientId}
                                onChange={(event) => {
                                  const next = [...displayedRecipes];
                                  next[index] = { ...recipe, ingredientId: event.target.value };
                                  setDraftRecipes(next);
                                }}
                                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                              >
                                {ingredients.map((ingredient) => (
                                  <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name} ({ingredient.unit})
                                  </option>
                                ))}
                              </select>

                              <div className="grid grid-cols-[1fr_80px_44px] gap-2 items-center">
                                <input
                                  type="number"
                                  value={recipe.quantity || ""}
                                  onChange={(event) => {
                                    const next = [...displayedRecipes];
                                    next[index] = { ...recipe, quantity: Number(event.target.value) };
                                    setDraftRecipes(next);
                                  }}
                                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary font-bold"
                                  placeholder="Số lượng"
                                />
                                <div className="text-[10px] text-muted-foreground text-right pr-1">
                                  {new Intl.NumberFormat("vi-VN").format(lineCost)}đ
                                </div>
                                <button
                                  onClick={() =>
                                    setDraftRecipes(
                                      displayedRecipes.filter((_, recipeIndex) => recipeIndex !== index),
                                    )
                                  }
                                  className="rounded-xl h-9 w-9 border border-destructive/20 text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center justify-center"
                                  aria-label="Xóa dòng công thức"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <select
                                value={recipe.ingredientId}
                                onChange={(event) => {
                                  const next = [...displayedRecipes];
                                  next[index] = { ...recipe, ingredientId: event.target.value };
                                  setDraftRecipes(next);
                                }}
                                className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary font-medium"
                              >
                                {ingredients.map((ingredient) => (
                                  <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name}
                                  </option>
                                ))}
                              </select>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  value={recipe.quantity || ""}
                                  onChange={(event) => {
                                    const next = [...displayedRecipes];
                                    next[index] = { ...recipe, quantity: Number(event.target.value) };
                                    setDraftRecipes(next);
                                  }}
                                  className="w-full rounded-xl border border-border bg-background pl-3 pr-8 py-2 text-xs text-foreground outline-none focus:border-primary font-bold"
                                  placeholder="Số lượng"
                                />
                                <span className="absolute right-3 text-[10px] font-bold text-muted-foreground">
                                  {unit}
                                </span>
                              </div>
                              <div className="text-right pr-2">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {new Intl.NumberFormat("vi-VN").format(lineCost)}đ
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  setDraftRecipes(
                                    displayedRecipes.filter((_, recipeIndex) => recipeIndex !== index),
                                  )
                                }
                                className="rounded-xl h-9 w-9 border border-border text-muted-foreground hover:border-destructive/20 hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center justify-center"
                                aria-label="Xóa dòng công thức"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Editor actions */}
                <div className={cn("gap-3 pt-3 border-t border-border/40", isMobile ? "grid grid-cols-1" : "flex justify-between items-center")}>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() =>
                        setDraftRecipes([
                          ...displayedRecipes,
                          {
                            id: crypto.randomUUID(),
                            productId: effectiveProductId,
                            ingredientId: ingredients[0]?.id || "",
                            quantity: 0,
                          },
                        ])
                      }
                      disabled={!effectiveProductId || ingredients.length === 0}
                      className={cn(
                        "text-xs font-bold text-primary disabled:opacity-40",
                        isMobile
                          ? "rounded-xl border border-border px-4 py-2.5 text-center w-full"
                          : "hover:underline",
                      )}
                    >
                      + Thêm nguyên liệu định mức
                    </button>
                    
                    {draftRecipes.length > 0 && !isMobile && (
                      <button
                        onClick={() => {
                          setDraftRecipes([]);
                          toast.info("Đã hủy thay đổi nháp");
                        }}
                        className="ml-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors hover:underline"
                      >
                        Hủy thay đổi
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {draftRecipes.length > 0 && isMobile && (
                      <button
                        onClick={() => {
                          setDraftRecipes([]);
                          toast.info("Đã hủy thay đổi nháp");
                        }}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted w-full"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!effectiveProductId) return;
                        setIsSavingRecipe(true);
                        try {
                          await saveProductRecipe(
                            effectiveProductId,
                            displayedRecipes
                              .filter((recipe) => recipe.ingredientId && recipe.quantity > 0)
                              .map((recipe) => ({ ...recipe, productId: effectiveProductId })),
                          );
                          setDraftRecipes([]); // Clear draft after save
                          toast.success("Đã lưu công thức");
                        } catch (saveError) {
                          toast.error("Không thể lưu công thức", {
                            description:
                              saveError instanceof Error ? saveError.message : "Có lỗi xảy ra.",
                          });
                        } finally {
                          setIsSavingRecipe(false);
                        }
                      }}
                      disabled={isSavingRecipe || !effectiveProductId}
                      className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 transition-opacity w-full sm:w-auto"
                    >
                      {isSavingRecipe ? "Đang lưu..." : "Lưu công thức"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
                <ChefHat className="h-10 w-10 text-muted-foreground/40 animate-bounce" />
                <div>Chọn một sản phẩm ở cột bên trái để bắt đầu thiết lập công thức.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderPurchaseOrders = () => {
    if (isCreatingPO) {
      return (
        <POCreatorForm
          ingredients={ingredients}
          isMobile={isMobile}
          onCancel={() => setIsCreatingPO(false)}
          onSave={async (orderInput) => {
            try {
              await createPurchaseOrder(orderInput);
              setIsCreatingPO(false);
            } catch (err) {
              console.error(err);
              throw err;
            }
          }}
        />
      );
    }

    if (selectedPO) {
      return (
        <PODetailView
          order={selectedPO}
          ingredients={ingredients}
          isMobile={isMobile}
          onClose={() => setSelectedPO(null)}
        />
      );
    }

    if (isCreatingRelease) {
      return (
        <InternalReleaseCreatorForm
          ingredients={ingredients}
          isMobile={isMobile}
          onCancel={() => setIsCreatingRelease(false)}
          onSave={async (releaseInput) => {
            try {
              await createInternalRelease(releaseInput);
              setIsCreatingRelease(false);
            } catch (err) {
              console.error(err);
              throw err;
            }
          }}
        />
      );
    }

    if (selectedRelease) {
      return (
        <InternalReleaseDetailView
          release={selectedRelease}
          ingredients={ingredients}
          isMobile={isMobile}
          onClose={() => setSelectedRelease(null)}
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Sub-tab switcher */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setPoSubTab("purchase_orders")}
            className={cn(
              "px-4 py-2.5 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 shrink-0",
              poSubTab === "purchase_orders"
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <FileText className="h-3.5 w-3.5" /> Phiếu nhập kho
          </button>
          <button
            onClick={() => setPoSubTab("releases")}
            className={cn(
              "px-4 py-2.5 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 shrink-0",
              poSubTab === "releases"
                ? "bg-rose-100/50 border-rose-200/50 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Phiếu xuất kho nội bộ
          </button>
          <button
            onClick={() => setPoSubTab("adjustments")}
            className={cn(
              "px-4 py-2.5 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 shrink-0",
              poSubTab === "adjustments"
                ? "bg-warning/10 border-warning/20 text-warning"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Settings className="h-3.5 w-3.5" /> Nhật ký kiểm kho (Hao hụt)
          </button>
        </div>

        {poSubTab === "purchase_orders" ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-foreground">Nhật ký nhập kho</h2>
              <button
                onClick={() => setIsCreatingPO(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                disabled={ingredients.length === 0}
              >
                <Plus className="h-4 w-4" /> Nhập kho mới
              </button>
            </div>

            <div className="space-y-2.5">
              {purchaseOrders.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có phiếu nhập kho nào được ghi nhận.
                </div>
              ) : (
                purchaseOrders.map((po) => {
                  const formattedDate = new Date(po.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  const totalItemsCount = po.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <div
                      key={po.id}
                      onClick={() => setSelectedPO(po)}
                      className={cn(
                        "border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex justify-between items-center",
                        isMobile ? "rounded-[26px] p-4 flex-col items-start gap-3" : "rounded-2xl p-4 pr-5",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-primary text-sm uppercase tracking-wide">
                            PO-{po.id.substring(3, 7).toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">• {formattedDate}</span>
                        </div>
                        
                        <div className="font-bold text-foreground text-base">
                          {po.supplierName}
                        </div>

                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span>Mặt hàng: <strong>{po.items.length}</strong></span>
                          <span>Tổng SL: <strong>{totalItemsCount}</strong></span>
                        </div>

                        {po.note && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-[300px]">
                            "{po.note}"
                          </p>
                        )}
                      </div>

                      <div className={cn("flex items-center gap-4", isMobile ? "w-full justify-between mt-2 pt-2 border-t border-border/50" : "")}>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Tổng tiền nhập</div>
                          <div className="text-lg font-black text-primary">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(po.totalAmount)}
                          </div>
                        </div>
                        {!isMobile && <ChevronRight className="h-5 w-5 text-muted-foreground/60" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : poSubTab === "releases" ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-foreground text-rose-600 dark:text-rose-400">Phiếu xuất kho nội bộ</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPrintingReleaseVoucher(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-rose-100 transition-colors"
                  disabled={ingredients.length === 0}
                >
                  🖨️ In phiếu viết tay
                </button>
                <button
                  onClick={() => setIsCreatingRelease(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition-opacity hover:opacity-95"
                  disabled={ingredients.length === 0}
                >
                  <Plus className="h-4 w-4" /> Xuất kho nội bộ
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {releases.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có phiếu xuất kho nội bộ nào.
                </div>
              ) : (
                releases.map((rel) => {
                  const formattedDate = new Date(rel.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  const totalItemsCount = rel.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <div
                      key={rel.id}
                      onClick={() => setSelectedRelease(rel)}
                      className={cn(
                        "border border-border bg-card shadow-sm hover:shadow-md hover:border-rose-500/20 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex justify-between items-center",
                        isMobile ? "rounded-[26px] p-4 flex-col items-start gap-3" : "rounded-2xl p-4 pr-5",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-rose-600 text-sm uppercase tracking-wide">
                            REL-{rel.id.substring(4, 8).toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">• {formattedDate}</span>
                        </div>
                        
                        <div className="font-bold text-foreground text-base">
                          Người nhận: {rel.receiver}
                        </div>

                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span>Mặt hàng: <strong>{rel.items.length}</strong></span>
                        </div>

                        {rel.note && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-[300px]">
                            "{rel.note}"
                          </p>
                        )}
                      </div>

                      <div className={cn("flex items-center gap-4", isMobile ? "w-full justify-between mt-2 pt-2 border-t border-border/50" : "")}>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Trạng thái</div>
                          <div className="text-sm font-black text-rose-600">
                            🔴 Đã xuất
                          </div>
                        </div>
                        {!isMobile && <ChevronRight className="h-5 w-5 text-muted-foreground/60" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-foreground">Nhật ký kiểm kho & Điều chỉnh</h2>
            </div>

            <div className="space-y-2.5">
              {adjustments.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có lịch sử điều chỉnh kho nào.
                </div>
              ) : (
                adjustments.map((adj) => {
                  const formattedDate = new Date(adj.createdAt).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const ing = ingredients.find((i) => i.id === adj.ingredientId);
                  const ingName = ing ? ing.name : "Nguyên liệu";
                  const ingUnit = ing ? ing.unit : "";

                  return (
                    <div
                      key={adj.id}
                      className={cn(
                        "border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/10 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex justify-between items-center",
                        isMobile ? "rounded-[26px] p-4 flex-col items-start gap-2" : "rounded-2xl p-4 pr-5",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                            adj.type === "increase"
                              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                              : "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
                          )}>
                            {adj.type === "increase" ? "Tăng cân kho" : "Giảm hao phí"}
                          </span>
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        </div>
                        
                        <div className="font-bold text-foreground text-base">
                          {ingName}
                        </div>

                        <div className="text-xs font-bold text-foreground/80">
                          Chênh lệch: <span className={cn(
                            "font-black text-sm",
                            adj.type === "increase" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {adj.type === "increase" ? "+" : "-"}{adj.quantity} {ingUnit}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground italic">
                          Lý do: <strong>{adj.reason}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderInventoryAudits = () => {
    if (isCreatingAudit) {
      return (
        <AuditCreatorForm
          ingredients={ingredients}
          isMobile={isMobile}
          onCancel={() => setIsCreatingAudit(false)}
          onSave={async (auditInput) => {
            try {
              await createInventoryAudit(auditInput);
              setIsCreatingAudit(false);
            } catch (err) {
              console.error(err);
              throw err;
            }
          }}
        />
      );
    }

    if (selectedAudit) {
      return (
        <AuditDetailView
          audit={selectedAudit}
          ingredients={ingredients}
          isMobile={isMobile}
          onClose={() => setSelectedAudit(null)}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-foreground">Kiểm kho chốt ca</h2>
            <p className="text-xs text-muted-foreground">Lịch sử kiểm kê đối soát lượng tồn thực tế tại quầy</p>
          </div>
          <button
            onClick={() => setIsCreatingAudit(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            disabled={ingredients.length === 0}
          >
            <Plus className="h-4 w-4" /> Bắt đầu kiểm kho
          </button>
        </div>

        <div className="space-y-2.5">
          {audits.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              Chưa có phiên kiểm kho nào được ghi nhận.
            </div>
          ) : (
            audits.map((audit) => {
              const formattedDate = new Date(audit.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              
              const auditDayFormatted = new Date(audit.date).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              const itemsWithVariance = audit.items.filter((item) => item.variance !== 0);

              return (
                <div
                  key={audit.id}
                  onClick={() => setSelectedAudit(audit)}
                  className={cn(
                    "border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex justify-between items-center",
                    isMobile ? "rounded-[26px] p-4 flex-col items-start gap-3" : "rounded-2xl p-4 pr-5",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary text-sm uppercase tracking-wide">
                        AUD-{audit.id.substring(3, 7).toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">• {formattedDate}</span>
                    </div>
                    
                    <div className="font-bold text-foreground text-base">
                      Phiên kiểm ngày {auditDayFormatted}
                    </div>

                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>Nguyên liệu kiểm: <strong>{audit.items.length}</strong></span>
                      <span>Bị lệch: <strong className={itemsWithVariance.length > 0 ? "text-rose-500" : "text-emerald-500"}>
                        {itemsWithVariance.length}
                      </strong></span>
                    </div>

                    {audit.note && (
                      <p className="text-xs text-muted-foreground italic truncate max-w-[300px]">
                        "{audit.note}"
                      </p>
                    )}
                  </div>

                  <div className={cn("flex items-center gap-4", isMobile ? "w-full justify-between mt-2 pt-2 border-t border-border/50" : "")}>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Trạng thái</div>
                      <div className="text-sm font-black text-emerald-600">
                        🟢 Hoàn tất
                      </div>
                    </div>
                    {!isMobile && <ChevronRight className="h-5 w-5 text-muted-foreground/60" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Kho nguyên liệu Momoka"
      subtitle="Quản lý nguyên liệu, công thức và cảnh báo sắp hết"
    >
      {/* Main Tab Switcher */}
      <div className="mb-6 flex p-1 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/40 max-w-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("inventory")}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "inventory"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FlaskConical className="h-4 w-4" /> Nguyên liệu tồn kho
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "recipes"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ChefHat className="h-4 w-4" /> Định lượng công thức
        </button>
        <button
          onClick={() => {
            setActiveTab("purchase_orders");
            setIsCreatingPO(false);
            setSelectedPO(null);
          }}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "purchase_orders"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClipboardList className="h-4 w-4" /> Giao dịch kho
        </button>
        <button
          onClick={() => {
            setActiveTab("audits");
            setIsCreatingAudit(false);
            setSelectedAudit(null);
          }}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "audits"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="h-4 w-4" /> Kiểm kho chốt ca
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      ) : null}

      {activeTab === "inventory" ? (
        <div className="space-y-6">
          {/* Stat cards */}
          <section className={cn("grid gap-3 sm:gap-4", isMobile ? "grid-cols-2" : "md:grid-cols-4")}>
            {/* Card 1: Thành phẩm bán sẵn */}
            <div 
              onClick={() => setFilterType(filterType === "ready_made" ? "all" : "ready_made")}
              className={cn(
                "rounded-3xl border bg-gradient-to-br from-emerald-50/40 to-background dark:from-emerald-950/5 dark:to-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-between overflow-hidden relative group cursor-pointer select-none",
                filterType === "ready_made"
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-[1.02] bg-emerald-50/50 dark:bg-emerald-950/10"
                  : "border-emerald-500/10 hover:border-emerald-500/30",
                isMobile ? "p-4" : "p-5"
              )}
            >
              <div className="space-y-1 z-10 w-full">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Thành phẩm bán sẵn</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat("vi-VN").format(inventoryStats.readyMadeValue)}đ
                </div>
                <div className="text-[10px] font-bold text-muted-foreground/80">
                  {inventoryStats.readyMadeCount} sản phẩm
                </div>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="absolute -right-4 -bottom-4 h-16 w-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            </div>

            {/* Card 2: Nguyên vật liệu pha chế */}
            <div 
              onClick={() => setFilterType(filterType === "material" ? "all" : "material")}
              className={cn(
                "rounded-3xl border bg-gradient-to-br from-blue-50/40 to-background dark:from-blue-950/5 dark:to-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-between overflow-hidden relative group cursor-pointer select-none",
                filterType === "material"
                  ? "border-blue-500 ring-2 ring-blue-500/20 scale-[1.02] bg-blue-50/50 dark:bg-blue-950/10"
                  : "border-blue-500/10 hover:border-blue-500/30",
                isMobile ? "p-4" : "p-5"
              )}
            >
              <div className="space-y-1 z-10 w-full">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Nguyên vật liệu pha chế</div>
                <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat("vi-VN").format(inventoryStats.materialValue)}đ
                </div>
                <div className="text-[10px] font-bold text-muted-foreground/80">
                  {inventoryStats.materialCount} nguyên liệu
                </div>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="absolute -right-4 -bottom-4 h-16 w-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
            </div>

            {/* Card 3: Tổng trị giá tồn kho */}
            <div 
              onClick={() => setFilterType("all")}
              className={cn(
                "rounded-3xl border bg-gradient-to-br from-violet-50/40 to-background dark:from-violet-950/5 dark:to-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-between overflow-hidden relative group cursor-pointer select-none",
                filterType === "all"
                  ? "border-violet-500 ring-2 ring-violet-500/20 scale-[1.02] bg-violet-50/50 dark:bg-violet-950/10"
                  : "border-violet-500/10 hover:border-violet-500/30",
                isMobile ? "p-4" : "p-5"
              )}
            >
              <div className="space-y-1 z-10 w-full">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Tổng trị giá tồn</div>
                <div className="text-xl sm:text-2xl font-black text-violet-600 dark:text-violet-400">
                  {new Intl.NumberFormat("vi-VN").format(totalInventoryValue)}đ
                </div>
                <div className="text-[10px] font-bold text-muted-foreground/80">
                  Tổng cộng: {ingredients.length} loại
                </div>
              </div>
              <div className="p-2.5 bg-violet-500/10 rounded-2xl text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="absolute -right-4 -bottom-4 h-16 w-16 bg-violet-500/5 rounded-full blur-xl group-hover:bg-violet-500/10 transition-colors" />
            </div>

            {/* Card 4: Cảnh báo sắp hết */}
            <div 
              onClick={() => setFilterType(filterType === "low_stock" ? "all" : "low_stock")}
              className={cn(
                "rounded-3xl border bg-gradient-to-br from-rose-50/40 to-background dark:from-rose-950/5 dark:to-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex items-center justify-between overflow-hidden relative group cursor-pointer select-none",
                filterType === "low_stock"
                  ? "border-rose-500 ring-2 ring-rose-500/20 scale-[1.02] bg-rose-50/50 dark:bg-rose-950/10"
                  : "border-rose-500/10 hover:border-rose-500/30",
                isMobile ? "p-4" : "p-5"
              )}
            >
              <div className="space-y-1 z-10 w-full">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Cảnh báo sắp hết</div>
                <div className={cn(
                  "text-2xl sm:text-3xl font-black text-rose-500",
                  lowStockIngredients.length > 0 ? "animate-pulse" : ""
                )}>
                  {lowStockIngredients.length}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground/80">
                  Cần nhập hàng gấp
                </div>
              </div>
              <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="absolute -right-4 -bottom-4 h-16 w-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-colors" />
            </div>
          </section>

          {renderIngredientList()}
        </div>
      ) : activeTab === "recipes" ? (
        <div className="space-y-6">
          {renderRecipeEditor()}
        </div>
      ) : activeTab === "purchase_orders" ? (
        renderPurchaseOrders()
      ) : (
        renderInventoryAudits()
      )}

      {isPrintingReleaseVoucher && (
        <div 
          id="printable-release-voucher-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-xs flex justify-center items-start print:absolute print:inset-0 print:bg-white print:p-0"
        >
          {/* Inject dynamic print stylesheet to override default page content */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body > * {
                display: none !important;
              }
              #printable-release-voucher-modal {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="w-full max-w-4xl bg-background rounded-[32px] border border-border p-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none print:rounded-none">
            {/* Modal Controls (Hidden in print) */}
            <div className="no-print mb-6 flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-rose-600">
                  🖨️ Mẫu phiếu xuất kho nội bộ viết tay
                </h3>
                <p className="text-xs text-muted-foreground">In phiếu này đưa cho nhân viên viết tay lượng xuất kho thực tế, nhập lại cuối ngày.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPrintingReleaseVoucher(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-colors"
                >
                  In Phiếu (Print)
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="bg-white text-black p-8 border border-gray-200 rounded-2xl print:border-none print:p-0 print:text-black">
              {/* Header */}
              <div className="text-center space-y-1.5 border-b-2 border-black pb-4 mb-6">
                <h2 className="text-xl font-black uppercase tracking-wider">MOMOKA CAFE</h2>
                <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900">PHIẾU XUẤT KHO NỘI BỘ</h1>
                <p className="text-xs italic text-gray-500">(Dùng cho cửa hàng ghi chép lượng nguyên liệu xuất quầy hằng ngày)</p>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-xs font-medium mb-6 text-gray-800">
                <div>Ngày xuất kho: .... / .... / 202...</div>
                <div>Ca làm việc: Ca Sáng / Ca Chiều / Ca Tối</div>
                <div>Người nhận nguyên liệu: ..............................................................</div>
                <div>Người xuất kho: ..............................................................................</div>
              </div>

              {/* Ingredients Table (Side by side 2 columns) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Table */}
                <div className="border border-black">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-center font-bold">
                        <th className="border-r border-black p-1.5 w-[35px]">STT</th>
                        <th className="border-r border-black p-1.5 text-left">Tên nguyên liệu</th>
                        <th className="border-r border-black p-1.5 w-[45px]">ĐVT</th>
                        <th className="border-r border-black p-1.5 w-[70px]">SL Xuất</th>
                        <th className="p-1.5 w-[100px]">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.slice(0, Math.ceil(ingredients.length / 2)).map((ing, idx) => (
                        <tr key={ing.id} className="border-b border-black h-[28px]">
                          <td className="border-r border-black text-center p-1 font-semibold">{idx + 1}</td>
                          <td className="border-r border-black p-1 font-semibold truncate max-w-[140px]">{ing.name}</td>
                          <td className="border-r border-black text-center p-1 text-gray-600 font-bold uppercase">{ing.unit}</td>
                          <td className="border-r border-black p-1"></td>
                          <td className="p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right Table */}
                <div className="border border-black">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-center font-bold">
                        <th className="border-r border-black p-1.5 w-[35px]">STT</th>
                        <th className="border-r border-black p-1.5 text-left">Tên nguyên liệu</th>
                        <th className="border-r border-black p-1.5 w-[45px]">ĐVT</th>
                        <th className="border-r border-black p-1.5 w-[70px]">SL Xuất</th>
                        <th className="p-1.5 w-[100px]">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.slice(Math.ceil(ingredients.length / 2)).map((ing, idx) => {
                        const startIdx = Math.ceil(ingredients.length / 2);
                        return (
                          <tr key={ing.id} className="border-b border-black h-[28px]">
                            <td className="border-r border-black text-center p-1 font-semibold">{startIdx + idx + 1}</td>
                            <td className="border-r border-black p-1 font-semibold truncate max-w-[140px]">{ing.name}</td>
                            <td className="border-r border-black text-center p-1 text-gray-600 font-bold uppercase">{ing.unit}</td>
                            <td className="border-r border-black p-1"></td>
                            <td className="p-1"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 grid grid-cols-2 text-center text-xs font-semibold gap-8 pt-4">
                <div className="space-y-16">
                  <div>NGƯỜI XUẤT KHO</div>
                  <div className="text-gray-400 italic font-normal text-[10px]">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="space-y-16">
                  <div>NGƯỜI NHẬN NGUYÊN LIỆU</div>
                  <div className="text-gray-400 italic font-normal text-[10px]">(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Inventory;
