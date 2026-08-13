import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Activity,
  ArrowLeft,
  Banknote,
  BarChart3,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  Download,
  Filter,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addDays,
  differenceInCalendarDays,
  endOfYesterday,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYesterday,
  subDays,
} from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  deleteCashEntry,
  formatCashEntryPrice,
  getCashEntryTypeMeta,
  type CashEntryChannel,
  type CashEntryType,
  useCashEntries,
} from "@/lib/cashbook";
import { formatOrderPrice, useKitchenOrders } from "@/lib/orders";

type EntryFilter = "all" | CashEntryType;
type DateRangePreset = "today" | "yesterday" | "last7days" | "thisMonth" | "all";

type HistoryItem = {
  id: string;
  title: string;
  amount: number;
  entryType: CashEntryType;
  category: string;
  note: string;
  channel: CashEntryChannel;
  occurredAt: string;
  isOrder: boolean;
};

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "last7days", label: "7 ngày" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "all", label: "Tất cả" },
];

const filterOptions: { value: EntryFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "income", label: "Thu" },
  { value: "expense", label: "Chi" },
];

const channelOptions: { value: CashEntryChannel; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Chuyển khoản" },
  { value: "other", label: "Khác" },
];

const channelLabelByValue = new Map(channelOptions.map((option) => [option.value, option.label]));

