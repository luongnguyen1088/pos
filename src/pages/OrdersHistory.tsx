import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  ChefHat,
  ClipboardList,
  Clock3,
  Eye,
  FlaskConical,
  Loader2,
  PackageCheck,
  Printer,
  Search,
  Settings,
  SlidersHorizontal,
  Wallet,
  X,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Info,
  Receipt,
  ShoppingBag,
  Tag,
  Trash2,
  Filter,
  Pencil,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductImage } from "@/components/pos/ProductImage";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatOrderPrice,
  getKitchenReleaseMeta,
  getKitchenStatusMeta,
  getOrderTypeLabel,
  isKitchenOrderReleased,
  type KitchenOrder,
  type KitchenOrderStatus,
  updateKitchenOrderReleaseStatus,
  updateKitchenOrderStatus,
  useKitchenOrdersSnapshot,
  cancelKitchenOrder,
} from "@/lib/orders";
import { printOrder } from "@/lib/print";
import { PrintTemplates } from "@/components/pos/PrintTemplates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusFilter = "all" | "pending_payment" | "completed" | "cancelled";
type OrderTypeFilter = "all" | "dine-in" | "takeaway" | "delivery";
type SortOption = "latest" | "oldest" | "highest" | "lowest" | "updated";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả đơn" },
  { value: "pending_payment", label: "Chờ thanh toán" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const orderTypeFilters: { value: OrderTypeFilter; label: string }[] = [
  { value: "all", label: "Mọi loại đơn" },
  { value: "dine-in", label: "Tại chỗ" },
  { value: "takeaway", label: "Mang đi" },
  { value: "delivery", label: "Giao hàng" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "updated", label: "Cập nhật gần đây" },
  { value: "highest", label: "Tiền cao nhất" },
  { value: "lowest", label: "Tiền thấp nhất" },
  { value: "oldest", label: "Cũ nhất" },
];

const compactOrderTypeLabel: Record<Exclude<OrderTypeFilter, "all">, string> = {
  "dine-in": "Tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

const getFilterStatusMeta = (filter: StatusFilter) => {
  if (filter === "all") {
    return {
      label: "Tất cả đơn",
      className: "border-border bg-background text-foreground",
    };
  }
  if (filter === "pending_payment") {
    return {
      label: "Chờ thanh toán",
      className: "border-rose-200/50 bg-rose-500/10 text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400",
    };
  }
  if (filter === "completed") {
    return {
      label: "Đã hoàn thành",
      className: "border-emerald-200/50 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400",
    };
  }
  if (filter === "cancelled") {
    return {
      label: "Đã hủy",
      className: "border-slate-200/50 bg-slate-500/10 text-slate-600 dark:border-slate-900/30 dark:bg-slate-950/20 dark:text-slate-400",
    };
  }
  return {
    label: "Không xác định",
    className: "border-border bg-background text-foreground",
  };
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const isWithinDateRange = (order: KitchenOrder, fromDate: string, toDate: string) => {
  const orderDate = new Date(order.createdAt);

  if (fromDate) {
    const from = new Date(fromDate);
    if (orderDate < from) {
      return false;
    }
  }

  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (orderDate > to) {
      return false;
    }
  }

  return true;
};

const getPaymentMeta = (paymentStatus: KitchenOrder["paymentStatus"]) =>
  paymentStatus === "paid"
    ? {
        label: "Đã thanh toán",
        className: "border-success/20 bg-success/10 text-success",
      }
    : {
        label: "Chờ thanh toán",
        className: "border-warning/30 bg-warning/15 text-warning",
      };

const getQuickStatusAction = (status: KitchenOrderStatus) => {
  if (status === "new" || status === "preparing") {
    return {
      nextStatus: "completed" as KitchenOrderStatus,
      label: "Hoàn thành",
      icon: CheckCircle2,
    };
  }

  return null;
};

const sortOrders = (orders: KitchenOrder[], sortOption: SortOption) => {
  const sorted = [...orders];

  sorted.sort((left, right) => {
    if (sortOption === "oldest") {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    }

    if (sortOption === "highest") {
      return right.total - left.total;
    }

    if (sortOption === "lowest") {
      return left.total - right.total;
    }

    if (sortOption === "updated") {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  return sorted;
};

const OrderDetailDialog = ({
  order,
  open,
  onOpenChange,
  isMobile,
  updatingOrderId,
  onPrintStickers,
  onCancelOrder,
}: {
  order: KitchenOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  updatingOrderId: string | null;
  onPrintStickers: (order: KitchenOrder) => void;
  onCancelOrder: (orderId: string) => Promise<void>;
}) => {
  const navigate = useNavigate();

  if (!order) {
    return null;
  }

  const handleEditOrder = () => {
    localStorage.setItem("speedy-order-system:editing-order", JSON.stringify(order));
    onOpenChange(false);
    navigate("/");
  };

  const statusMeta = getKitchenStatusMeta(order.status);
  const paymentMeta = getPaymentMeta(order.paymentStatus);
  const isUpdating = updatingOrderId === order.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden border border-border p-0",
          isMobile
            ? "max-h-[92dvh] max-w-[calc(100vw-1rem)] rounded-[28px]"
            : "max-h-[90vh] max-w-5xl rounded-3xl",
        )}
      >
        {/* Header */}
        <div className={cn("border-b border-border bg-card/60 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-4")}>
          <div>
            <DialogHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className={cn(isMobile ? "text-xl" : "text-2xl", "font-black tracking-tight")}>
                  {order.number}
                </DialogTitle>
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-sm uppercase tracking-wide", statusMeta.className)}>
                    {statusMeta.label}
                  </Badge>
                  <Badge className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-sm uppercase tracking-wide", paymentMeta.className)}>
                    {paymentMeta.label}
                  </Badge>
                  <Badge className={cn(
                    "px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-sm uppercase tracking-wide",
                    order.orderSource === "kiosk"
                      ? "border-violet-200 bg-violet-500/10 text-violet-600 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-400"
                      : "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400"
                  )}>
                    {order.orderSource === "kiosk" ? "Khách tự đặt" : "Nhân viên POS"}
                  </Badge>
                </div>
              </div>
              <DialogDescription className="mt-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>{getOrderTypeLabel(order.orderType, "").split(":")[0]}</span>
                <span>•</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Content body */}
        <div className={cn("overflow-y-auto bg-background/50", isMobile ? "p-4 space-y-4 max-h-[75vh]" : "p-6 max-h-[75vh]")}>
          <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "lg:grid-cols-5 items-start")}>
            
            {/* Left Column: Details & Actions */}
            <div className={cn("space-y-4", isMobile ? "" : "lg:col-span-2")}>
              
              {/* Box 1: Tổng tiền */}
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-5 pointer-events-none">
                  <Receipt className="h-28 w-28 text-foreground" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Tổng thanh toán
                </div>
                <div className="mt-3 text-3xl font-black tracking-tight text-primary">
                  {formatOrderPrice(order.total)}
                </div>
                {order.discountAmount > 0 ? (
                  <div className="mt-2.5 border-t border-dashed border-border pt-2.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Tạm tính: {formatOrderPrice(order.subtotal)}</span>
                    <span className="text-success font-bold">Giảm: -{formatOrderPrice(order.discountAmount)}</span>
                  </div>
                ) : null}
              </div>

              {/* Box 2: Thông tin giao hàng */}
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Thông tin đơn nhận
                </div>
                <div className="text-sm font-semibold leading-relaxed text-foreground bg-muted/40 rounded-xl p-3 border border-border/50">
                  {getOrderTypeLabel(order.orderType, order.orderInfo)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground pt-1">
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground/80">Phương thức</span>
                    <span className="mt-1 block font-bold text-foreground">{order.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground/80">Loại phục vụ</span>
                    <span className="mt-1 block font-bold text-foreground">{compactOrderTypeLabel[order.orderType]}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Lịch sử trạng thái đơn hàng (Timeline) */}
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  Lịch sử trạng thái đơn hàng
                </div>
                
                <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  
                  {/* Step 1: Created */}
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 h-[12px] w-[12px] rounded-full border-2 border-primary bg-background" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Đã nhận đơn hàng</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(order.createdAt)}</div>
                    </div>
                  </div>

                  {/* Step 2: Paid */}
                  {order.paymentStatus === "paid" && (
                    <div className="relative">
                      <div className="absolute -left-[21px] mt-1 h-[12px] w-[12px] rounded-full border-2 border-emerald-500 bg-background" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">Đã thanh toán thành công</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {order.status === "completed" ? formatDateTime(order.updatedAt) : "Thanh toán tại quầy"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Current Status */}
                  {order.status !== "new" && (
                    <div className="relative">
                      <div className={cn(
                        "absolute -left-[21px] mt-1 h-[12px] w-[12px] rounded-full border-2 bg-background",
                        order.status === "completed" && "border-emerald-500 bg-emerald-500",
                        order.status === "cancelled" && "border-rose-500 bg-rose-500",
                        order.status === "preparing" && "border-amber-500 bg-amber-500"
                      )} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {order.status === "completed" && "Đơn hàng hoàn thành"}
                          {order.status === "preparing" && "Đang chế biến món ăn"}
                          {order.status === "cancelled" && "Đơn hàng đã hủy"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDateTime(order.updatedAt)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>

            </div>

            {/* Right Column: Items List & Actions */}
            <div className={cn("space-y-4", isMobile ? "" : "lg:col-span-3")}>
              
              {/* Món ăn list */}
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Danh sách món
                  </span>
                  <span>{order.items.length} món</span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/70 bg-background/50 hover:bg-background/80 transition-colors p-3.5 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/60 border border-border/40 shadow-inner">
                          <ProductImage image={item.image} name={item.name} fallbackClassName="text-xl" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <span className="text-primary font-black bg-primary/10 rounded px-1.5 py-0.5 text-xs">
                              x{item.quantity}
                            </span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          {item.variantName ? (
                            <div className="mt-1 text-xs font-semibold text-muted-foreground/80 flex items-center gap-1">
                              <Tag className="h-3 w-3 shrink-0" />
                              {item.variantName}
                            </div>
                          ) : null}
                          {item.options.length > 0 ? (
                            <div className="mt-1 text-xs text-muted-foreground font-medium pl-1 border-l-2 border-primary/20">
                              Tùy chọn: {item.options.join(", ")}
                            </div>
                          ) : null}
                          {item.note ? (
                            <div className="mt-1.5 text-xs italic font-semibold text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded-lg border border-rose-500/10 w-fit">
                              Ghi chú: {item.note}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-black text-foreground pt-0.5">
                        {formatOrderPrice(item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons panel */}
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex gap-2">
                  {order.status !== "cancelled" ? (
                    <>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onCancelOrder(order.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hủy đơn hàng
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={handleEditOrder}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Sửa đơn
                      </button>
                    </>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => printOrder(order, "kitchen")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                  >
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    In phiếu bếp
                  </button>
                  <button
                    onClick={() => onPrintStickers(order)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                  >
                    <PackageCheck className="h-4 w-4 text-muted-foreground" />
                    In Tem nhãn
                  </button>
                  <button
                    onClick={() => printOrder(order, "receipt")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black text-primary-foreground transition-opacity hover:opacity-90 shadow-sm shadow-primary/20"
                  >
                    <Printer className="h-4 w-4" />
                    In hóa đơn
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

const OrderHistoryCard = ({
  order,
  isMobile,
  onOpen,
  updatingOrderId,
  onPrintStickers,
}: {
  order: KitchenOrder;
  isMobile: boolean;
  onOpen: () => void;
  updatingOrderId: string | null;
  onPrintStickers: (order: KitchenOrder) => void;
}) => {
  const statusMeta = getKitchenStatusMeta(order.status);
  const paymentMeta = getPaymentMeta(order.paymentStatus);
  const quickAction = getQuickStatusAction(order.status);
  const isUpdating = updatingOrderId === order.id;

  const statusColorMap = {
    new: "border-l-blue-500",
    preparing: "border-l-amber-500",
    completed: "border-l-emerald-500",
    cancelled: "border-l-slate-400",
  };
  const leftBorderColor = statusColorMap[order.status] || "border-l-border";

  return (
    <article
      className={cn(
        "border border-border bg-card shadow-sm transition-all hover:shadow-md hover:scale-[1.005] duration-200 border-l-4 relative overflow-hidden",
        leftBorderColor,
        order.paymentStatus === "pending" 
          ? "ring-1 ring-amber-500/20 shadow-amber-500/5 bg-gradient-to-r from-amber-500/[0.01] to-transparent" 
          : "",
        isMobile ? "rounded-[20px] p-4" : "rounded-[24px] p-5",
      )}
    >
      {/* Background warning stripe if unpaid */}
      {order.paymentStatus === "pending" && (
        <div className="absolute top-0 right-0 w-24 h-6 bg-amber-500/10 text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center rotate-45 translate-x-6 translate-y-3 pointer-events-none select-none">
          Chưa thu
        </div>
      )}

      <div className={cn("flex gap-4", isMobile ? "flex-col" : "flex-col xl:flex-row xl:items-start xl:justify-between")}>
        <div className="min-w-0 space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("font-black tracking-tight text-foreground", isMobile ? "text-lg" : "text-xl")}>
              {order.number}
            </h2>
            <div className="flex flex-wrap gap-1">
              <Badge className={cn("border px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider scale-95", statusMeta.className)}>
                {statusMeta.label}
              </Badge>
              <Badge className={cn("border px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider scale-95", paymentMeta.className)}>
                {paymentMeta.label}
              </Badge>
              <Badge className={cn(
                "border px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider scale-95",
                order.orderSource === "kiosk"
                  ? "border-violet-200 bg-violet-500/10 text-violet-600 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-400"
                  : "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400"
              )}>
                {order.orderSource === "kiosk" ? "Khách tự đặt" : "Nhân viên POS"}
              </Badge>
            </div>
            <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground border border-border/40 uppercase tracking-wider">
              {compactOrderTypeLabel[order.orderType]}
            </span>
          </div>

          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span>{formatDateTime(order.createdAt)}</span>
            <span>•</span>
            <span className="text-foreground">{order.itemCount} sản phẩm</span>
            <span>•</span>
            <span className="text-foreground">{order.paymentMethod}</span>
          </div>

          <p className="line-clamp-2 text-sm text-foreground/80 bg-muted/20 p-2.5 rounded-xl border border-border/30 font-medium">
            {getOrderTypeLabel(order.orderType, order.orderInfo)}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {order.discountAmount > 0 ? (
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-500/10">
                Khuyến mãi -{formatOrderPrice(order.discountAmount)}
              </span>
            ) : null}
            {order.items.slice(0, isMobile ? 3 : 4).map((item) => (
              <span
                key={item.id}
                className="rounded-lg bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground border border-border/20 flex items-center gap-1"
              >
                <span className="text-primary font-bold">x{item.quantity}</span>
                <span className="truncate max-w-[120px]">{item.name}</span>
              </span>
            ))}
            {order.items.length > (isMobile ? 3 : 4) ? (
              <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border border-border/20">
                +{order.items.length - (isMobile ? 3 : 4)} món khác
              </span>
            ) : null}
          </div>
        </div>

        {/* Pricing and Actions area */}
        <div className={cn("flex gap-3", isMobile ? "flex-col border-t border-border/50 pt-3" : "items-end xl:items-start self-stretch justify-between xl:flex-col xl:justify-start xl:min-w-[190px] xl:border-l xl:border-border/40 xl:pl-4")}>
          <div className={cn("min-w-[128px]", isMobile ? "flex items-center justify-between" : "text-right w-full")}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tổng tiền</div>
            <div className="text-2xl font-black text-primary tracking-tight mt-0.5">{formatOrderPrice(order.total)}</div>
          </div>

          <div className={cn("flex flex-col gap-2 w-full")}>
            <div className="flex gap-2 w-full">
              <button
                onClick={onOpen}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/70"
              >
                <Eye className="h-3.5 w-3.5" />
                Chi tiết
              </button>
            </div>

            {/* Print Shortcuts */}
            {order.status !== "cancelled" && (
              <div className="flex gap-1.5 items-center w-full justify-between border-t border-dashed border-border/50 pt-2 mt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">In nhanh:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => printOrder(order, "kitchen")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors hover:bg-muted"
                    title="In phiếu bếp"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onPrintStickers(order)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors hover:bg-muted"
                    title="In Tem nhãn"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => printOrder(order, "receipt")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="In hóa đơn"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const OrdersHistory = () => {
  const isMobile = useIsMobile();
  const { orders, isLoading } = useKitchenOrdersSnapshot();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [orderSourceFilter, setOrderSourceFilter] = useState<"all" | "pos" | "kiosk">("all");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"bill" | "stickers" | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const keyword = search.trim().toLowerCase();

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      const todayStr = today.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      setFromDate(yesterdayStr);
      setToDate(yesterdayStr);
    } else if (preset === "last7") {
      const last7 = new Date();
      last7.setDate(today.getDate() - 6);
      const fromStr = last7.toISOString().split("T")[0];
      const toStr = today.toISOString().split("T")[0];
      setFromDate(fromStr);
      setToDate(toStr);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const fromStr = firstDay.toISOString().split("T")[0];
      const toStr = today.toISOString().split("T")[0];
      setFromDate(fromStr);
      setToDate(toStr);
    }
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setDatePreset("custom");
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    setDatePreset("custom");
  };

  const baseFilteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        keyword.length === 0 ||
        order.number.toLowerCase().includes(keyword) ||
        order.orderInfo.toLowerCase().includes(keyword) ||
        order.paymentMethod.toLowerCase().includes(keyword) ||
        order.items.some((item) => item.name.toLowerCase().includes(keyword));

      const matchOrderType = orderTypeFilter === "all" || order.orderType === orderTypeFilter;
      const matchDate = isWithinDateRange(order, fromDate, toDate);
      
      const matchPaymentStatus =
        paymentStatusFilter === "all" || order.paymentStatus === paymentStatusFilter;

      const matchPaymentMethod =
        paymentMethodFilter === "all" ||
        (paymentMethodFilter === "cash" && order.paymentMethod.includes("Tiền mặt")) ||
        (paymentMethodFilter === "qr" && order.paymentMethod.toLowerCase().includes("qr"));

      const matchOrderSource =
        orderSourceFilter === "all" ||
        (orderSourceFilter === "kiosk" && order.orderSource === "kiosk") ||
        (orderSourceFilter === "pos" && (order.orderSource === "pos" || !order.orderSource));

      return matchSearch && matchOrderType && matchDate && matchPaymentStatus && matchPaymentMethod && matchOrderSource;
    });
  }, [orders, keyword, orderTypeFilter, fromDate, toDate, paymentStatusFilter, paymentMethodFilter, orderSourceFilter]);

  const filteredOrders = useMemo(() => {
    const nextOrders =
      statusFilter === "all"
        ? baseFilteredOrders
        : statusFilter === "pending_payment"
          ? baseFilteredOrders.filter((order) => order.paymentStatus === "pending" && order.status !== "cancelled")
          : baseFilteredOrders.filter((order) => order.status === statusFilter);

    return sortOrders(nextOrders, sortOption);
  }, [baseFilteredOrders, statusFilter, sortOption]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const summary = useMemo(() => {
    const paidRevenue = filteredOrders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.total, 0);

    return {
      count: filteredOrders.length,
      activeOrders: filteredOrders.filter((order) => order.paymentStatus === "pending" && order.status !== "cancelled").length,
      pendingPayment: filteredOrders.filter((order) => order.paymentStatus === "pending" && order.status !== "cancelled").length,
      cancelledOrders: filteredOrders.filter((order) => order.status === "cancelled").length,
      paidRevenue,
    };
  }, [filteredOrders]);

  const statusCounts = useMemo(
    () => ({
      all: baseFilteredOrders.length,
      pending_payment: baseFilteredOrders.filter((order) => order.paymentStatus === "pending" && order.status !== "cancelled").length,
      completed: baseFilteredOrders.filter((order) => order.status === "completed").length,
      cancelled: baseFilteredOrders.filter((order) => order.status === "cancelled").length,
    }),
    [baseFilteredOrders],
  );

  const activeFilterCount =
    (keyword ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (orderTypeFilter !== "all" ? 1 : 0) +
    (sortOption !== "latest" ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0) +
    (paymentStatusFilter !== "all" ? 1 : 0) +
    (paymentMethodFilter !== "all" ? 1 : 0) +
    (orderSourceFilter !== "all" ? 1 : 0);

  const resetAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSortOption("latest");
    setFromDate("");
    setToDate("");
    setPaymentStatusFilter("all");
    setPaymentMethodFilter("all");
    setOrderSourceFilter("all");
    setDatePreset("all");
  };

  const handlePrintStickers = (order: KitchenOrder) => {
    setPrintData({
      orderNumber: order.number,
      items: order.items.map(item => ({
        product: { name: item.name },
        variant: item.variantName ? { name: item.variantName } : undefined,
        selectedOptions: item.options.map((opt, idx) => ({ optionId: String(idx), name: opt })),
        note: item.note,
        quantity: item.quantity,
        totalPrice: item.totalPrice
      })),
      subtotal: order.subtotal,
      total: order.total,
      discountAmount: order.discountAmount,
      paymentMethod: order.paymentMethod,
      orderType: order.orderType,
      orderInfo: order.orderInfo,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus
    });
    setPrintMode("stickers");
  };

  // Printing sequence effect
  useEffect(() => {
    if (printData && printMode) {
      document.body.classList.add(`printing-${printMode}`);
      
      const timer = setTimeout(() => {
        window.print();
        document.body.classList.remove(`printing-${printMode}`);
        setPrintMode(null);
        setPrintData(null);
      }, 1500);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove("printing-bill", "printing-stickers");
      };
    }
  }, [printData, printMode]);

  const handleStatusChange = async (orderId: string, status: KitchenOrderStatus) => {
    if (updatingOrderId) {
      return;
    }

    setUpdatingOrderId(orderId);

    try {
      await updateKitchenOrderStatus(orderId, status);
      toast.success(`Đã chuyển đơn sang "${getKitchenStatusMeta(status).label}"`);
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái đơn: " + ((error as any)?.message || String(error) || "Vui lòng thử lại sau."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (updatingOrderId) {
      return;
    }

    const reason = prompt("Nhập lý do hủy đơn hàng (tùy chọn):");
    if (reason === null) return; // User cancelled prompt

    setUpdatingOrderId(orderId);

    try {
      await cancelKitchenOrder(orderId, reason.trim());
      toast.success("Đã hủy đơn hàng và hoàn trả tồn kho");
      setSelectedOrderId(null); // Close the dialog
    } catch (error) {
      toast.error("Không thể hủy đơn hàng: " + ((error as any)?.message || String(error) || "Vui lòng thử lại sau."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const summaryCards = [
    {
      title: "Đơn đang hiển thị",
      value: String(summary.count),
      accent: "text-blue-600 dark:text-blue-400",
      bgGradient: "from-blue-500/10 to-indigo-500/5 border-blue-200/50 dark:from-blue-950/20 dark:to-indigo-950/10 dark:border-blue-900/30",
      icon: ClipboardList,
      iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
    },
    {
      title: "Chờ thanh toán",
      value: String(summary.pendingPayment),
      accent: "text-rose-600 dark:text-rose-400",
      bgGradient: "from-rose-500/10 to-red-500/5 border-rose-200/50 dark:from-rose-950/20 dark:to-red-950/10 dark:border-rose-900/30",
      icon: Wallet,
      iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400",
      isPulse: summary.pendingPayment > 0,
    },
    {
      title: "Đơn đã hủy",
      value: String(summary.cancelledOrders),
      accent: "text-slate-600 dark:text-slate-400",
      bgGradient: "from-slate-500/10 to-gray-500/5 border-slate-200/50 dark:from-slate-950/20 dark:to-gray-950/10 dark:border-slate-900/30",
      icon: Trash2,
      iconBg: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400",
    },
    {
      title: "Doanh thu đã thu",
      value: formatOrderPrice(summary.paidRevenue),
      accent: "text-emerald-600 dark:text-emerald-400",
      bgGradient: "from-emerald-500/10 to-teal-500/5 border-emerald-200/50 dark:from-emerald-950/20 dark:to-teal-950/10 dark:border-emerald-900/30",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
    },
  ] as const;

  return (
    <AdminLayout
      title="Quản lý đơn hàng"
      subtitle="Lọc nhanh, kiểm soát trạng thái và xử lý đơn ngay tại một màn hình."
    >
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div 
            key={card.title} 
            className={cn(
              "rounded-[24px] border bg-card p-4 shadow-sm sm:p-5 transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-gradient-to-br",
              card.bgGradient,
              card.title === "Chờ thanh toán" && card.isPulse && "ring-1 ring-rose-500/20 animate-pulse"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">{card.title}</div>
              <div className={cn("rounded-2xl p-2", card.iconBg)}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <div className={cn("mt-3 font-black tracking-tight", isMobile ? "text-xl leading-tight" : "text-3xl", card.accent)}>
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Trạng thái đơn hàng
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhấn vào từng nhóm để lọc nhanh danh sách đang hiển thị.
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <button
              onClick={resetAllFilters}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              Đặt lại bộ lọc
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusFilters.map((filter) => {
            const meta = getFilterStatusMeta(filter.value);

            const isCurrent = statusFilter === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "rounded-[20px] border p-4 text-left transition-colors relative overflow-hidden",
                  isCurrent
                    ? meta.className
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-black text-foreground">
                    {statusCounts[filter.value]}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {isMobile ? (
        <section className="space-y-3 rounded-[28px] border border-border bg-card p-4 shadow-sm">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã đơn, món, ghi chú..."
              className="w-full rounded-2xl border border-border bg-background px-11 py-3 text-sm text-foreground outline-none focus:border-primary"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors",
                  statusFilter === filter.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}

            <Sheet>
              <SheetTrigger asChild>
                <button className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-[28px] border-border bg-card px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5"
              >
                <SheetHeader className="text-left">
                  <SheetTitle>Bộ lọc nâng cao</SheetTitle>
                  <SheetDescription>Sắp xếp, lọc theo loại đơn, trạng thái thanh toán và ngày.</SheetDescription>
                </SheetHeader>

                <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Sắp xếp
                    </label>
                    <select
                      value={sortOption}
                      onChange={(event) => setSortOption(event.target.value as SortOption)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Loại đơn
                      </label>
                      <select
                        value={orderTypeFilter}
                        onChange={(event) => setOrderTypeFilter(event.target.value as OrderTypeFilter)}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                      >
                        {orderTypeFilters.map((filter) => (
                          <option key={filter.value} value={filter.value}>
                            {filter.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Thanh toán
                      </label>
                      <select
                        value={paymentStatusFilter}
                        onChange={(event) => setPaymentStatusFilter(event.target.value as any)}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                      >
                        <option value="all">Tất cả thanh toán</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="pending">Chờ thanh toán</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Phương thức thanh toán
                    </label>
                    <select
                      value={paymentMethodFilter}
                      onChange={(event) => setPaymentMethodFilter(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="all">Tất cả phương thức</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="qr">Chuyển khoản QR</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nguồn đơn
                    </label>
                    <select
                      value={orderSourceFilter}
                      onChange={(event) => setOrderSourceFilter(event.target.value as any)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="all">Tất cả nguồn</option>
                      <option value="pos">Nhân viên POS</option>
                      <option value="kiosk">Khách tự đặt</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lọc nhanh theo ngày
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { val: "all", label: "Tất cả" },
                        { val: "today", label: "Hôm nay" },
                        { val: "yesterday", label: "Hôm qua" },
                        { val: "last7", label: "7 ngày" },
                        { val: "thisMonth", label: "Tháng này" },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          onClick={() => applyDatePreset(preset.val)}
                          className={cn(
                            "rounded-xl px-3 py-2 text-xs font-semibold border transition-all",
                            datePreset === preset.val
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Từ ngày
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => handleFromDateChange(event.target.value)}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Đến ngày
                      </div>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => handleToDateChange(event.target.value)}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={resetAllFilters}
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground"
                    >
                      Đặt lại
                    </button>
                    <SheetClose asChild>
                      <button className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                        Áp dụng
                      </button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <label className="relative block flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã đơn, món, ghi chú..."
                className="w-full rounded-2xl border border-border bg-background px-11 py-3 text-sm text-foreground outline-none focus:border-primary transition-all shadow-inner focus:ring-1 focus:ring-primary/20"
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Xóa nội dung tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/50">
                {[
                  { val: "all", label: "Tất cả" },
                  { val: "today", label: "Hôm nay" },
                  { val: "yesterday", label: "Hôm qua" },
                  { val: "last7", label: "7 ngày" },
                  { val: "thisMonth", label: "Tháng này" },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    onClick={() => applyDatePreset(preset.val)}
                    className={cn(
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                      datePreset === preset.val
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-sm",
                  showAdvancedFilters || activeFilterCount > 0
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Bộ lọc nâng cao
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-black leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 pt-4 border-t border-dashed border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Trạng thái đơn</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  {statusFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Loại phục vụ</label>
                <select
                  value={orderTypeFilter}
                  onChange={(event) => setOrderTypeFilter(event.target.value as OrderTypeFilter)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  {orderTypeFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Trạng thái thanh toán</label>
                <select
                  value={paymentStatusFilter}
                  onChange={(event) => setPaymentStatusFilter(event.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="pending">Chờ thanh toán</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Phương thức thanh toán</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(event) => setPaymentMethodFilter(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="qr">Chuyển khoản QR</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Nguồn đơn</label>
                <select
                  value={orderSourceFilter}
                  onChange={(event) => setOrderSourceFilter(event.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="pos">Nhân viên POS</option>
                  <option value="kiosk">Khách tự đặt</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Sắp xếp</label>
                <select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as SortOption)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-3 xl:col-span-6">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Chọn khoảng ngày</label>
                <div className="flex gap-2 items-center max-w-md">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => handleFromDateChange(event.target.value)}
                    className="w-1/2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                  />
                  <span className="text-muted-foreground text-xs">→</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => handleToDateChange(event.target.value)}
                    className="w-1/2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeFilterCount > 0 ? (
        <section className="flex flex-wrap items-center gap-1.5">
          {keyword ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Từ khóa: {search}
            </span>
          ) : null}
          {statusFilter !== "all" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Trạng thái: {statusFilters.find((filter) => filter.value === statusFilter)?.label}
            </span>
          ) : null}
          {orderTypeFilter !== "all" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Loại đơn: {orderTypeFilters.find((filter) => filter.value === orderTypeFilter)?.label}
            </span>
          ) : null}
          {sortOption !== "latest" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Sắp xếp: {sortOptions.find((option) => option.value === sortOption)?.label}
            </span>
          ) : null}
          {fromDate ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Từ: {fromDate}
            </span>
          ) : null}
          {toDate ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Đến: {toDate}
            </span>
          ) : null}
          {paymentStatusFilter !== "all" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Thanh toán: {paymentStatusFilter === "paid" ? "Đã trả" : "Chờ trả"}
            </span>
          ) : null}
          {paymentMethodFilter !== "all" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Phương thức: {paymentMethodFilter === "cash" ? "Tiền mặt" : "Chuyển khoản QR"}
            </span>
          ) : null}
          {orderSourceFilter !== "all" ? (
            <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/40">
              Nguồn đơn: {orderSourceFilter === "kiosk" ? "Khách tự đặt" : "Nhân viên POS"}
            </span>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Danh sách đơn
          </h2>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Tìm thấy {filteredOrders.length} đơn hàng. Các đơn mới và chưa thanh toán được ưu tiên nổi bật.
          </p>
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border border-border bg-card shadow-sm rounded-[24px] p-5 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 w-2/3">
                  <div className="h-6 w-24 rounded-lg bg-muted/70" />
                  <div className="h-5 w-16 rounded-full bg-muted/60" />
                  <div className="h-5 w-20 rounded-full bg-muted/60" />
                  <div className="h-5 w-16 rounded-full bg-muted/50" />
                </div>
                <div className="h-6 w-24 rounded bg-muted/70" />
              </div>
              <div className="h-4 w-1/3 rounded bg-muted/60" />
              <div className="h-4 w-1/2 rounded bg-muted/50" />
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="h-6 w-20 rounded-full bg-muted/65" />
                <div className="h-6 w-28 rounded-full bg-muted/65" />
                <div className="h-6 w-24 rounded-full bg-muted/65" />
              </div>
            </div>
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Không có đơn nào khớp với bộ lọc hiện tại
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thử nới rộng điều kiện bộ lọc hoặc xoá từ khoá tìm kiếm để xem thêm đơn.
            </p>
            <button
              onClick={resetAllFilters}
              className="mt-5 rounded-2xl bg-primary px-5 py-3 text-xs font-black text-primary-foreground transition-opacity hover:opacity-90 shadow-sm shadow-primary/25"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((order) => (
              <OrderHistoryCard
                key={order.id}
                order={order}
                isMobile={isMobile}
                onOpen={() => setSelectedOrderId(order.id)}
                updatingOrderId={updatingOrderId}
                onPrintStickers={handlePrintStickers}
              />
            ))}
          </div>
        )}
      </section>

      <OrderDetailDialog
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        isMobile={isMobile}
        updatingOrderId={updatingOrderId}
        onPrintStickers={handlePrintStickers}
        onCancelOrder={handleCancelOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrderId(null);
          }
        }}
      />
      {createPortal(
        <PrintTemplates data={printData} mode={printMode || undefined} ref={printRef} />,
        document.getElementById("print-root") || document.body
      )}
    </AdminLayout>
  );
};

export default OrdersHistory;
