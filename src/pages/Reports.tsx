import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChefHat,
  ClipboardList,
  FlaskConical,
  Package,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { sendWebhook } from "@/lib/webhooks";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Defs,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatOrderPrice, useKitchenOrders } from "@/lib/orders";
import { ProductImage } from "@/components/pos/ProductImage";
import {
  useInventory,
  usePurchaseOrders,
  useInventoryAdjustments,
  useInternalReleases,
} from "@/lib/inventory";
import { useCashEntries } from "@/lib/cashbook";

type RangeKey = "today" | "yesterday" | "7" | "30" | "90" | "thisMonth" | "lastMonth" | "custom";
type MobileView = "overview" | "trends" | "items";

const rangeOptions: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "custom", label: "Tùy chọn" },
];

const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const mobileViewOptions: {
  value: MobileView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "overview", label: "Tổng quan", icon: Receipt },
  { value: "trends", label: "Xu hướng", icon: TrendingUp },
  { value: "items", label: "Top món", icon: Package },
];

const revenueChartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "hsl(var(--primary))",
  },
};

const topItemsChartConfig = {
  quantity: {
    label: "Số lượng",
    color: "hsl(var(--success))",
  },
  revenue: {
    label: "Doanh thu",
    color: "hsl(var(--primary))",
  },
};

const orderTypeChartConfig = {
  dineIn: {
    label: "Tại chỗ",
    color: "hsl(var(--primary))",
  },
  takeaway: {
    label: "Mang đi",
    color: "hsl(var(--warning))",
  },
  delivery: {
    label: "Giao hàng",
    color: "hsl(var(--success))",
  },
};

const orderTypeColors = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
];

const orderSourceChartConfig = {
  pos: {
    label: "Nhân viên POS",
    color: "hsl(var(--primary))",
  },
  kiosk: {
    label: "Khách tự đặt",
    color: "hsl(262 80% 50%)",
  },
};

const orderSourceColors = [
  "hsl(var(--primary))",
  "hsl(262 80% 50%)",
];

const formatDayLabel = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);

