import { useEffect, useState, useMemo } from "react";
import { Trash2, Plus, Upload, Loader2, Image as ImageIcon, X, Check } from "lucide-react";
import { type Category, type Product, type ProductOption, type ProductVariant } from "@/data/products";
import { uploadProductImage, listProductImages } from "@/lib/catalog";
import { toast } from "sonner";
import { listInventory, saveIngredient, removeIngredient } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/pos/ProductImage";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const CategoryForm = ({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Category;
  onSave: (category: Category) => Promise<void>;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || "📦");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        id: initial?.id || crypto.randomUUID(),
        name,
        icon,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="cat-name">Tên danh mục</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Trà sữa, Cà phê..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-icon">Icon</Label>
          <Input
            id="cat-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="text-center text-2xl"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>Hủy</Button>
        <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
          {isSaving ? "Đang lưu..." : "Lưu danh mục"}
        </Button>
      </div>
    </div>
  );
};

export const ProductForm = ({
  initial,
  categories,
  optionTemplates,
  onSave,
  onCancel,
}: {
  initial?: Product;
  categories: Category[];
  optionTemplates: ProductOption[];
  onSave: (product: Product) => Promise<void>;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [price, setPrice] = useState(initial?.price || 0);
  const [image, setImage] = useState(initial?.image || "🍽");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories[0]?.id || "");
  const [hasVariants, setHasVariants] = useState(Boolean(initial?.variants?.length));
  const [variants, setVariants] = useState<ProductVariant[]>(
    initial?.variants || [
      { id: "s", name: "Size S", priceAdd: 0 },
      { id: "m", name: "Size M", priceAdd: 5000 },
      { id: "l", name: "Size L", priceAdd: 10000 },
    ],
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    initial?.options?.map((opt) => opt.id) || [],
  );
  const [isOnsite, setIsOnsite] = useState(initial?.isOnsite !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [recentImages, setRecentImages] = useState<any[]>([]);

  // Find matching ingredient to initialize inventory fields
  const matchingIngredient = useMemo(() => {
    if (!initial) return null;
    const inv = listInventory();
    return inv.ingredients.find(
      (ing) => ing.name.toLowerCase().trim() === initial.name.toLowerCase().trim()
    ) || null;
  }, [initial]);

  const [manageStockDirectly, setManageStockDirectly] = useState(Boolean(matchingIngredient));
  const [stockQuantity, setStockQuantity] = useState(matchingIngredient?.stockQuantity ?? 100);
  const [purchasePrice, setPurchasePrice] = useState(matchingIngredient?.purchasePrice ?? (initial?.price || 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(matchingIngredient?.lowStockThreshold ?? 10);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await listProductImages();
        setRecentImages(data.slice(0, 6));
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecent();
  }, []);

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadProductImage(file);
      setImage(url);
      toast.success("Tải ảnh lên thành công");
      // Update recent images
      const data = await listProductImages();
      setRecentImages(data.slice(0, 6));
    } catch (err) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUploadFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !categoryId) return;
    setIsSaving(true);
    try {
      const selectedOptions = optionTemplates.filter((opt) => selectedOptionIds.includes(opt.id));
      const productId = initial?.id || crypto.randomUUID();

      await onSave({
        id: productId,
        name,
        price,
        image,
        categoryId,
        variants: hasVariants ? variants.filter((v) => v.name.trim()) : undefined,
        options: selectedOptions.length > 0 ? selectedOptions : undefined,
        isOnsite,
      });

      // Synchronize to inventory in the background
      if (manageStockDirectly) {
        const inv = listInventory();
        const existingIng = matchingIngredient || inv.ingredients.find(
          (ing) => ing.name.toLowerCase().trim() === name.toLowerCase().trim()
        );

        const ingredientData = {
          id: existingIng?.id || `ing-${productId}`,
          name: name.trim(),
          unit: "cái",
          stockQuantity: stockQuantity,
          purchasePrice: purchasePrice || price,
          lowStockThreshold: lowStockThreshold,
        };
        await saveIngredient(ingredientData);
      } else if (matchingIngredient) {
        // If it was managed, but now unchecked, delete it from inventory
        await removeIngredient(matchingIngredient.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prod-name">Tên sản phẩm</Label>
          <Input
            id="prod-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Trà sữa Trân châu"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-price">Giá cơ bản</Label>
          <Input
            id="prod-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hình ảnh sản phẩm</Label>
          <div className="flex flex-col gap-6">
            {/* Primary Image Control */}
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Drop Zone Preview */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onPaste={handlePaste}
                tabIndex={0}
                className={cn(
                  "group relative flex h-32 w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                  isUploading ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <ProductImage image={image} name="Preview" className="transition-transform group-hover:scale-105" />
                
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" />
                  <span className="mt-1 text-[8px] font-bold uppercase text-white">Thả ảnh vào</span>
                </div>

                {image && image !== "🍽" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage("🍽");
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/20 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/40"
                    title="Xóa ảnh về mặc định"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="prod-icon"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="URL ảnh hoặc Emoji"
                      className="h-12 rounded-xl pr-10 font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {image.startsWith("http") ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      disabled={isUploading}
                      onChange={(e) => handleUploadFile(e.target.files?.[0]!)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 rounded-xl px-4 font-bold shadow-sm"
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "TẢI LÊN"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <p className="text-[10px] font-medium text-muted-foreground italic truncate">
                      {image.startsWith("http") ? `Đang dùng: ${image.split('/').pop()}` : "Dán link ảnh, nhập emoji hoặc chọn từ thư viện."}
                    </p>
                  </div>
                  
                  <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
                    <DialogTrigger asChild>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="h-8 shrink-0 rounded-lg text-[10px] font-black uppercase text-primary hover:bg-primary/5 border border-primary/20"
                      >
                        Thư viện ảnh
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-[32px] border-none shadow-2xl p-0">
                      <div className="p-8 pb-4">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Thư viện hình ảnh</DialogTitle>
                        </DialogHeader>
                      </div>
                      <div className="flex-1 overflow-y-auto px-8 pb-8">
                        <MediaLibrary 
                          selectedUrl={image} 
                          onSelect={(url) => {
                            console.log("Selected image URL:", url);
                            setImage(url);
                            setShowLibrary(false);
                            toast.success("Đã chọn ảnh từ thư viện");
                          }} 
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* Quick Access Library */}
            {recentImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ảnh mới tải lên gần đây</Label>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {recentImages.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setImage(img.url)}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                        image === img.url ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-muted/30"
                      )}
                    >
                      <img src={img.url} className="h-full w-full object-cover" alt="Recent" />
                      {image === img.url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="rounded-full bg-primary p-1 text-primary-foreground shadow-lg">
                            <Plus className="h-2 w-2" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                  {/* Emoji Quick Selection */}
                  {["🍦", "🥤", "🍵", "🍜", "🥟", "🍩"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setImage(emoji)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl border-2 bg-muted/30 text-xl transition-all hover:scale-105 hover:bg-muted/50",
                        image === emoji ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-cat">Danh mục</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="prod-cat">
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cấu hình thêm</Label>
        
        <div className="flex items-center space-x-2 rounded-lg border p-3">
          <Checkbox
            id="has-variants"
            checked={hasVariants}
            onCheckedChange={(checked) => setHasVariants(checked as boolean)}
          />
          <Label htmlFor="has-variants" className="cursor-pointer font-medium text-sm">Có phân loại Size (S/M/L...)</Label>
        </div>

        <div className="flex items-center space-x-2 rounded-lg border p-3 bg-primary/5 border-primary/20">
          <Checkbox
            id="is-onsite"
            checked={isOnsite}
            onCheckedChange={(checked) => setIsOnsite(checked as boolean)}
          />
          <Label htmlFor="is-onsite" className="cursor-pointer font-bold text-sm text-primary uppercase tracking-tight">Hiển thị Menu Online (moka.claro.vn)</Label>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.02] p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="manage-stock-directly"
              checked={manageStockDirectly}
              onCheckedChange={(checked) => setManageStockDirectly(checked as boolean)}
            />
            <Label htmlFor="manage-stock-directly" className="cursor-pointer font-bold text-sm text-violet-700 dark:text-violet-400">
              📦 QUẢN LÝ TỒN KHO TRỰC TIẾP (Thành phẩm bán sẵn)
            </Label>
          </div>
          
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Bật tính năng này cho các sản phẩm nhập sẵn để bán (đồ đóng chai, đóng gói...). 
            Hệ thống sẽ tự động tạo nguyên liệu trùng tên và khấu trừ tồn kho 1-1 khi bán mà không cần tạo công thức thủ công.
          </p>

          {manageStockDirectly && (
            <div className="mt-2 grid gap-3 sm:grid-cols-3 border-t border-violet-500/10 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="stock-qty" className="text-[10px] font-bold text-muted-foreground uppercase">Số lượng tồn kho</Label>
                <Input
                  id="stock-qty"
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchase-price" className="text-[10px] font-bold text-muted-foreground uppercase">Đơn giá nhập (đ)</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="low-threshold" className="text-[10px] font-bold text-muted-foreground uppercase">Ngưỡng báo sắp hết</Label>
                <Input
                  id="low-threshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>

        {hasVariants && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Các phiên bản Size</Label>
            {variants.map((variant, index) => (
              <div key={variant.id} className="flex items-center gap-2">
                <Input
                  value={variant.name}
                  onChange={(e) => {
                    const next = [...variants];
                    next[index] = { ...variant, name: e.target.value };
                    setVariants(next);
                  }}
                  placeholder="Tên size (VD: M)"
                  className="flex-1 h-9"
                />
                <Input
                  type="number"
                  value={variant.priceAdd}
                  onChange={(e) => {
                    const next = [...variants];
                    next[index] = { ...variant, priceAdd: Number(e.target.value) };
                    setVariants(next);
                  }}
                  placeholder="+Giá"
                  className="w-24 h-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVariants([...variants, { id: crypto.randomUUID(), name: "", priceAdd: 0 }])}
              className="w-full border shadow-sm h-9"
            >
              <Plus className="mr-2 h-4 w-4" /> Thêm size nhanh
            </Button>
          </div>
        )}

        {optionTemplates.length > 0 && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Các nhóm tùy chọn áp dụng</Label>
            <div className="flex flex-wrap gap-2">
              {optionTemplates.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOption(opt.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm",
                    selectedOptionIds.includes(opt.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {selectedOptionIds.includes(opt.id) && <Plus className="h-3 w-3 rotate-45" />}
                  {opt.name}
                </button>
              ))}
            </div>
            {selectedOptionIds.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">Sẽ không có các lựa chọn Đường/Đá/Topping cho món này.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel} className="rounded-xl">Hủy</Button>
        <Button onClick={handleSubmit} disabled={isSaving || !name.trim()} className="rounded-xl px-8 shadow-lg shadow-primary/20">
          {isSaving ? "Đang xử lý..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
};

export const OptionForm = ({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ProductOption;
  onSave: (option: ProductOption) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<"single" | "multi">(initial?.type || "single");
  const [choices, setChoices] = useState(
    initial?.choices || [{ id: crypto.randomUUID(), name: "", priceAdd: 0 }],
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name,
      type,
      choices: choices.filter((c) => c.name.trim()),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opt-name">Tên nhóm tùy chọn</Label>
          <Input
            id="opt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Chọn lượng đá"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opt-type">Cách chọn</Label>
          <Select value={type} onValueChange={(val) => setType(val as "single" | "multi")}>
            <SelectTrigger id="opt-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Chọn một (Radio)</SelectItem>
              <SelectItem value="multi">Chọn nhiều (Checkbox)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Lựa chọn con</Label>
        {choices.map((choice, index) => (
          <div key={choice.id} className="flex items-center gap-2">
            <Input
              value={choice.name}
              onChange={(e) => {
                const next = [...choices];
                next[index] = { ...choice, name: e.target.value };
                setChoices(next);
              }}
              placeholder="Tên lựa chọn"
              className="flex-1 h-9"
            />
            <Input
              type="number"
              value={choice.priceAdd}
              onChange={(e) => {
                const next = [...choices];
                next[index] = { ...choice, priceAdd: Number(e.target.value) };
                setChoices(next);
              }}
              placeholder="+Giá"
              className="w-24 h-9"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChoices(choices.filter((_, i) => i !== index))}
              className="h-9 w-9 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChoices([...choices, { id: crypto.randomUUID(), name: "", priceAdd: 0 }])}
          className="w-full border-2 border-dashed h-9"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm lựa chọn
        </Button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel} className="rounded-xl">Hủy</Button>
        <Button onClick={handleSubmit} disabled={!name.trim()} className="rounded-xl shadow-lg">Lưu nhóm tùy chọn</Button>
      </div>
    </div>
  );
};
