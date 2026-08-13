import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { usePromotions, savePromotion, deletePromotion, type Promotion, type PromotionType } from "@/lib/promotions";
import {
  Tag,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export default function Promotions() {
  const { promotions, isLoading, error } = usePromotions();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  
  // Form States
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<PromotionType>("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [minOrderValue, setMinOrderValue] = useState(0);
  const [maxUses, setMaxUses] = useState<number | "">("" );
  const [allowedOrderTypes, setAllowedOrderTypes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filter promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) =>
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (promo.description && promo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [promotions, searchQuery]);

  // Open dialog for new promotion
  const handleCreateNew = () => {
    setEditingPromo(null);
    setCode("");
    setDescription("");
    setDiscountType("amount");
    setDiscountValue(0);
    setMinOrderValue(0);
    setMaxUses("");
    setAllowedOrderTypes([]);
    setIsActive(true);
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setCode(promo.code);
    setDescription(promo.description || "");
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setMinOrderValue(promo.minOrderValue);
    setMaxUses(promo.maxUses ?? "");
    setAllowedOrderTypes(promo.allowedOrderTypes ?? []);
    setIsActive(promo.isActive);
    setIsDialogOpen(true);
  };

  // Toggle active state directly from table
  const handleToggleActive = async (promo: Promotion) => {
    try {
      const updated = { ...promo, isActive: !promo.isActive };
      await savePromotion(updated);
      toast.success(`Đã ${updated.isActive ? "kích hoạt" : "tạm dừng"} mã ${promo.code}`);
    } catch (err) {
      toast.error("Không thể thay đổi trạng thái hoạt động: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Delete promotion
  const handleDelete = async (code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã khuyến mãi ${code}?`)) {
      return;
    }
    try {
      await deletePromotion(code);
      toast.success(`Đã xóa thành công mã ${code}`);
    } catch (err) {
      toast.error("Không thể xóa mã khuyến mãi: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Vui lòng nhập mã khuyến mãi.");
      return;
    }
    if (discountValue <= 0) {
      toast.error("Giá trị giảm giá phải lớn hơn 0.");
      return;
    }
    if (discountType === "percent" && discountValue > 100) {
      toast.error("Phần trăm giảm giá tối đa là 100%.");
      return;
    }

    setIsSaving(true);
    try {
      await savePromotion({
        code: cleanCode,
        description: description.trim() || null,
        discountType,
        discountValue,
        minOrderValue,
        maxUses: maxUses === "" ? null : Number(maxUses),
        usesCount: editingPromo?.usesCount ?? 0,
        allowedOrderTypes: allowedOrderTypes.length > 0 ? allowedOrderTypes : null,
        isActive,
      });
      toast.success(editingPromo ? `Cập nhật thành công mã ${cleanCode}` : `Tạo thành công mã ${cleanCode}`);
      setIsDialogOpen(false);
    } catch (err) {
      toast.error("Lỗi khi lưu thông tin khuyến mãi: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Khuyến mãi & Ưu đãi"
      subtitle="Quản lý mã giảm giá, chương trình chiết khấu và sự kiện ưu đãi tại quán."
      actions={
        <Button onClick={handleCreateNew} className="rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10">
          <Plus className="w-4 h-4" />
          <span>Tạo mã mới</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Statistics */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm mã hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 rounded-lg border-border text-xs font-semibold">
              Tổng số: {promotions.length} mã
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
              Hoạt động: {promotions.filter(p => p.isActive).length} mã
            </Badge>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground font-semibold">Đang tải dữ liệu...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Lỗi: {error}</span>
          </div>
        )}

        {/* Promotions List Grid */}
        {!isLoading && !error && (
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mã giảm giá</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Giá trị giảm</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Đơn tối thiểu</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lượt dùng</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Trạng thái</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPromotions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-sm font-semibold text-muted-foreground">
                        Không có chương trình khuyến mãi nào được tìm thấy.
                      </td>
                    </tr>
                  ) : (
                    filteredPromotions.map((promo) => (
                      <tr key={promo.code} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Tag className="w-4 h-4" />
                            </div>
                            <span className="font-black text-sm text-foreground">{promo.code}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-muted-foreground max-w-xs truncate">
                          {promo.description || "Không có mô tả"}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="px-2.5 py-1 rounded-md font-bold text-xs">
                            {promo.discountType === "percent"
                              ? `Giảm ${promo.discountValue}%`
                              : `Giảm ${formatPrice(promo.discountValue)}`}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm font-bold text-foreground">
                          {promo.minOrderValue > 0 ? formatPrice(promo.minOrderValue) : "Không yêu cầu"}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {promo.maxUses !== null ? (
                              <Badge
                                variant="outline"
                                className={`px-2 py-0.5 rounded-md text-xs font-bold w-fit ${
                                  promo.usesCount >= promo.maxUses
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                              >
                                {promo.usesCount}/{promo.maxUses} lượt
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Không giới hạn</span>
                            )}
                            {promo.allowedOrderTypes && promo.allowedOrderTypes.length > 0 && (
                              <Badge variant="outline" className="px-2 py-0.5 rounded-md text-xs font-semibold w-fit bg-blue-500/10 text-blue-600 border-blue-500/20">
                                {promo.allowedOrderTypes.map(t =>
                                  t === "dine-in" ? "Ăn tại chỗ" : t === "takeaway" ? "Mang đi" : "Giao hàng"
                                ).join(", ")}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleActive(promo)}
                            className="inline-flex focus:outline-none"
                            title={promo.isActive ? "Tạm dừng" : "Kích hoạt"}
                          >
                            {promo.isActive ? (
                              <ToggleRight className="w-9 h-9 text-emerald-500 transition-transform active:scale-95" />
                            ) : (
                              <ToggleLeft className="w-9 h-9 text-muted-foreground transition-transform active:scale-95" />
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(promo)}
                              className="h-8.5 w-8.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(promo.code)}
                              className="h-8.5 w-8.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Promotion Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl border-border bg-card">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingPromo ? `Chỉnh sửa mã ${editingPromo.code}` : "Tạo mã khuyến mãi mới"}
              </DialogTitle>
              <DialogDescription>
                Thiết lập thông tin mã giảm giá, giới hạn giá trị đơn hàng áp dụng.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mã code</Label>
                <Input
                  id="code"
                  disabled={!!editingPromo}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ví dụ: MOKA50"
                  className="h-10.5 rounded-xl border-border bg-background uppercase font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả chương trình</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Giảm 50k cho đơn từ 200k"
                  className="h-10.5 rounded-xl border-border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="discountType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loại chiết khấu</Label>
                  <select
                    id="discountType"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as PromotionType)}
                    className="w-full h-10.5 px-3 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="amount">Theo số tiền (đ)</option>
                    <option value="percent">Theo phần trăm (%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="discountValue" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giá trị giảm</Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min={0}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === "percent" ? "5, 10, 15..." : "20000, 50000..."}
                    className="h-10.5 rounded-xl border-border bg-background font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minOrderValue" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đơn tối thiểu (đ)</Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  min={0}
                  value={minOrderValue || ""}
                  onChange={(e) => setMinOrderValue(Number(e.target.value))}
                  placeholder="Ví dụ: 200000"
                  className="h-10.5 rounded-xl border-border bg-background font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxUses" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giới hạn lượt dùng</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Để trống = không giới hạn"
                    className="h-10.5 rounded-xl border-border bg-background font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="allowedOrderTypes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loại đơn áp dụng</Label>
                  <select
                    id="allowedOrderTypes"
                    value={allowedOrderTypes.length === 0 ? "all" : allowedOrderTypes[0]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllowedOrderTypes(val === "all" ? [] : [val]);
                    }}
                    className="w-full h-10.5 px-3 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Tất cả loại đơn</option>
                    <option value="dine-in">Chỉ Ăn tại chỗ</option>
                    <option value="takeaway">Chỉ Mang đi</option>
                    <option value="delivery">Chỉ Giao hàng</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="isActive" className="text-xs font-bold text-foreground">Kích hoạt chương trình</Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">Tự động cho phép áp dụng mã này khi đặt hàng.</span>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border border-border"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving} className="rounded-xl px-5">
                {isSaving ? "Đang lưu..." : "Lưu lại"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
