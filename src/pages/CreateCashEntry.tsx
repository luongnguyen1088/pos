import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Banknote,
  CreditCard,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createCashEntry,
  formatCashEntryPrice,
  updateCashEntry,
  type CashEntryChannel,
  type CashEntryType,
  useCashEntries,
} from "@/lib/cashbook";

const QUICK_CATEGORIES = {
  expense: ["Nhập hàng", "Điện nước", "Lương NV", "Vận chuyển", "Mặt bằng", "Marketing", "Sửa chữa", "Khác"],
  income: ["Tiền thừa", "Hoàn tiền", "Khác"]
};

const QUICK_TITLES = {
  expense: ["Thanh toán tiền điện", "Mua trà sữa & topping", "Trả lương nhân viên", "Phí ship hàng", "Mua túi & ly"],
  income: ["Tiền khách trả thừa", "Hoàn trả tiền nhập hàng"]
};

const entryTypeOptions: { value: CashEntryType; label: string }[] = [
  { value: "expense", label: "Phiếu Chi" },
  { value: "income", label: "Phiếu Thu" },
];

const channelOptions: { value: CashEntryChannel; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Chuyển khoản" },
  { value: "other", label: "Khác" },
];

const toDateTimeInputValue = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const CreateCashEntry = () => {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId?: string }>();
  const cashEntries = useCashEntries();
  const isEditMode = Boolean(entryId);
  const editingEntry = useMemo(
    () => (entryId ? cashEntries.find((entry) => entry.id === entryId) : null),
    [cashEntries, entryId],
  );
  const [entryType, setEntryType] = useState<CashEntryType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<CashEntryChannel>("cash");
  const [occurredAt, setOccurredAt] = useState(() => toDateTimeInputValue(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hydratedEntryId, setHydratedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      setHydratedEntryId(null);
      return;
    }

    if (!editingEntry || hydratedEntryId === editingEntry.id) {
      return;
    }

    setEntryType(editingEntry.entryType);
    setTitle(editingEntry.title);
    setAmount(String(editingEntry.amount));
    setCategory(editingEntry.category);
    setNote(editingEntry.note);
    setChannel(editingEntry.channel);
    setOccurredAt(toDateTimeInputValue(editingEntry.occurredAt));
    setHydratedEntryId(editingEntry.id);
  }, [editingEntry, hydratedEntryId, isEditMode]);

  const handleQuickAmount = (val: number) => {
    const current = Number(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSaveEntry = async () => {
    if (!title.trim() || !amount.trim()) {
      toast.error("Vui lòng nhập tiêu đề và số tiền");
      return;
    }

    if (isEditMode && !editingEntry) {
      toast.error("Không tìm thấy phiếu cần sửa");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        amount: Number(amount),
        entryType,
        category: category.trim() || "Khác",
        note,
        channel,
        occurredAt: new Date(occurredAt).toISOString(),
      };

      if (isEditMode && entryId) {
        await updateCashEntry(entryId, payload);
      } else {
        await createCashEntry(payload);
      }

      toast.success(
        isEditMode
          ? "Đã cập nhật phiếu"
          : `${entryType === "income" ? "Đã thêm khoản thu" : "Đã thêm khoản chi"}`,
      );
      navigate("/cashbook");
    } catch (error) {
      toast.error(isEditMode ? "Không thể cập nhật bút toán" : "Không thể lưu bút toán", {
        description: error instanceof Error ? error.message : "Có lỗi xảy ra.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fcfdfa] selection:bg-primary/20">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/70 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl bg-muted/50 p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {isEditMode ? "Sửa chứng từ" : "Chứng từ mới"}
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {isEditMode ? "Cập nhật phát sinh" : "Phát sinh nội bộ"}
              </p>
            </div>
          </div>
          <div className={cn(
            "rounded-full px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/10 transition-all",
            entryType === "income" ? "bg-success" : "bg-destructive"
          )}>
            {entryType === "income" ? "Ghi thu" : "Ghi chi"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 pb-32 sm:p-8">
        <div className="space-y-10">
          <div className="flex gap-1.5 p-1 bg-muted/50 rounded-2xl border border-primary/5">
            {entryTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setEntryType(option.value);
                  if (!isEditMode) {
                    setCategory("");
                    setTitle("");
                  }
                }}
                className={cn(
                  "flex-1 rounded-xl py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                  entryType === option.value
                    ? "bg-white text-primary shadow-sm ring-1 ring-primary/5"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">
                Giá trị giao dịch
              </label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all">
                  <span className="text-2xl font-bold">₫</span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full rounded-3xl border border-primary/10 bg-white px-14 py-8 text-4xl font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-8 focus:ring-primary/5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                />
                {amount && Number(amount) > 0 && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl animate-in fade-in zoom-in slide-in-from-right-2 duration-300">
                    {formatCashEntryPrice(Number(amount))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-2 px-1">
                {[20000, 50000, 100000, 200000, 500000, 1000000, 2000000].map(val => (
                  <button
                    key={val}
                    onClick={() => handleQuickAmount(val)}
                    className="rounded-xl border border-primary/5 bg-white py-3 text-[10px] font-bold text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95 shadow-sm"
                  >
                    +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                  </button>
                ))}
                <button
                  onClick={() => setAmount("")}
                  className="rounded-xl border border-destructive/10 bg-destructive/5 py-3 text-[10px] font-bold text-destructive transition-all hover:bg-destructive/10 active:scale-95 shadow-sm"
                >
                  Xoá
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">
                Nội dung chứng từ
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhập tiêu đề..."
                className="w-full rounded-2xl border border-primary/10 bg-white px-5 py-4 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm"
              />
              <div className="flex flex-wrap gap-1.5 px-1">
                {QUICK_TITLES[entryType].map(t => (
                  <button
                    key={t}
                    onClick={() => setTitle(t)}
                    className="rounded-full bg-muted/50 px-4 py-1.5 text-[9px] font-bold text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Phân loại</label>
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="VD: Nhập hàng"
                  className="w-full rounded-2xl border border-primary/10 bg-white px-5 py-3.5 text-sm font-semibold outline-none focus:border-primary transition-all shadow-sm"
                />
                <div className="flex flex-wrap gap-1.5 px-1">
                  {QUICK_CATEGORIES[entryType].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all",
                        category === cat 
                          ? "bg-primary text-white shadow-md shadow-primary/10" 
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Phương thức</label>
                <div className="flex gap-2">
                  {channelOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setChannel(opt.value)}
                      className={cn(
                        "flex-1 rounded-2xl border py-4 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm",
                        channel === opt.value 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-primary/10 bg-white text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {opt.value === "cash" ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      <span className="text-[8px] font-bold uppercase tracking-widest">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 pt-4 border-t border-primary/5">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Thời gian</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="w-full rounded-2xl border border-primary/10 bg-white px-5 py-3.5 text-sm font-semibold outline-none focus:border-primary transition-all shadow-sm"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Ghi chú</label>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Thông tin bổ sung..."
                  className="w-full rounded-2xl border border-primary/10 bg-white px-5 py-3.5 text-sm font-semibold outline-none focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-primary/10 bg-white/80 p-5 backdrop-blur-xl z-50">
        <div className="mx-auto flex max-w-2xl gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white text-muted-foreground transition-all hover:bg-muted active:scale-90 shadow-sm"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={handleSaveEntry}
            disabled={isSubmitting}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50",
              entryType === "income" ? "bg-success shadow-success/20" : "bg-destructive shadow-destructive/20"
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang xử lý...</span>
              </div>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>{isEditMode ? "Cập nhật chứng từ" : "Lưu chứng từ"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCashEntry;
