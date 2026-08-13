import { useMemo, useState } from "react";
import { X, Banknote, Copy, QrCode, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { OrderType, CartItem } from "@/data/products";
import { type DiscountSummary } from "@/lib/discounts";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { brand } from "@/lib/brand";

interface Props {
  items: CartItem[];
  subtotal: number;
  discountSummary: DiscountSummary;
  total: number;
  orderType: OrderType;
  orderInfo: string;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

type PaymentMethod = "cash" | "qr" | "draft";

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const BANK_ACCOUNT = {
  ownerName: brand.bankAccountName,
  bankName: "VietinBank",
  bankCode: "970415",
  accountNumber: brand.bankAccount,
};

const methods: {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "cash",
    name: "Tiền mặt",
    description: "Nhấp để xác nhận nhận tiền mặt và in hóa đơn",
    icon: <Banknote className="h-6 w-6" />,
  },
  // Tạm ẩn chức năng QR ngân hàng và Thanh toán sau theo yêu cầu
  /*
  {
    id: "qr",
    name: "QR ngân hàng",
    description: "Tạo đơn chờ thanh toán và chờ n8n xác nhận",
    icon: <QrCode className="h-6 w-6" />,
  },
  {
    id: "draft",
    name: "Thanh toán sau",
    description: "Lưu đơn tạm và in tem pha chế cho bếp làm trước",
    icon: <ClipboardList className="h-6 w-6" />,
  },
  */
];

const PaymentDialog = ({
  items,
  subtotal,
  discountSummary,
  total,
  orderType,
  orderInfo,
  onConfirm,
  onClose,
  isSubmitting,
}: Props) => {
  const isMobile = useIsMobile();
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const canConfirm = true;
  const orderTypeLabel =
    orderType === "dine-in" ? "🪑" : orderType === "takeaway" ? "🛍" : "🛵";
  const orderInfoLabel =
    orderInfo || (orderType === "dine-in" ? "Tại chỗ" : orderType === "takeaway" ? "Mang đi" : "");

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error(`Không thể sao chép ${label.toLowerCase()}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-card shadow-2xl flex flex-col",
          isMobile ? "h-[92dvh] rounded-t-[28px] overflow-hidden" : "max-w-lg rounded-2xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Thanh toán</h3>
            <p className="text-sm text-muted-foreground">Chọn phương thức và xác nhận cuối</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-6 sm:max-h-[80vh]">
          <div className="rounded-2xl bg-muted p-4">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted-foreground">
                {orderTypeLabel} {orderInfoLabel}
              </p>
              <p className="text-3xl font-bold text-primary">{formatPrice(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{items.length} sản phẩm</p>
            </div>

            <div className="mt-3 space-y-1 rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Giảm giá</span>
                <span>
                  {discountSummary.amount > 0
                    ? `- ${formatPrice(discountSummary.amount)}`
                    : formatPrice(0)}
                </span>
              </div>
            </div>
          </div>

          <div className={cn("grid gap-2", methods.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {methods.map((item) => (
              <button
                key={item.id}
                onClick={() => setMethod(item.id)}
                className={cn(
                  "rounded-2xl border-2 px-4 py-4 text-left transition-all",
                  method === item.id
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-foreground hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-background/70 p-2">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="font-semibold">{item.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>



          {method === "qr" ? (
            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Flow chuyển khoản POS
                </div>
                <div className="mt-3 space-y-2 text-sm text-foreground">
                  <div>1. Tạo đơn hàng với trạng thái chờ thanh toán.</div>
                  <div>2. POS hiển thị mã QR theo đúng mã đơn để khách chuyển khoản.</div>
                  <div>3. n8n xác nhận tiền vào rồi hệ thống mới in phiếu và hoàn tất đơn.</div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="rounded-xl bg-muted/70 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ngân hàng
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{BANK_ACCOUNT.bankName}</span>
                    <button
                      onClick={() => copyValue(BANK_ACCOUNT.bankName, "ngân hàng")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/70 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Chủ tài khoản
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{BANK_ACCOUNT.ownerName}</span>
                    <button
                      onClick={() => copyValue(BANK_ACCOUNT.ownerName, "tên tài khoản")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/70 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Số tài khoản
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{BANK_ACCOUNT.accountNumber}</span>
                    <button
                      onClick={() => copyValue(BANK_ACCOUNT.accountNumber, "số tài khoản")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/5 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Số tiền cần chuyển
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
                    <button
                      onClick={() => copyValue(String(total), "số tiền")}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-warning/20 bg-warning/5 px-3 py-3 text-sm text-foreground">
                Sau khi bấm tiếp tục, POS sẽ tạo đơn QR chưa thanh toán và chờ webhook n8n xác nhận tự động.
              </div>
            </div>
          ) : null}
          {method === "draft" ? (
            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Chế độ Thanh toán sau
                </div>
                <div className="mt-3 text-sm text-foreground leading-relaxed">
                  Đơn hàng sẽ được lưu dưới dạng <strong>Đơn tạm (Chờ thanh toán)</strong> nhưng vẫn <strong>in tem và gửi bếp làm đồ ngay</strong>. Khi khách ra về, bạn mở danh sách đơn tạm để thu tiền và in bill.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => onConfirm(method)}
            disabled={!canConfirm || isSubmitting}
            className="w-full rounded-xl bg-success py-4 text-lg font-bold text-success-foreground shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : method === "cash" ? (
              "Xác nhận đã thu tiền mặt"
            ) : method === "draft" ? (
              "Lưu đơn tạm & Gửi bếp"
            ) : (
              "Tạo đơn QR và chờ thanh toán"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDialog;