const expenseColors = [
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

const getRangeLabel = (value: DateRangePreset) =>
  dateRangeOptions.find((option) => option.value === value)?.label ?? "Tháng này";

const Cashbook = () => {
  const isMobile = useIsMobile();
  const orders = useKitchenOrders();
  const cashEntries = useCashEntries();
  const [filter, setFilter] = useState<EntryFilter>("all");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("thisMonth");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"transactions" | "reports">("transactions");

  const dateInterval = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { start: startOfDay(now), end: now };
      case "yesterday":
        return { start: startOfYesterday(), end: endOfYesterday() };
      case "last7days":
        return { start: startOfDay(subDays(now, 6)), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: now };
      case "all":
      default:
        return null;
    }
  }, [datePreset]);

  const filteredOrders = useMemo(() => {
    if (!dateInterval) {
      return orders.filter((order) => order.paymentStatus === "paid" && order.status !== "cancelled");
    }
    return orders.filter(
      (order) =>
        order.paymentStatus === "paid" &&
        order.status !== "cancelled" &&
        isWithinInterval(parseISO(order.createdAt), dateInterval),
    );
  }, [orders, dateInterval]);

  const filteredEntries = useMemo(() => {
    let result = cashEntries;

    if (dateInterval) {
      result = result.filter((entry) =>
        isWithinInterval(parseISO(entry.occurredAt), dateInterval)
      );
    }

    if (filter !== "all") {
      result = result.filter((entry) => entry.entryType === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.note.toLowerCase().includes(q)
      );
    }

    return result;
  }, [cashEntries, dateInterval, filter, searchQuery]);

  const allHistoryItems = useMemo<HistoryItem[]>(() => {
    const orderItems: HistoryItem[] = filteredOrders.map((order) => ({
      id: order.id,
      title: `Đơn hàng ${order.number}`,
      amount: order.total,
      entryType: "income",
      category: "Bán hàng",
      note: order.orderInfo || order.paymentMethod,
      channel: order.paymentMethod.toLowerCase().includes("tiền mặt") ? "cash" : "bank",
      occurredAt: order.createdAt,
      isOrder: true,
    }));

    const manualItems: HistoryItem[] = filteredEntries.map((entry) => ({
      ...entry,
      isOrder: false,
    }));

    return [...orderItems, ...manualItems].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }, [filteredOrders, filteredEntries]);

  const summary = useMemo(() => {
    const orderRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const extraIncome = filteredEntries
      .filter((entry) => entry.entryType === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpense = filteredEntries
      .filter((entry) => entry.entryType === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      orderRevenue,
      extraIncome,
      totalIncome: orderRevenue + extraIncome,
      totalExpense,
      netCashflow: orderRevenue + extraIncome - totalExpense,
    };
  }, [filteredEntries, filteredOrders]);

  const chartData = useMemo(() => {
    const now = new Date();
    const rawRange = dateInterval ?? { start: startOfDay(subDays(now, 29)), end: now };
    const rangeLength = differenceInCalendarDays(rawRange.end, rawRange.start);
    const startDate = rangeLength > 45 ? startOfDay(subDays(rawRange.end, 29)) : startOfDay(rawRange.start);
    const endDate = rawRange.end;
    const dayCount = Math.max(0, differenceInCalendarDays(endDate, startDate));
    const days: Record<string, { date: string; displayDate: string; income: number; expense: number }> = {};

    for (let index = 0; index <= dayCount; index += 1) {
      const date = addDays(startDate, index);
      const key = format(date, "yyyy-MM-dd");
      days[key] = {
        date: key,
        displayDate: format(date, "dd/MM"),
        income: 0,
        expense: 0,
      };
    }

    filteredOrders.forEach((order) => {
      const occurredAt = parseISO(order.createdAt);
      if (!isWithinInterval(occurredAt, { start: startDate, end: endDate })) return;

      const dayKey = format(occurredAt, "yyyy-MM-dd");
      if (days[dayKey]) {
        days[dayKey].income += order.total;
      }
    });

    filteredEntries.forEach((entry) => {
      const occurredAt = parseISO(entry.occurredAt);
      if (!isWithinInterval(occurredAt, { start: startDate, end: endDate })) return;

      const dayKey = format(occurredAt, "yyyy-MM-dd");
      if (!days[dayKey]) return;

      if (entry.entryType === "income") {
        days[dayKey].income += entry.amount;
      } else {
        days[dayKey].expense += entry.amount;
      }
    });

    return Object.values(days);
  }, [filteredOrders, filteredEntries, dateInterval]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredEntries
      .filter((entry) => entry.entryType === "expense")
      .forEach((entry) => {
        cats[entry.category] = (cats[entry.category] || 0) + entry.amount;
      });

    return Object.entries(cats)
      .map(([name, value]) => ({
        name,
        value,
        percent: summary.totalExpense > 0 ? (value / summary.totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries, summary.totalExpense]);

  const periodLabel = getRangeLabel(datePreset);
  const profitRate = summary.totalIncome > 0 ? (summary.netCashflow / summary.totalIncome) * 100 : 0;
  const orderIncomeShare = summary.totalIncome > 0 ? (summary.orderRevenue / summary.totalIncome) * 100 : 0;
  const trendChartHasData = chartData.some((item) => item.income > 0 || item.expense > 0);
  const topExpense = categoryData[0];

  const handleExportCSV = () => {
    const headers = ["Thời gian", "Tiêu đề", "Loại", "Danh mục", "Số tiền", "Kênh", "Ghi chú"];
    const rows = filteredEntries.map((entry) => [
      formatDateTime(entry.occurredAt),
      entry.title,
      entry.entryType === "income" ? "Thu" : "Chi",
      entry.category,
      entry.amount,
      channelLabelByValue.get(entry.channel) || entry.channel,
      entry.note,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `thu-chi-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteCashEntry(entryId);
      toast.success("Đã xoá bút toán");
    } catch (error) {
      toast.error("Không thể xoá bút toán", {
        description: error instanceof Error ? error.message : "Có lỗi xảy ra.",
      });
    }
  };

  const statCards = [
    {
      label: "Tổng thu",
      value: formatCashEntryPrice(summary.totalIncome),
      detail: `${formatPercent(orderIncomeShare)} từ POS`,
      icon: TrendingUp,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Tổng chi",
      value: formatCashEntryPrice(summary.totalExpense),
      detail: topExpense ? `Cao nhất: ${topExpense.name}` : "Chưa có khoản chi",
      icon: TrendingDown,
      accent: "text-rose-700 bg-rose-50 border-rose-100",
    },
    {
      label: "Biên dòng tiền",
      value: formatPercent(profitRate),
      detail: "Thu sau khi trừ chi",
      icon: Activity,
      accent: profitRate >= 0 ? "text-sky-700 bg-sky-50 border-sky-100" : "text-rose-700 bg-rose-50 border-rose-100",
    },
    {
      label: "Lợi nhuận ròng",
      value: formatCashEntryPrice(summary.netCashflow),
      detail: `${allHistoryItems.length} giao dịch đã lọc`,
      icon: Wallet,
      accent: summary.netCashflow >= 0 ? "text-primary bg-accent border-primary/10" : "text-rose-700 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <AdminLayout
      title="Sổ quỹ thu chi"
      subtitle="Theo dõi doanh thu, chi phí và dòng tiền thực tế"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted shadow-xs border-border/60"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
          <Link
            to="/cashbook/create"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm phiếu</span>
          </Link>
        </div>
      }
    >
      {/* Top Tab Switcher */}
      <div className="mb-6 flex p-1 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/40 max-w-md overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "transactions"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Banknote className="h-4 w-4" /> Giao dịch dòng tiền
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex-1 py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0",
            activeTab === "reports"
              ? "bg-background text-primary shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="h-4 w-4" /> Báo cáo & Phân tích
        </button>
      </div>

      {/* Global Date Range Selector */}
      <section className="mb-6 rounded-[24px] border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Khoảng thời gian</p>
              <p className="text-xs text-muted-foreground">
                Đang xem: {periodLabel}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {dateRangeOptions.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDatePreset(preset.value)}
                className={cn(
                  "h-9 shrink-0 rounded-xl border px-3.5 text-xs sm:text-sm font-black transition-colors",
                  datePreset === preset.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Conditional Tab Rendering */}
      {activeTab === "transactions" ? (
        <div className="space-y-4">
          {/* Main content: Transaction list (full width) */}
          <article className="rounded-[28px] border border-border/60 bg-card p-5 shadow-xs">
            {/* Horizontal reconciliation bar */}
            <div className="grid grid-cols-3 gap-6 mb-6 rounded-2xl bg-muted/15 p-4.5 text-xs border border-border/40">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider block">Doanh thu POS</span>
                <span className="font-extrabold text-sm sm:text-base text-foreground tabular-nums">{formatOrderPrice(summary.orderRevenue)}</span>
              </div>
              <div className="space-y-1 border-l border-border/45 pl-6">
                <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider block">Thu ngoài POS</span>
                <span className="font-extrabold text-sm sm:text-base text-foreground tabular-nums">{formatCashEntryPrice(summary.extraIncome)}</span>
              </div>
              <div className="space-y-1 border-l border-border/45 pl-6">
                <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider block">Chênh lệch ròng</span>
                <span className={cn(
                  "font-black text-sm sm:text-base tabular-nums block",
                  summary.netCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {formatCashEntryPrice(summary.netCashflow)}
                </span>
              </div>
            </div>

            {/* Toolbar: Search & Filters (Single Row) */}
            <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/45" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm kiếm giao dịch..."
                  className="h-10 w-full rounded-xl border border-border/60 bg-background/50 pl-11 pr-4 text-xs font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "h-9 shrink-0 rounded-xl px-4 text-xs font-black transition-all border",
                      filter === option.value
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "bg-background border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Structured Table */}
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-2xs">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10 text-xs text-muted-foreground select-none font-bold">
                    <th className="py-3 px-4 uppercase tracking-wider">Thời gian</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Loại phiếu</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Tiêu đề / Nội dung</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Danh mục</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Phương thức</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Số tiền</th>
                    <th className="py-3 px-4 text-center uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs sm:text-sm">
                  {allHistoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold">
                        Chưa có dữ liệu phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    allHistoryItems.map((entry) => {
                      const typeMeta = getCashEntryTypeMeta(entry.entryType);
                      const channelLabel = channelLabelByValue.get(entry.channel) || entry.channel;

                      return (
                        <tr 
                          key={`${entry.isOrder ? "order" : "entry"}-${entry.id}`}
                          className={cn(
                            "group hover:bg-muted/15 transition-all duration-200",
                            entry.isOrder && "bg-primary/[0.02]"
                          )}
                        >
                          {/* Occurred At */}
                          <td className="py-3 px-4 font-medium text-muted-foreground">
                            {formatDateTime(entry.occurredAt)}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4">
                            {entry.isOrder ? (
                              <Badge variant="secondary" className="rounded-md border-none bg-primary/10 text-primary px-1.5 h-5 text-[10px] font-black uppercase">
                                Đơn bán
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={cn("rounded-md px-1.5 h-5 text-[10px] font-black uppercase", typeMeta.className)}>
                                {typeMeta.label}
                              </Badge>
                            )}
                          </td>

                          {/* Title / Description */}
                          <td className="py-3 px-4 font-bold text-foreground">
                            <div>
                              <span>{entry.title}</span>
                              {entry.note && (
                                <p className="mt-1 font-normal text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={entry.note}>
                                  {entry.note}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 font-semibold text-muted-foreground">
                            {entry.category}
                          </td>

                          {/* Payment Method / Channel */}
                          <td className="py-3 px-4 font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              {entry.channel === "bank" ? (
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/75" />
                              ) : (
                                <Banknote className="h-3.5 w-3.5 text-muted-foreground/75" />
                              )}
                              {channelLabel}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className={cn(
                            "py-3 px-4 font-black tabular-nums",
                            entry.entryType === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {entry.entryType === "income" ? "+" : "-"} {formatCashEntryPrice(entry.amount)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            {!entry.isOrder ? (
                              <div className="flex justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                <Link
                                  to={`/cashbook/${entry.id}/edit`}
                                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                  aria-label={`Sửa ${entry.title}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-650"
                                  aria-label={`Xoá ${entry.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/35 italic font-medium select-none">Khóa</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards grid */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <article key={card.label} className="rounded-3xl border border-border/60 bg-card p-4.5 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
                        {card.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 truncate text-xl sm:text-2xl font-black tabular-nums tracking-tight",
                          card.label === "Lợi nhuận ròng" && summary.netCashflow < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        )}
                      >
                        {card.value}
                      </p>
                    </div>
                    <div className={cn("rounded-2xl border p-2.5", card.accent)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3.5 truncate border-t border-border/40 pt-3 text-[10px] sm:text-xs font-bold text-muted-foreground/80">
                    {card.detail}
                  </p>
                </article>
              );
            })}
          </section>

          {/* Charts block */}
          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-border/60 bg-card p-5 shadow-xs lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">Xu hướng thu chi</h2>
                  <p className="text-sm text-muted-foreground">
                    So sánh dòng tiền theo từng ngày trong {periodLabel.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Thu
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Chi
                  </span>
                </div>
              </div>

              {trendChartHasData ? (
                <div className="h-[260px] w-full sm:h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="displayDate"
                        axisLine={false}
                        tickLine={false}
                        interval={isMobile ? "preserveStartEnd" : 0}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.45)" }}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => formatCashEntryPrice(value)}
                      />
                      <Bar dataKey="income" name="Thu" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Chi" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background text-center text-sm text-muted-foreground sm:h-[310px]">
                  Chưa có thu chi trong khoảng thời gian này.
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Cơ cấu chi phí</h2>
                  <p className="text-sm text-muted-foreground">Theo danh mục đã ghi nhận</p>
                </div>
                <Badge variant="outline" className="rounded-md h-5 px-1.5 text-[10px] font-black uppercase">
                  {categoryData.length} nhóm
                </Badge>
              </div>

              {categoryData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-[190px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={58}
                          outerRadius={84}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={entry.name} fill={expenseColors[index % expenseColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCashEntryPrice(value)}
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid hsl(var(--border))",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                    {categoryData.slice(0, 6).map((cat, index) => (
                      <div key={cat.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: expenseColors[index % expenseColors.length] }}
                            />
                            <span className="truncate font-bold text-foreground">{cat.name}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, cat.percent)}%`,
                                backgroundColor: expenseColors[index % expenseColors.length],
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold tabular-nums text-foreground">{formatCashEntryPrice(cat.value)}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{formatPercent(cat.percent)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-[310px] items-center justify-center rounded-2xl border border-dashed border-border bg-background px-5 text-center text-sm text-muted-foreground">
                  Chưa có khoản chi để phân tích.
                </div>
              )}
            </article>
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default Cashbook;