const formatFullDate = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const Reports = () => {
  const isMobile = useIsMobile();
  const orders = useKitchenOrders();
  const cashEntries = useCashEntries();
  const [range, setRange] = useState<RangeKey>("7");
  const [mobileView, setMobileView] = useState<MobileView>("overview");
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [sortBy, setSortBy] = useState<"quantity" | "revenue">("quantity");
  
  const [startDateInput, setStartDateInput] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDateInput, setEndDateInput] = useState(() => new Date().toISOString().slice(0, 10));

  const handleSendTodayReport = async () => {
    setIsSendingReport(true);
    try {
      const todayStr = getLocalDateString(new Date());
      const todayOrders = orders.filter((order) => {
        const orderDateStr = getLocalDateString(new Date(order.createdAt));
        return orderDateStr === todayStr && order.paymentStatus === "paid" && order.status !== "cancelled";
      });

      const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = todayOrders.length;
      const totalItems = todayOrders.reduce((sum, o) => sum + o.itemCount, 0);

      // Order types breakdown
      const orderTypes = { dineIn: 0, takeaway: 0, delivery: 0 };
      todayOrders.forEach((o) => {
        if (o.orderType === "dine-in") orderTypes.dineIn += 1;
        else if (o.orderType === "takeaway") orderTypes.takeaway += 1;
        else orderTypes.delivery += 1;
      });

      // Order sources breakdown
      const orderSources = { pos: 0, kiosk: 0 };
      todayOrders.forEach((o) => {
        if (o.orderSource === "kiosk") orderSources.kiosk += 1;
        else orderSources.pos += 1;
      });

      // Top items sold today
      const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      todayOrders.forEach((order) => {
        order.items.forEach((item) => {
          const curr = itemMap.get(item.name) ?? { name: item.name, quantity: 0, revenue: 0 };
          curr.quantity += item.quantity;
          curr.revenue += item.totalPrice;
          itemMap.set(item.name, curr);
        });
      });

      const soldItems = [...itemMap.values()]
        .sort((left, right) => right.revenue - left.revenue);

      const currentIngredients = ingredients || [];
      const currentRecipes = recipes || [];
      const ingredientConsumptionMap = new Map<string, { ingredientId: string; name: string; unit: string; quantity: number }>();
      
      todayOrders.forEach((order) => {
        order.items.forEach((item) => {
          const productRecipes = currentRecipes.filter((r) => r.productId === item.productId);
          productRecipes.forEach((recipe) => {
            const ing = currentIngredients.find((i) => i.id === recipe.ingredientId);
            if (ing) {
              const current = ingredientConsumptionMap.get(recipe.ingredientId) ?? {
                ingredientId: recipe.ingredientId,
                name: ing.name,
                unit: ing.unit,
                quantity: 0,
              };
              current.quantity += recipe.quantity * item.quantity;
              ingredientConsumptionMap.set(recipe.ingredientId, current);
            }
          });
        });
      });

      const ingredientConsumption = [...ingredientConsumptionMap.values()]
        .sort((left, right) => right.quantity - left.quantity);

      // Calculate today's cashbook expenses (using local timezone)
      const todayExpenses = cashEntries.filter((entry) => {
        const entryDateStr = getLocalDateString(new Date(entry.occurredAt));
        return entryDateStr === todayStr && entry.entryType === "expense";
      });

      const totalExpense = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

      const expenseByCategory: Record<string, number> = {};
      todayExpenses.forEach((e) => {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      });

      const expenseList = todayExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        note: e.note,
        occurredAt: e.occurredAt,
      }));

      // Calculate monthly accumulated sales
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthStart = new Date(currentYear, currentMonth, 1);
      
      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && order.paymentStatus === "paid" && order.status !== "cancelled";
      });

      let monthlyAccumulatedRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
      let monthlyAccumulatedOrders = monthOrders.length;

      // Apply manual adjustments if we are in July 2026
      if (currentYear === 2026 && currentMonth === 6) {
        // Add manual sales for July 1-4 (9,208,000 VND and 171 orders)
        monthlyAccumulatedRevenue += 9208000;
        monthlyAccumulatedOrders += 171;

        // Apply adjustments for July 5-7
        const monthlyTargetAdjustments: Record<string, number> = {
          "2026-07-05": 1969000,
          "2026-07-06": 1654000,
          "2026-07-07": 2259000,
        };

        for (const [dateKey, targetVal] of Object.entries(monthlyTargetAdjustments)) {
          const dbOrdersOnDate = monthOrders.filter(
            (o) => getLocalDateString(new Date(o.createdAt)) === dateKey
          );
          const dbTotalOnDate = dbOrdersOnDate.reduce((sum, o) => sum + o.total, 0);
          const diff = targetVal - dbTotalOnDate;
          monthlyAccumulatedRevenue += diff;
          
          const additionalOrders = Math.round(diff / 54000);
          monthlyAccumulatedOrders += additionalOrders;
        }
      }

      const reportPayload = {
        date: todayStr,
        totalRevenue,
        totalOrders,
        totalItems,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        orderTypes,
        orderSources,
        soldItems,
        topItems: soldItems, // Keep for backward compatibility if any webhook consumer uses this key
        ingredientConsumption,
        expenses: {
          total: totalExpense,
          byCategory: expenseByCategory,
          list: expenseList,
        },
        monthlyAccumulated: {
          revenue: monthlyAccumulatedRevenue,
          orders: monthlyAccumulatedOrders,
          averageOrderValue: monthlyAccumulatedOrders > 0 ? Math.round(monthlyAccumulatedRevenue / monthlyAccumulatedOrders) : 0,
        },
      };

      await sendWebhook("daily_report.generated", reportPayload);
      toast.success("Đã gửi báo cáo doanh thu hôm nay thành công!", {
        description: `Doanh thu gửi đi: ${new Intl.NumberFormat("vi-VN").format(totalRevenue)}đ`,
      });
    } catch (e) {
      toast.error("Không thể gửi báo cáo: " + (e instanceof Error ? e.message : "Lỗi hệ thống"));
    } finally {
      setIsSendingReport(false);
    }
  };
  const [activeReportTab, setActiveReportTab] = useState<"sales" | "inventory">("sales");
  const [inventoryReportSubTab, setInventoryReportSubTab] = useState<"flow" | "bar_reconciliation">("flow");
  const [reconciliationMode, setReconciliationMode] = useState<"period" | "date">("date");
  const [selectedReconciliationDate, setSelectedReconciliationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedIngAttribution, setSelectedIngAttribution] = useState<string | null>(null);

  const { ingredients, recipes } = useInventory();
  const purchaseOrders = usePurchaseOrders();
  const adjustments = useInventoryAdjustments();
  const releases = useInternalReleases();

  const currentFilterFn = useMemo(() => {
    let filterFn: (createdAt: string) => boolean;

    if (reconciliationMode === "date") {
      filterFn = (createdAt) => {
        const dStr = getLocalDateString(new Date(createdAt));
        return dStr === selectedReconciliationDate;
      };
    } else {
      const today = startOfDay(new Date());
      if (range === "today") {
        filterFn = (createdAt) => new Date(createdAt) >= today;
      } else if (range === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        filterFn = (createdAt) => {
          const d = new Date(createdAt);
          return d >= yesterday && d < today;
        };
      } else if (range === "thisMonth") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filterFn = (createdAt) => new Date(createdAt) >= startOfMonth;
      } else if (range === "lastMonth") {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filterFn = (createdAt) => {
          const d = new Date(createdAt);
          return d >= startOfLastMonth && d < startOfThisMonth;
        };
      } else if (range === "custom") {
        const start = startOfDay(parseLocalDate(startDateInput));
        const end = parseLocalDate(endDateInput);
        end.setHours(23, 59, 59, 999);
        filterFn = (createdAt) => {
          const d = new Date(createdAt);
          return d >= start && d <= end;
        };
      } else {
        const days = Number(range);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (days - 1));
        filterFn = (createdAt) => new Date(createdAt) >= startDate;
      }
    }
    return filterFn;
  }, [reconciliationMode, selectedReconciliationDate, range, startDateInput, endDateInput]);

  const reconciliationReport = useMemo(() => {
    // 1. Total Released to Bar/Kitchen
    const releaseQtyMap = new Map<string, number>();
    const filteredReleases = releases.filter(
      (rel) => currentFilterFn(rel.createdAt) && (rel.receiver === "Quầy pha chế" || rel.receiver === "Bếp")
    );
    for (const rel of filteredReleases) {
      for (const item of rel.items) {
        const curr = releaseQtyMap.get(item.ingredientId) || 0;
        releaseQtyMap.set(item.ingredientId, curr + item.quantity);
      }
    }

    // 2. Total Sales consumption (from POS recipes)
    const salesOutflow = new Map<string, number>();
    const filteredPaidOrders = orders.filter(
      (order) => order.paymentStatus === "paid" && order.status !== "cancelled" && currentFilterFn(order.createdAt)
    );
    for (const order of filteredPaidOrders) {
      for (const item of order.items) {
        const productRecipes = recipes.filter((r) => r.productId === item.productId);
        for (const recipe of productRecipes) {
          const curr = salesOutflow.get(recipe.ingredientId) || 0;
          salesOutflow.set(recipe.ingredientId, curr + (recipe.quantity * item.quantity));
        }
      }
    }

    return ingredients.map((ing) => {
      const released = releaseQtyMap.get(ing.id) || 0;
      const sales = salesOutflow.get(ing.id) || 0;
      const variance = released - sales;
      const pct = released > 0 ? (variance / released) * 100 : 0;
      const costOfVariance = variance * (ing.purchasePrice || 0);

      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        released,
        sales,
        variance,
        percentage: pct,
        purchasePrice: ing.purchasePrice || 0,
        costOfVariance,
      };
    });
  }, [ingredients, recipes, releases, orders, currentFilterFn]);

  const wastageChartData = useMemo(() => {
    return reconciliationReport
      .filter((r) => r.variance > 0 && r.costOfVariance > 0)
      .map((r) => ({
        name: r.name,
        cost: Math.round(r.costOfVariance),
        quantity: r.variance,
        unit: r.unit,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [reconciliationReport]);

  const attributionData = useMemo(() => {
    if (!selectedIngAttribution) return [];
    
    const productSales = new Map<string, { name: string; quantity: number; recipeQty: number }>();
    const filteredPaidOrders = orders.filter(
      (order) => order.paymentStatus === "paid" && order.status !== "cancelled" && currentFilterFn(order.createdAt)
    );
    
    let totalIngSales = 0;
    
    for (const order of filteredPaidOrders) {
      for (const item of order.items) {
        const matchedRecipe = recipes.find(r => r.productId === item.productId && r.ingredientId === selectedIngAttribution);
        if (matchedRecipe) {
          const curr = productSales.get(item.productId) || { name: item.name, quantity: 0, recipeQty: Number(matchedRecipe.quantity) };
          curr.quantity += item.quantity;
          productSales.set(item.productId, curr);
          totalIngSales += Number(matchedRecipe.quantity) * item.quantity;
        }
      }
    }
    
    return Array.from(productSales.entries()).map(([productId, val]) => {
      const consumed = val.recipeQty * val.quantity;
      const pct = totalIngSales > 0 ? (consumed / totalIngSales) * 100 : 0;
      return {
        productId,
        productName: val.name,
        qtySold: val.quantity,
        recipeQty: val.recipeQty,
        consumed,
        percentage: pct
      };
    }).sort((a, b) => b.consumed - a.consumed);
  }, [selectedIngAttribution, recipes, orders, currentFilterFn]);

  const inventoryReport = useMemo(() => {
    const today = startOfDay(new Date());
    let filterFn: (createdAt: string) => boolean;

    if (range === "today") {
      filterFn = (createdAt) => new Date(createdAt) >= today;
    } else if (range === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= yesterday && d < today;
      };
    } else if (range === "thisMonth") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filterFn = (createdAt) => new Date(createdAt) >= startOfMonth;
    } else if (range === "lastMonth") {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= startOfLastMonth && d < startOfThisMonth;
      };
    } else if (range === "custom") {
      const start = startOfDay(parseLocalDate(startDateInput));
      const end = parseLocalDate(endDateInput);
      end.setHours(23, 59, 59, 999);
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= start && d <= end;
      };
    } else {
      const days = Number(range);
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));
      filterFn = (createdAt) => new Date(createdAt) >= startDate;
    }

    // 1. Inflow (Nhập) from POs
    const poInflow = new Map<string, number>();
    const filteredPOs = purchaseOrders.filter((po) => filterFn(po.createdAt));
    for (const po of filteredPOs) {
      for (const item of po.items) {
        const curr = poInflow.get(item.ingredientId) || 0;
        poInflow.set(item.ingredientId, curr + item.quantity);
      }
    }

    // 2. Outflow (Xuất bán) from sales recipes
    const salesOutflow = new Map<string, number>();
    const filteredPaidOrders = orders.filter(
      (order) => order.paymentStatus === "paid" && order.status !== "cancelled" && filterFn(order.createdAt)
    );
    for (const order of filteredPaidOrders) {
      for (const item of order.items) {
        const productRecipes = recipes.filter((r) => r.productId === item.productId);
        for (const recipe of productRecipes) {
          const curr = salesOutflow.get(recipe.ingredientId) || 0;
          salesOutflow.set(recipe.ingredientId, curr + (recipe.quantity * item.quantity));
        }
      }
    }

    // 3. Adjustments (Kiểm kho)
    const adjIncrease = new Map<string, number>();
    const adjDecrease = new Map<string, number>();
    const filteredAdjs = adjustments.filter((adj) => filterFn(adj.createdAt));
    for (const adj of filteredAdjs) {
      if (adj.type === "increase") {
        const curr = adjIncrease.get(adj.ingredientId) || 0;
        adjIncrease.set(adj.ingredientId, curr + adj.quantity);
      } else {
        const curr = adjDecrease.get(adj.ingredientId) || 0;
        adjDecrease.set(adj.ingredientId, curr + adj.quantity);
      }
    }

    // 4. Calculate beginning and ending stocks
    return ingredients.map((ing) => {
      const inflow = poInflow.get(ing.id) || 0;
      const sales = salesOutflow.get(ing.id) || 0;
      const increase = adjIncrease.get(ing.id) || 0;
      const decrease = adjDecrease.get(ing.id) || 0;

      const endingStock = ing.stockQuantity;
      const beginningStock = Math.max(0, endingStock - inflow - increase + sales + decrease);

      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        beginningStock,
        inflow,
        increase,
        sales,
        decrease,
        endingStock,
      };
    });
  }, [ingredients, recipes, purchaseOrders, adjustments, orders, range, startDateInput, endDateInput]);

  const dailyReleases = useMemo(() => {
    return releases.filter((rel) => {
      const relDateStr = getLocalDateString(new Date(rel.createdAt));
      return relDateStr === selectedReconciliationDate;
    });
  }, [releases, selectedReconciliationDate]);

  const report = useMemo(() => {
    const today = startOfDay(new Date());
    let days: number;
    let startDate: Date;
    let filterFn: (createdAt: string) => boolean;

    if (range === "today") {
      days = 1;
      startDate = today;
      filterFn = (createdAt) => new Date(createdAt) >= today;
    } else if (range === "yesterday") {
      days = 1;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 1);
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= startDate && d < today;
      };
    } else if (range === "thisMonth") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      days = today.getDate();
      filterFn = (createdAt) => new Date(createdAt) >= startDate;
    } else if (range === "lastMonth") {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days = lastDayOfLastMonth.getDate();
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= startDate && d < startOfThisMonth;
      };
    } else if (range === "custom") {
      startDate = startOfDay(parseLocalDate(startDateInput));
      const end = parseLocalDate(endDateInput);
      end.setHours(23, 59, 59, 999);
      days = Math.floor((end.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
      if (days <= 0) days = 1;
      filterFn = (createdAt) => {
        const d = new Date(createdAt);
        return d >= startDate && d <= end;
      };
    } else {
      days = Number(range);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));
      filterFn = (createdAt) => new Date(createdAt) >= startDate;
    }

    const filteredOrders = orders.filter(
      (order) => order.paymentStatus === "paid" && order.status !== "cancelled" && filterFn(order.createdAt),
    );

    const cancelledOrdersInPeriod = orders.filter(
      (order) => order.status === "cancelled" && filterFn(order.createdAt),
    );
    const totalCancelledCount = cancelledOrdersInPeriod.length;
    const totalCancelledValue = cancelledOrdersInPeriod.reduce((sum, o) => sum + o.total, 0);

    const dailyMap = new Map<
      string,
      { date: string; label: string; revenue: number; orders: number }
    >();

    for (let index = 0; index < days; index += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = getLocalDateString(date);
      dailyMap.set(key, {
        date: key,
        label: formatDayLabel(date),
        revenue: 0,
        orders: 0,
      });
    }

    const itemMap = new Map<
      string,
      { name: string; image: string; quantity: number; revenue: number }
    >();
    const orderTypeMap = {
      dineIn: { key: "dineIn", name: "Tại chỗ", value: 0 },
      takeaway: { key: "takeaway", name: "Mang đi", value: 0 },
      delivery: { key: "delivery", name: "Giao hàng", value: 0 },
    } as const;

    const orderSourceMap = {
      pos: { key: "pos", name: "Nhân viên POS", value: 0 },
      kiosk: { key: "kiosk", name: "Khách tự đặt", value: 0 },
    } as const;

    let totalRevenue = 0;
    let totalItems = 0;

    for (const order of filteredOrders) {
      totalRevenue += order.total;
      totalItems += order.itemCount;

      const key = getLocalDateString(new Date(order.createdAt));
      const dailyEntry = dailyMap.get(key);
      if (dailyEntry) {
        dailyEntry.revenue += order.total;
        dailyEntry.orders += 1;
      }

      if (order.orderType === "dine-in") {
        orderTypeMap.dineIn.value += 1;
      } else if (order.orderType === "takeaway") {
        orderTypeMap.takeaway.value += 1;
      } else {
        orderTypeMap.delivery.value += 1;
      }

      if (order.orderSource === "kiosk") {
        orderSourceMap.kiosk.value += 1;
      } else {
        orderSourceMap.pos.value += 1;
      }

      for (const item of order.items) {
        const current = itemMap.get(item.name) ?? {
          name: item.name,
          image: item.image,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity;
        current.revenue += item.totalPrice;
        itemMap.set(item.name, current);
      }
    }

    // Inject manual sales for early July 2026 (before software adoption)
    const manualSales: Record<string, number> = {
      "2026-07-01": 2122000,
      "2026-07-02": 1717500,
      "2026-07-03": 1717500,
      "2026-07-04": 3651000,
    };

    const manualOrders: Record<string, number> = {
      "2026-07-01": 39,
      "2026-07-02": 32,
      "2026-07-03": 32,
      "2026-07-04": 68,
    };

    // Adjust partial data days to their actual values (allowing both upward and downward adjustments)
    const targetAdjustments: Record<string, number> = {
      "2026-07-05": 1969000,
      "2026-07-06": 1654000,
      "2026-07-07": 2259000,
    };

    let manualOrdersAdded = 0;
    for (const [dateKey, targetVal] of Object.entries(targetAdjustments)) {
      const entry = dailyMap.get(dateKey);
      if (entry) {
        const dbTotal = entry.revenue;
        const diff = targetVal - dbTotal;
        entry.revenue = targetVal;
        totalRevenue += diff;
        
        const additionalOrders = Math.round(diff / 54000);
        entry.orders = Math.max(0, entry.orders + additionalOrders);
        manualOrdersAdded += additionalOrders;
      }
    }

    // Inject other manual sales and orders (days with no database records at all)
    for (const [key, value] of Object.entries(manualSales)) {
      const entry = dailyMap.get(key);
      if (entry) {
        entry.revenue = value;
        totalRevenue += value;
        
        const ordersCount = manualOrders[key] || 0;
        entry.orders = ordersCount;
        manualOrdersAdded += ordersCount;
      }
    }

    const dailyRevenue = [...dailyMap.values()];
    const topItems = [...itemMap.values()]
      .sort((left, right) => {
        if (sortBy === "revenue") {
          return right.revenue - left.revenue || right.quantity - left.quantity;
        }
        return right.quantity - left.quantity || right.revenue - left.revenue;
      })
      .slice(0, 5);
    const orderTypes = Object.values(orderTypeMap);
    const orderSources = Object.values(orderSourceMap);

    const finalTotalOrders = filteredOrders.length + manualOrdersAdded;

    return {
      days,
      startDate,
      filteredOrders,
      dailyRevenue,
      topItems,
      orderTypes,
      orderSources,
      totalRevenue,
      totalOrders: finalTotalOrders,
      totalItems,
      averageOrderValue: finalTotalOrders > 0 ? totalRevenue / finalTotalOrders : 0,
      totalCancelledCount,
      totalCancelledValue,
    };
  }, [orders, range, sortBy, startDateInput, endDateInput]);

  const topItemsChartData = useMemo(
    () =>
      report.topItems.map((item) => ({
        ...item,
        shortName: item.name.length > 12 ? `${item.name.slice(0, 12)}…` : item.name,
      })),
    [report.topItems],
  );

  const summaryCards = [
    {
      title: "Doanh thu",
      value: formatOrderPrice(report.totalRevenue),
      caption: range === "today"
        ? "Trong ngày hôm nay"
        : range === "yesterday"
          ? "Trong ngày hôm qua"
          : range === "thisMonth"
            ? "Từ đầu tháng này đến nay"
            : range === "lastMonth"
              ? "Trong tháng trước"
              : range === "custom"
                ? `Từ ${formatDayLabel(parseLocalDate(startDateInput))} đến ${formatDayLabel(parseLocalDate(endDateInput))}`
                : `Từ ${formatDayLabel(report.startDate)} đến nay`,
      icon: TrendingUp,
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/5",
    },
    {
      title: "Số đơn",
      value: String(report.totalOrders),
      caption: "Đơn đã thanh toán",
      icon: Receipt,
      accent: "text-blue-500",
      bg: "bg-blue-500/10 dark:bg-blue-500/5",
    },
    {
      title: "Món đã bán",
      value: String(report.totalItems),
      caption: "Tổng số lượng món",
      icon: ChefHat,
      accent: "text-amber-500",
      bg: "bg-amber-500/10 dark:bg-amber-500/5",
    },
    {
      title: "Giá trị đơn TB",
      value: formatOrderPrice(Math.round(report.averageOrderValue)),
      caption: "Trung bình mỗi đơn",
      icon: CalendarDays,
      accent: "text-violet-500",
      bg: "bg-violet-500/10 dark:bg-violet-500/5",
    },
    {
      title: "Đơn bị hủy",
      value: String(report.totalCancelledCount),
      caption: `Trị giá: ${formatOrderPrice(report.totalCancelledValue)}`,
      icon: XCircle,
      accent: "text-rose-500",
      bg: "bg-rose-500/10 dark:bg-rose-500/5",
    },
  ] as const;

  const RevenueChartCard = () => (
    <article className="min-w-0 rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10">
      <div className="mb-5">
        <h2 className="text-base font-black tracking-tight text-foreground">Doanh thu theo ngày</h2>
        <p className="text-xs text-muted-foreground">
          {range === "today"
            ? "Thống kê doanh thu ngày hôm nay"
            : range === "yesterday"
              ? "Thống kê doanh thu ngày hôm qua"
              : range === "thisMonth"
                ? "Thống kê xu hướng doanh thu từ đầu tháng đến nay"
                : range === "lastMonth"
                  ? "Thống kê xu hướng doanh thu trong tháng trước"
                  : range === "custom"
                    ? `Thống kê xu hướng doanh thu từ ${formatDayLabel(parseLocalDate(startDateInput))} đến ${formatDayLabel(parseLocalDate(endDateInput))}`
                    : `Thống kê xu hướng doanh thu trong ${report.days} ngày gần nhất`}
        </p>
      </div>
      <ChartContainer
        config={revenueChartConfig}
        className={cn("w-full", isMobile ? "h-[240px]" : "h-[300px]")}
      >
        <AreaChart
          data={report.dailyRevenue}
          margin={isMobile ? { left: -8, right: 8, top: 8 } : { left: 0, right: 12, top: 8 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.08)" />
          <XAxis 
            dataKey="label" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            hide={isMobile}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
          />
          <ChartTooltip
            cursor={{ stroke: "hsl(var(--primary)/0.2)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelKey="revenue"
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center justify-between gap-3 text-xs font-semibold">
                    <span className="text-muted-foreground">{item.payload.label}</span>
                    <span className="font-bold text-foreground">
                      {formatOrderPrice(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: isMobile ? 2.5 : 3 }}
            activeDot={{ r: isMobile ? 4.5 : 5, strokeWidth: 1.5, stroke: "white" }}
          />
        </AreaChart>
      </ChartContainer>
    </article>
  );

  const OrderTypeCard = () => (
    <article className="min-w-0 rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10">
      <div className="mb-4">
        <h2 className="text-base font-black tracking-tight text-foreground">Cơ cấu loại đơn</h2>
        <p className="text-xs text-muted-foreground">Phân bổ theo hình thức phục vụ</p>
      </div>
      <ChartContainer
        config={orderTypeChartConfig}
        className={cn("w-full", isMobile ? "h-[200px]" : "h-[240px]")}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3 text-xs font-semibold">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-bold text-foreground">{Number(value)} đơn</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={report.orderTypes}
            dataKey="value"
            nameKey="name"
            innerRadius={isMobile ? 50 : 64}
            outerRadius={isMobile ? 76 : 90}
            paddingAngle={4}
          >
            {report.orderTypes.map((entry, index) => (
              <Cell key={entry.key} fill={orderTypeColors[index % orderTypeColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {report.orderTypes.map((entry, index) => (
          <div
            key={entry.key}
            className="flex items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-1.5 text-xs font-semibold"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: orderTypeColors[index % orderTypeColors.length] }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground font-bold">{entry.value} đơn</span>
          </div>
        ))}
      </div>
    </article>
  );

  const OrderSourceCard = () => (
    <article className="min-w-0 rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10">
      <div className="mb-4">
        <h2 className="text-base font-black tracking-tight text-foreground">Cơ cấu nguồn đơn</h2>
        <p className="text-xs text-muted-foreground">Phân bổ theo nguồn tạo đơn hàng</p>
      </div>
      <ChartContainer
        config={orderSourceChartConfig}
        className={cn("w-full", isMobile ? "h-[200px]" : "h-[240px]")}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3 text-xs font-semibold">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-bold text-foreground">{Number(value)} đơn</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={report.orderSources}
            dataKey="value"
            nameKey="name"
            innerRadius={isMobile ? 50 : 64}
            outerRadius={isMobile ? 76 : 90}
            paddingAngle={4}
          >
            {report.orderSources.map((entry, index) => (
              <Cell key={entry.key} fill={orderSourceColors[index % orderSourceColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {report.orderSources.map((entry, index) => (
          <div
            key={entry.key}
            className="flex items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-1.5 text-xs font-semibold"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: orderSourceColors[index % orderSourceColors.length] }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground font-bold">{entry.value} đơn</span>
          </div>
        ))}
      </div>
    </article>
  );

  const TopItemsChartCard = () => (
    <article className="min-w-0 rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-tight text-foreground">Top món bán chạy</h2>
          <p className="text-xs text-muted-foreground">
            {sortBy === "quantity"
              ? (isMobile ? "Biểu đồ số lượng bán ra" : "Xếp theo số lượng bán ra")
              : (isMobile ? "Biểu đồ doanh thu" : "Xếp theo doanh thu")}
          </p>
        </div>
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSortBy("quantity")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
              sortBy === "quantity"
                ? "bg-background text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Số lượng
          </button>
          <button
            onClick={() => setSortBy("revenue")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
              sortBy === "revenue"
                ? "bg-background text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Doanh thu
          </button>
        </div>
      </div>
      <ChartContainer config={topItemsChartConfig} className={cn("w-full", isMobile ? "h-[280px]" : "h-[300px]")}>
        <BarChart
          data={topItemsChartData}
          layout="vertical"
          margin={isMobile ? { left: -10, right: 10, top: 8, bottom: 8 } : { left: 0, right: 12 }}
        >
          <CartesianGrid horizontal={false} stroke="hsl(var(--muted-foreground)/0.08)" strokeDasharray="3 3" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey={isMobile ? "shortName" : "name"}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 90 : 130}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted)/0.15)" }}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(_value, _name, item) => (
                  <div className="grid gap-1 text-xs">
                    <div className="font-bold text-foreground">{item.payload.name}</div>
                    <div className="flex items-center justify-between gap-4 text-muted-foreground">
                      <span>Số lượng</span>
                      <span className="font-bold text-foreground">{Number(item.payload.quantity)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-muted-foreground">
                      <span>Doanh thu</span>
                      <span className="font-bold text-primary">{formatOrderPrice(item.payload.revenue)}</span>
                    </div>
                  </div>
                )}
              />
            }
          />
          <Bar 
            dataKey={sortBy} 
            fill={sortBy === "revenue" ? "var(--color-revenue)" : "var(--color-quantity)"} 
            radius={6} 
          />
        </BarChart>
      </ChartContainer>
    </article>
  );

  const RankingCard = ({ mobile }: { mobile: boolean }) => (
    <article className={cn("min-w-0 rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10", mobile ? "p-4" : "p-5")}>
      <div className={cn("mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", mobile ? "" : "mb-5")}>
        <div>
          <h2 className="text-base font-black tracking-tight text-foreground">Bảng xếp hạng món</h2>
          <p className="text-xs text-muted-foreground">
            {sortBy === "quantity"
              ? (mobile ? "Top món theo số lượng bán" : "Kèm doanh thu chi tiết từng món")
              : (mobile ? "Top món theo doanh thu" : "Kèm số lượng chi tiết từng món")}
          </p>
        </div>
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSortBy("quantity")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
              sortBy === "quantity"
                ? "bg-background text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Số lượng
          </button>
          <button
            onClick={() => setSortBy("revenue")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
              sortBy === "revenue"
                ? "bg-background text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Doanh thu
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {report.topItems.map((item, index) => (
          <div
            key={item.name}
            className="group flex items-center justify-between gap-3 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/20 px-4 py-3 transition-all duration-300"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border text-[10px] font-black text-muted-foreground">
                {index + 1}
              </div>
              <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-card text-lg shadow-xs overflow-hidden border border-border/40 group-hover:scale-105 transition-transform duration-300", mobile ? "h-10 w-10" : "h-9 w-9")}>
                <ProductImage 
                  image={item.image} 
                  name={item.name} 
                  className="h-full w-full object-cover"
                  fallbackClassName="text-xl"
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground/80 font-medium">{item.quantity} món đã bán</p>
              </div>
            </div>
            <span className="shrink-0 font-bold text-sm text-primary">{formatOrderPrice(item.revenue)}</span>
          </div>
        ))}
      </div>
    </article>
  );

  const renderInventoryReport = () => (
    <article className="rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-4">
        <div>
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            📊 Báo cáo Đối Soát Kho
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi dòng chảy nguyên vật liệu và kiểm soát hao hụt thất thoát trong {report.days} ngày gần nhất
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit mb-2">
        <button
          onClick={() => setInventoryReportSubTab("flow")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300",
            inventoryReportSubTab === "flow"
              ? "bg-background text-primary shadow-xs border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Xuất Nhập Tồn Tổng
        </button>
        <button
          onClick={() => setInventoryReportSubTab("bar_reconciliation")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300",
            inventoryReportSubTab === "bar_reconciliation"
              ? "bg-background text-rose-600 dark:text-rose-400 shadow-xs border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Đối Chiếu Quầy & Bán Hàng
        </button>
      </div>

      {inventoryReportSubTab === "flow" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  <th className="p-4">Nguyên liệu</th>
                  <th className="p-4 text-center">ĐVT</th>
                  <th className="p-4 text-right">Tồn đầu</th>
                  <th className="p-4 text-right text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.02]">Nhập (+)</th>
                  <th className="p-4 text-right text-emerald-500 dark:text-emerald-400 bg-emerald-500/[0.02]">Cân kho (+)</th>
                  <th className="p-4 text-right text-rose-600 dark:text-rose-400 bg-rose-500/[0.02]">Xuất bán (-)</th>
                  <th className="p-4 text-right text-rose-500 dark:text-rose-400 bg-rose-500/[0.02]">Hao hụt (-)</th>
                  <th className="p-4 text-right font-black">Tồn cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs sm:text-sm font-semibold">
                {inventoryReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground font-bold">
                      Chưa có dữ liệu nguyên liệu nào.
                    </td>
                  </tr>
                ) : (
                  inventoryReport.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-bold text-foreground">{row.name}</td>
                      <td className="p-4 text-center text-muted-foreground uppercase font-bold text-[10px]">{row.unit}</td>
                      <td className="p-4 text-right text-muted-foreground/80">{row.beginningStock}</td>
                      <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.005]">
                        {row.inflow > 0 ? `+${row.inflow}` : "-"}
                      </td>
                      <td className="p-4 text-right font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/[0.005]">
                        {row.increase > 0 ? `+${row.increase}` : "-"}
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400 bg-rose-500/[0.005]">
                        {row.sales > 0 ? `-${row.sales}` : "-"}
                      </td>
                      <td className="p-4 text-right font-semibold text-rose-500 dark:text-rose-400 bg-rose-500/[0.005]">
                        {row.decrease > 0 ? `-${row.decrease}` : "-"}
                      </td>
                      <td className="p-4 text-right font-black text-foreground">{row.endingStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setReconciliationMode("date")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200",
                reconciliationMode === "date"
                  ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:border-rose-900/30"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Đối chiếu theo ngày
            </button>
            <button
              onClick={() => setReconciliationMode("period")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200",
                reconciliationMode === "period"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Đối chiếu kỳ ({report.days} ngày)
            </button>
          </div>

          {/* Conditional Control Area */}
          {reconciliationMode === "date" ? (
            <div className="flex flex-col gap-3 border border-border/30 bg-muted/10 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chọn ngày đối soát:</span>
                <input
                  type="date"
                  value={selectedReconciliationDate}
                  onChange={(e) => setSelectedReconciliationDate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary text-foreground"
                />
              </div>

              {dailyReleases.length > 0 ? (
                <div className="flex flex-wrap gap-2 items-center text-xs mt-1">
                  <span className="font-bold text-muted-foreground">Các phiếu xuất ({dailyReleases.length}):</span>
                  {dailyReleases.map((rel) => (
                    <span
                      key={rel.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/20 px-2.5 py-1 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400"
                      title={rel.note}
                    >
                      REL-{rel.id.substring(4, 8).toUpperCase()} ({rel.receiver})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">
                  ⚠️ Không có phiếu xuất kho nội bộ nào trong ngày này. Hệ thống hiển thị doanh thu tiêu thụ bằng 0.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-4 text-xs text-blue-700 dark:text-blue-400 font-semibold leading-relaxed">
              💡 <strong>Hướng dẫn đối soát:</strong> Mục tiêu giữ tỷ lệ chênh lệch dưới 2-3%. 
              Chênh lệch dương (+) thể hiện lượng nguyên liệu còn dư tại quầy hoặc hao hụt chưa kiểm kê. 
              Chênh lệch âm (-) thể hiện quầy pha chế bán nhiều hơn lượng xuất thực tế, cảnh báo định lượng chưa chuẩn hoặc nhân viên quên tạo Phiếu xuất kho nội bộ.
            </div>
          )}

          {wastageChartData.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <h4 className="text-sm font-black text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                Top 5 nguyên liệu hao hụt nhiều nhất (VNĐ)
              </h4>
              <div className="h-64 w-full">
                <ChartContainer
                  config={{
                    cost: {
                      label: "Giá trị hao hụt",
                      color: "hsl(var(--destructive))",
                    },
                  }}
                >
                  <BarChart
                    data={wastageChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/30" />
                    <XAxis type="number" tickFormatter={(value) => `${value / 1000}k`} className="text-[10px]" />
                    <YAxis dataKey="name" type="category" width={100} className="text-[10px] font-bold" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="cost" fill="var(--color-cost)" radius={[0, 4, 4, 0]}>
                      {wastageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--destructive))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    <th className="p-4">Nguyên liệu</th>
                    <th className="p-4 text-center">ĐVT</th>
                    <th className="p-4 text-right text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.02]">Tổng xuất quầy (A)</th>
                    <th className="p-4 text-right text-rose-600 dark:text-rose-400 bg-rose-500/[0.02]">Bán theo công thức (B)</th>
                    <th className="p-4 text-right font-black">Chênh lệch (A - B)</th>
                    <th className="p-4 text-right font-black">Tỷ lệ hao hụt (%)</th>
                    <th className="p-4 text-right font-black">Giá trị hao hụt (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs sm:text-sm font-semibold">
                  {reconciliationReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-bold">
                        Chưa có dữ liệu nguyên liệu nào.
                      </td>
                    </tr>
                  ) : (
                    reconciliationReport.map((row) => (
                      <tr 
                        key={row.id}
                        onClick={() => setSelectedIngAttribution(selectedIngAttribution === row.id ? null : row.id)}
                        className={cn(
                          "hover:bg-muted/35 cursor-pointer transition-colors",
                          selectedIngAttribution === row.id && "bg-accent/40 border-l-4 border-l-primary"
                        )}
                      >
                        <td className="p-4 font-bold text-foreground">{row.name}</td>
                        <td className="p-4 text-center text-muted-foreground uppercase font-bold text-[10px]">{row.unit}</td>
                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{row.released}</td>
                        <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">{row.sales}</td>
                        <td className="p-4 text-right font-black">
                          {row.variance === 0 ? (
                            <span className="text-muted-foreground/60">-</span>
                          ) : row.variance > 0 ? (
                            <span className="text-amber-600">+{row.variance}</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">{row.variance}</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-black">
                          {row.percentage === 0 ? (
                            <span className="text-muted-foreground/60">0%</span>
                          ) : row.percentage > 0 ? (
                            <span className="text-amber-600">{row.percentage.toFixed(1)}%</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">{row.percentage.toFixed(1)}%</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-black">
                          {row.costOfVariance === 0 ? (
                            <span className="text-muted-foreground/60">-</span>
                          ) : row.costOfVariance > 0 ? (
                            <span className="text-amber-600">+{formatOrderPrice(Math.round(row.costOfVariance))}</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">{formatOrderPrice(Math.round(row.costOfVariance))}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedIngAttribution && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                  Sản phẩm tiêu hao: {ingredients.find(i => i.id === selectedIngAttribution)?.name}
                </h4>
                <button
                  onClick={() => setSelectedIngAttribution(null)}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Đóng phân tích
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/60 bg-background/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-3">Tên món</th>
                      <th className="p-3 text-right">Số lượng bán</th>
                      <th className="p-3 text-right">Định lượng / Món</th>
                      <th className="p-3 text-right">Tổng tiêu hao (Lý thuyết)</th>
                      <th className="p-3 text-right">Tỷ lệ tiêu thụ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs font-semibold">
                    {attributionData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          Không có sản phẩm nào bán ra tiêu thụ nguyên liệu này trong kỳ.
                        </td>
                      </tr>
                    ) : (
                      attributionData.map((item) => (
                        <tr key={item.productId} className="hover:bg-muted/10">
                          <td className="p-3 text-foreground font-bold">{item.productName}</td>
                          <td className="p-3 text-right text-muted-foreground">{item.qtySold}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {item.recipeQty} {ingredients.find(i => i.id === selectedIngAttribution)?.unit}
                          </td>
                          <td className="p-3 text-right text-primary font-bold">
                            {item.consumed.toFixed(1)} {ingredients.find(i => i.id === selectedIngAttribution)?.unit}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-bold">{item.percentage.toFixed(1)}%</span>
                              <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div
                                  className="bg-primary h-full"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );

  return (
    <AdminLayout
      title="Momoka Reports"
      subtitle="Theo dõi doanh thu ngày và món bán chạy từ đơn đã thanh toán"
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <button
            disabled={isSendingReport}
            onClick={handleSendTodayReport}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-200 disabled:opacity-50 hover:shadow-xs active:scale-95"
            title="Tổng hợp và gửi báo cáo doanh số ngày hôm nay tới n8n"
          >
            {isSendingReport ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Receipt className="h-3.5 w-3.5" />
            )}
            <span>Gửi Báo Cáo</span>
          </button>

          {isMobile ? (
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary text-foreground font-semibold"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95",
                  range === option.value
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      }
    >
      {/* Top Tab Switcher & Custom Range Pickers */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1 bg-muted/50 dark:bg-muted/20 rounded-2xl border border-border/30 max-w-md shadow-xs flex-1 w-full md:w-auto">
          <button
            onClick={() => setActiveReportTab("sales")}
            className={cn(
              "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
              activeReportTab === "sales"
                ? "bg-background text-primary shadow-sm border border-border/10"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <BarChart3 className="h-4 w-4" /> Báo cáo Bán hàng
          </button>
          <button
            onClick={() => setActiveReportTab("inventory")}
            className={cn(
              "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
              activeReportTab === "inventory"
                ? "bg-background text-primary shadow-sm border border-border/10"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <FlaskConical className="h-4 w-4" /> Đối soát kho
          </button>
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2 bg-card border border-border/60 p-2 rounded-2xl shadow-xs self-start md:self-auto w-full sm:w-auto overflow-x-auto">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
            <span className="text-[10px] font-black text-muted-foreground uppercase shrink-0">Từ ngày:</span>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold outline-none focus:border-primary text-foreground"
            />
            <span className="text-[10px] font-black text-muted-foreground uppercase shrink-0">Đến ngày:</span>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold outline-none focus:border-primary text-foreground"
            />
          </div>
        )}
      </div>

      {activeReportTab === "sales" ? (
        <>
          {isMobile && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {mobileViewOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    onClick={() => setMobileView(option.value)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition-all duration-200 active:scale-95",
                      mobileView === option.value
                        ? "border-primary/20 bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                      <span className="truncate">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {report.totalOrders === 0 ? (
            <section className="rounded-[24px] border border-dashed border-border bg-card/60 backdrop-blur-xs px-6 py-16 text-center sm:py-20">
              <h2 className="text-base font-black text-foreground">Chưa có dữ liệu báo cáo</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Hãy tạo đơn và thanh toán trên POS để hệ thống ghi nhận doanh thu.
              </p>
            </section>
          ) : isMobile ? (
            <>
              {mobileView === "overview" ? (
                <>
                  <section className="space-y-3">
                    <div className="group relative overflow-hidden rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", summaryCards[0].bg)}>
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                            {summaryCards[0].title}
                          </span>
                          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
                            {summaryCards[0].value}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground/70 font-medium truncate">{summaryCards[0].caption}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {summaryCards.slice(1).map((card) => {
                        const Icon = card.icon;

                        return (
                          <div
                            key={card.title}
                            className="group relative overflow-hidden rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-4 shadow-xs transition-all duration-300"
                          >
                            <div className="flex flex-col gap-3">
                              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", card.bg)}>
                                <Icon className={cn("h-4 w-4", card.accent)} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                  {card.title}
                                </span>
                                <p className="mt-0.5 text-lg font-black tracking-tight text-foreground">
                                  {card.value}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground/70 font-medium truncate">{card.caption}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <OrderTypeCard />
                  <OrderSourceCard />
                </>
              ) : null}

              {mobileView === "trends" ? (
                <section className="space-y-4">
                  <RevenueChartCard />
                  <article className="rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs">
                    <div className="mb-4">
                      <h2 className="text-base font-black tracking-tight text-foreground">Tóm tắt kỳ báo cáo</h2>
                      <p className="text-xs text-muted-foreground">
                        Nhìn nhanh hiệu suất trong {report.days} ngày
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/40 px-4 py-3 border border-border/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Tổng đơn</div>
                        <div className="mt-1 text-lg font-black text-foreground">
                          {report.totalOrders}
                        </div>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-4 py-3 border border-border/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Giá trị TB</div>
                        <div className="mt-1 text-lg font-black text-foreground">
                          {formatOrderPrice(Math.round(report.averageOrderValue))}
                        </div>
                      </div>
                    </div>
                  </article>
                </section>
              ) : null}

              {mobileView === "items" ? (
                <section className="space-y-4">
                  <RankingCard mobile />
                  <TopItemsChartCard />
                </section>
              ) : null}
            </>
          ) : (
            <>
              <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.8fr_1fr_1fr] min-w-0">
                <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5 xl:col-span-3 min-w-0">
                  {summaryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={card.title}
                        className="group relative overflow-hidden rounded-[24px] border border-border/40 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/10 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 duration-300", card.bg)}>
                            <Icon className={cn("h-5 w-5", card.accent)} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              {card.title}
                            </span>
                            <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
                              {card.value}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground/70 font-medium truncate">{card.caption}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>

                <RevenueChartCard />
                <OrderTypeCard />
                <OrderSourceCard />

                <TopItemsChartCard />
                <div className="xl:col-span-2 min-w-0">
                  <RankingCard mobile={false} />
                </div>
              </section>
            </>
          )}
        </>
      ) : (
        renderInventoryReport()
      )}
    </AdminLayout>
  );
};

export default Reports;
