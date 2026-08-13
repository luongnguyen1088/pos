import { useDeferredValue, useState, useEffect, useRef, useMemo } from "react";
import {
  Bike,
  CheckCircle2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  ChevronRight,
  Clock,
  Heart,
  Info,
  ChevronDown,
  CreditCard,
  Wallet,
  ArrowRight,
  ArrowLeft,
  X,
  Copy,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProductCustomizer from "@/components/pos/ProductCustomizer";
import { ProductImage } from "@/components/pos/ProductImage";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type CartItem, type OrderType, type Product } from "@/data/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/lib/catalog";
import { useInventory } from "@/lib/inventory";
import { brand } from "@/lib/brand";
import { createKitchenOrder, type KitchenOrder } from "@/lib/orders";
import { usePromotions, validatePromoCode, incrementPromoUsage, type Promotion } from "@/lib/promotions";
import { toast } from "sonner";

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;
const formatOrderTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

const orderTypeLabel: Record<OrderType, string> = {
  "dine-in": "Ăn tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

const buildCartItemSignature = (
  item: Pick<CartItem, "product" | "variant" | "selectedOptions" | "note">,
) => {
  const optionsKey = [...item.selectedOptions]
    .map((option) => `${option.optionId}:${option.choiceId}`)
    .sort()
    .join("|");

  return [item.product.id, item.variant?.id || "", item.note.trim(), optionsKey].join("::");
};

const getCartItemUnitPrice = (item: CartItem) =>
  item.product.price +
  (item.variant?.priceAdd ?? 0) +
  item.selectedOptions.reduce((sum, option) => sum + option.priceAdd, 0);

const mergeCartItem = (previous: CartItem[], nextItem: CartItem) => {
  const nextSignature = buildCartItemSignature(nextItem);
  const existingIndex = previous.findIndex(
    (item) => buildCartItemSignature(item) === nextSignature,
  );

  if (existingIndex === -1) {
    return [...previous, nextItem];
  }

  return previous.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          quantity: item.quantity + nextItem.quantity,
          totalPrice: item.totalPrice + nextItem.totalPrice,
        }
      : item,
  );
};

const storePhoneLink = brand.storePhone.replace(/\D/g, "");
const getOrderNumberDigits = (value: string) => value.replace(/\D/g, "");
const buildReceiptText = (order: KitchenOrder) => {
  const lines = [
    "MOKA - BIEN NHAN THANH TOAN",
    `Don hang: ${order.number}`,
    `Thoi gian: ${formatOrderTime(order.createdAt)}`,
    `Hinh thuc: ${order.paymentMethod}`,
    `Loai don: ${orderTypeLabel[order.orderType]}`,
    "",
    "MON DA DAT:",
    ...order.items.map(
      (item) =>
        `- ${item.quantity} x ${item.name}${item.variantName ? ` (${item.variantName})` : ""}: ${formatPrice(item.totalPrice)}`,
    ),
    "",
    `Tong thanh toan: ${formatPrice(order.total)}`,
    "Trang thai: Da thanh toan",
  ];

  return lines.join("\n");
};

const OnlineOrder = () => {
  const isMobile = useIsMobile();
  const { categories, products, isLoading } = useCatalog();
  const { ingredients = [], recipes = [] } = useInventory() || {};
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table");
    if (table) {
      setTableNumber(table);
      setOrderType("dine-in");
    }
  }, []);

  const [timeNote, setTimeNote] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);
  const [lastOrder, setLastOrder] = useState<KitchenOrder | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [backupCart, setBackupCart] = useState<CartItem[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  // Promo Code States
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = Math.max(0, subtotal - promoDiscountAmount);

  const { promotions } = usePromotions();

  // ── Morning promo detection ────────────────────────────────────────────
  const activeMorningPromo = useMemo(() => {
    const now = new Date();
    const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return promotions.find(p =>
      p.isActive &&
      Array.isArray(p.allowedProductIds) &&
      p.allowedProductIds.length > 0 &&
      (p.validFromTime ? cur >= p.validFromTime : true) &&
      (p.validToTime ? cur < p.validToTime : true) &&
      (p.maxUses === null || p.usesCount < p.maxUses)
    ) ?? null;
  }, [promotions]);

  const promoEligibleIds = useMemo(
    () => new Set<string>(activeMorningPromo?.allowedProductIds ?? []),
    [activeMorningPromo]
  );

  const handleApplyPromo = async () => {
    const codeStr = promoCode.trim().toUpperCase();
    if (!codeStr) {
      setAppliedPromo(null);
      setPromoDiscountAmount(0);
      return;
    }
    const result = await validatePromoCode(codeStr, subtotal, orderType, phone.trim() || undefined, cart.map(item => item.product.id));
    if (result.isValid) {
      setAppliedPromo(result.promo!.code);
      setPromoDiscountAmount(result.discountAmount);
      const valStr = result.promo!.discountType === "percent" ? `${result.promo!.discountValue}%` : `${formatPrice(result.promo!.discountValue)}`;
      toast.success(`Áp dụng mã ${result.promo!.code} thành công: Giảm ${valStr}`);
    } else {
      toast.error(result.error || "Mã giảm giá không hợp lệ.");
    }
  };

  useEffect(() => {
    if (appliedPromo) {
      void (async () => {
        const result = await validatePromoCode(appliedPromo, subtotal, orderType, phone.trim() || undefined, cart.map(item => item.product.id));
        if (!result.isValid) {
          setAppliedPromo(null);
          setPromoDiscountAmount(0);
          toast.info(result.error || "Đã hủy bỏ mã giảm giá do thay đổi giỏ hàng.");
        } else {
          setPromoDiscountAmount(result.discountAmount);
        }
      })();
    }
  }, [subtotal, appliedPromo, phone]);

  // Trạng thái Yêu thích lưu vào localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("moka_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("moka_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    toast.success(favorites.includes(productId) ? "Đã xóa khỏi yêu thích" : "Đã thêm vào yêu thích", {
      className: "bg-black text-white border-none rounded-2xl",
    });
  };

  // Đếm ngược 15 phút thanh toán QR
  const [countdown, setCountdown] = useState(900);

  useEffect(() => {
    if (lastOrderNumber && paymentStatus !== "paid") {
      setCountdown(900);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lastOrderNumber, paymentStatus]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isProductOutOfStock = (productId: string) => {
    if (!ingredients || !recipes) return false;

    // 1. Check if the product has recipes
    const productRecipes = recipes.filter((r) => r.productId === productId);
    if (productRecipes.length > 0) {
      return productRecipes.some((r) => {
        const ingredient = ingredients.find((i) => i.id === r.ingredientId);
        return ingredient ? ingredient.quantity < r.quantityRequired : true;
      });
    }

    // 2. Fallback to product-ingredient 1-1 relationship check
    const matchedIngredient = ingredients.find(
      (i) => i.name.toLowerCase().trim() === products.find(p => p.id === productId)?.name.toLowerCase().trim()
    );
    if (matchedIngredient) {
      return matchedIngredient.quantity < 1;
    }

    return false;
  };

  const categoryRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleEditOrder = () => {
    setCart(backupCart);
    setLastOrderNumber(null);
    setOrderId(null);
    setPaymentStatus("pending");
    setCheckoutOpen(true);
  };

  // PWA Install Prompt Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const visibleProducts = products.filter((product) => {
    const matchesOnsite = product.isOnsite !== false;
    const matchesCategory = category === "all" || product.categoryId === category;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      product.name.toLowerCase().includes(normalizedSearch);

    return matchesOnsite && matchesCategory && matchesSearch;
  });

  const crossSellSuggestions = useMemo(() => {
    const cartProductIds = new Set(cart.map((item) => item.product.id));
    return products
      .filter((product) => {
        const notInCart = !cartProductIds.has(product.id);
        const cheap = product.price <= 30000;
        const inStock = !isProductOutOfStock(product.id);
        const isOnsite = product.isOnsite !== false;
        return notInCart && cheap && inStock && isOnsite;
      })
      .slice(0, 3);
  }, [cart, products, ingredients, recipes]);



  const handleProductSelect = (product: Product) => {
    if (isProductOutOfStock(product.id)) {
      toast.error("Món này đã hết nguyên liệu chế biến!", {
        className: "bg-rose-600 text-white border-none rounded-2xl",
      });
      return;
    }

    if (product.variants || product.options) {
      setSelectedProduct(product);
      return;
    }

    setCart((previous) =>
      mergeCartItem(previous, {
        id: crypto.randomUUID(),
        product,
        selectedOptions: [],
        note: "",
        quantity: 1,
        totalPrice: product.price,
      }),
    );
    toast.success(`Đã thêm ${product.name}`, {
      icon: <Plus className="w-4 h-4 text-white" />,
      className: "bg-black text-white border-none rounded-2xl animate-[bounce_0.5s_ease]",
    });
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((previous) => mergeCartItem(previous, item));
    setSelectedProduct(null);
    toast.success(`Đã thêm ${item.product.name} vào giỏ hàng`, {
      icon: <Plus className="w-4 h-4 text-white" />,
      className: "bg-black text-white border-none rounded-2xl",
    });
  };

  const handleQuantityChange = (itemId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((previous) => previous.filter((item) => item.id !== itemId));
      return;
    }

    setCart((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: nextQuantity,
              totalPrice: getCartItemUnitPrice(item) * nextQuantity,
            }
          : item,
      ),
    );
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng đang trống");
      return;
    }

    if (orderType === "delivery") {
      if (!customerName.trim()) {
        toast.error("Vui lòng nhập tên người nhận");
        return;
      }
      if (!phone.trim()) {
        toast.error("Vui lòng nhập số điện thoại giao hàng");
        return;
      }
      if (!address.trim()) {
        toast.error("Vui lòng nhập địa chỉ giao hàng");
        return;
      }
    }

    // Promotion checks
    if (appliedPromo) {
      if (!phone.trim()) {
        toast.error("Vui lòng nhập số điện thoại để áp dụng mã khuyến mãi.");
        return;
      }
      if (orderType === "delivery" && paymentMethod === "cod") {
        toast.error("Hình thức Giao hàng yêu cầu Chuyển khoản trước để áp dụng mã khuyến mãi.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const finalCustomerName = customerName.trim() || (orderType === "dine-in" ? "Khách tại chỗ" : orderType === "takeaway" ? "Khách mang đi" : "Khách giao hàng");
      const paymentLabel =
        paymentMethod === "cod"
          ? orderType === "delivery"
            ? "Thanh toán khi nhận hàng"
            : "Thanh toán tại quầy"
          : "Chuyển khoản khi xác nhận";

      const orderInfo = [
        customerName.trim(),
        phone.trim(),
        timeNote.trim() ? `Note: ${timeNote.trim()}` : null,
        orderType === "delivery"
          ? address.trim()
          : orderType === "dine-in"
            ? (tableNumber ? `Bàn ${tableNumber}` : "Ăn tại chỗ")
            : "Mang đi",
        note.trim() ? `Ghi chú: ${note.trim()}` : null,
      ].filter(Boolean).join(" • ");

      const { order } = await createKitchenOrder({
        items: cart,
        subtotal,
        total: total,
        orderType,
        orderInfo,
        paymentMethod: paymentLabel,
        paymentStatus: "pending",
        kitchenReleaseStatus: "hold",
        discountAmount: promoDiscountAmount,
        discountType: appliedPromo ? "amount" : null,
        discountValue: promoDiscountAmount,
        customerPhone: phone.trim() || null,
        customerName: customerName.trim() || null,
        deliveryAddress: orderType === "delivery" ? address.trim() : null,
        customerNote: note.trim() || null,
        orderSource: "kiosk",
        promoCode: appliedPromo || null,
      });

      setBackupCart([...cart]);
      setCart([]);
      setAddress("");
      setTimeNote("");
      setNote("");

      // Increment promo usage count BEFORE clearing appliedPromo
      if (appliedPromo) {
        void incrementPromoUsage(appliedPromo);
      }

      setPromoCode("");
      setPromoDiscountAmount(0);
      setAppliedPromo(null);
      setLastOrder(order);
      setOrderId(order.id);
      setLastOrderNumber(order.number);
      setLastOrderTotal(order.total);
      setPaymentStatus("pending");
      setCheckoutOpen(false);

      toast.success("Đặt món thành công!");
    } catch (error) {
      toast.error("Không thể gửi đơn hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time Payment Detection
  useEffect(() => {
    if (!orderId || lastOrderNumber === null || !supabase) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "anvat_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new.payment_status === "paid") {
            setPaymentStatus("paid");
            setLastOrder((previous) =>
              previous
                ? {
                    ...previous,
                    paymentStatus: "paid",
                  }
                : previous,
            );
            toast.success("Đã nhận được thanh toán!", {
              icon: "💰",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, lastOrderNumber]);

  // Hiệu ứng pháo hoa giấy chúc mừng khi thanh toán thành công
  useEffect(() => {
    if (paymentStatus === "paid") {
      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "999";
      document.body.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const colors = ["#4ADE80", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA"];
      const particles = Array.from({ length: 150 }).map(() => ({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        angle: Math.random() * Math.PI * 2,
        speed: 5 + Math.random() * 10,
        radius: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        decay: 0.95 + Math.random() * 0.04,
        gravity: 0.3,
        life: 1.0,
      }));

      let animationFrameId: number;
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        particles.forEach((p) => {
          if (p.life > 0) {
            active = true;
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed + p.gravity;
            p.speed *= p.decay;
            p.life -= 0.015;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
          }
        });

        if (active) {
          animationFrameId = requestAnimationFrame(draw);
        } else {
          canvas.remove();
        }
      };

      draw();
      return () => {
        cancelAnimationFrame(animationFrameId);
        canvas.remove();
      };
    }
  }, [paymentStatus]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handleDownloadQR = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `QR-Moka-${getOrderNumberDigits(lastOrderNumber ?? "")}.jpg`, { type: "image/jpeg" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Mã thanh toán đơn hàng ${lastOrderNumber}`,
        });
        return;
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-Moka-${getOrderNumberDigits(lastOrderNumber ?? "")}.jpg`;
      link.click();
      toast.success("Đã bắt đầu tải ảnh QR");
    } catch (error) {
      window.open(url, "_blank");
    }
  };

  const handleOpenBankApp = () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobileDevice) {
      toast.info("Tính năng này chỉ dành cho điện thoại.", {
        description: "Bạn vui lòng quét mã QR trên màn hình hoặc copy thông tin nhé!",
      });
      return;
    }

    const bankId = brand.bankId;
    const account = brand.bankAccount;
    const memo = `MOKA ${lastOrderNumber}`;
    const amount = lastOrderTotal;

    const universalLink = `https://dl.vietqr.io/pay?bank=${bankId}&account=${account}&amount=${amount}&addInfo=${encodeURIComponent(memo)}&app=vietinbank`;

    window.location.href = universalLink;
    
    toast.info("Đang kết nối tới App Ngân hàng...", {
      description: "Hệ thống sẽ tự động điền Số tiền và Nội dung. Nếu App không mở, hãy dùng nút 'Lưu QR' nhé!",
      duration: 6000,
    });
  };

  const handleCloseOrderOverlay = () => {
    setLastOrderNumber(null);
    setLastOrder(null);
    setLastOrderTotal(0);
    setOrderId(null);
    setPaymentStatus("pending");
  };


  return (
    <div className="min-h-screen bg-[#F1F3F5] text-[#1A1A1A] font-sans selection:bg-primary/10">
      {/* Premium Sticky Header */}
      {/* Premium Sticky Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 flex items-center justify-between bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 shadow-[0_2px_15px_rgba(0,0,0,0.015)] h-16 text-slate-800"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md">
            <BrandMark size="sm" className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none text-slate-900">
              {brand.name}
            </h1>
            <div className="flex items-center gap-1 mt-1 leading-none">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">ĐANG HOẠT ĐỘNG</span>
            </div>
          </div>
        </div>

        {/* Sticky Desktop Search Bar */}
        {!isMobile && (
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trà sữa, cafe, kem..."
              className="w-full h-10 pl-10 pr-8 bg-slate-50 rounded-xl border border-slate-100 font-bold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary/20 focus:ring-1 focus:ring-primary/10 transition-all shadow-xs"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
              >
                Xóa
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Mobile search toggle button */}
          {isMobile && (
            <button 
              onClick={() => setSearch(s => s === "" ? " " : "")}
              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}
          
          {/* Cart Button */}
          <button
            onClick={() => setCheckoutOpen(true)}
            className="relative flex items-center gap-2 h-10 px-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-black text-xs transition-all shadow-md active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Giỏ hàng ({itemCount})</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white text-[9px] font-black flex items-center justify-center animate-bounce">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className={cn(
        "mx-auto w-full",
        isMobile 
          ? "h-screen flex flex-col overflow-hidden pt-16" 
          : "max-w-[96%] xl:max-w-[98%] 2xl:max-w-[98%] lg:grid lg:grid-cols-12 lg:gap-8 pt-20 pb-40 px-4 sm:px-6"
      )}>
        <div className={cn(
          isMobile ? "flex-1 flex flex-col overflow-hidden space-y-2 p-3 pb-0" : "lg:col-span-9 space-y-6"
        )}>
          {/* PWA Install Banner - Adjusted for Fixed Header */}
        {showInstallBanner && isMobile && (
          <div className="pt-4 px-6 animate-in slide-in-from-top duration-500">
            <div className="p-4 bg-white border border-primary/10 rounded-[24px] flex items-center justify-between shadow-2xl shadow-primary/5 ring-1 ring-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Trải nghiệm App</span>
                  <span className="text-[10px] font-bold text-gray-400 leading-tight">Đặt món nhanh, mượt hơn</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="px-3.5 py-2 text-[10px] font-black text-slate-400 hover:text-slate-500 bg-slate-50 active:scale-95 transition-all rounded-xl"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 text-[10px] font-black text-white bg-primary hover:bg-primary/95 active:scale-95 transition-all rounded-xl shadow-lg shadow-primary/15"
                >
                  Tải ngay
                </button>
              </div>
            </div>
          </div>
        )}
        {!isMobile && (
          <section
            className="relative py-3.5 px-5 w-full bg-cover bg-center rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-between gap-6 overflow-hidden h-20 bg-white"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.92)), url("https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&q=80&w=600")',
            }}
          >
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              <div className="flex flex-col">
                <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                   Thưởng thức <span className="text-primary">Vị ngon nguyên bản.</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Đặt món nhanh chóng tại quầy Kiosk tự phục vụ</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">🟢 ĐANG MỞ CỬA</span>
              </div>
              <a
                href={`tel:${storePhoneLink}`}
                className="flex h-9 items-center gap-1.5 bg-black hover:bg-slate-900 text-white px-4 rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" /> Gọi điện hỗ trợ
              </a>
            </div>
          </section>
        )}

        {isMobile ? (
          <div className="px-1 py-1 shrink-0">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trà sữa, cafe, kem..."
                className="w-full h-9 pl-9 pr-8 bg-white rounded-xl border border-slate-100 font-bold text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ee4d2d]/30 transition-all shadow-xs"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        ) : (
          <section className="sticky top-16 z-40 bg-[#F1F3F5]/90 backdrop-blur-xl border-b border-gray-200/40 py-3.5 px-4 sm:px-6 space-y-3 transition-all">
            {/* Active Search Input (Mobile Only) */}
            {isMobile && (
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trà sữa, cafe, kem..."
                  className="w-full h-11 pl-11 pr-4 bg-white rounded-2xl border border-slate-100 font-bold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ee4d2d]/30 focus:ring-1 focus:ring-[#ee4d2d]/20 transition-all shadow-sm"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    Xóa
                  </button>
                )}
              </div>
            )}

            {!isMobile && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setCategory("all")}
                  className={cn(
                    "px-6 h-12 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2",
                    category === "all"
                      ? "bg-primary text-white shadow-2xl shadow-primary/20 translate-y-[-2px] scale-105"
                      : "bg-white text-slate-500 border border-slate-100 hover:border-primary/20 hover:text-slate-700"
                  )}
                >
                  🥗 Tất cả ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter(p => p.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      ref={(el) => (categoryRefs.current[cat.id] = el)}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "px-6 h-12 rounded-2xl text-xs font-black whitespace-nowrap flex items-center gap-2 transition-all",
                        category === cat.id
                          ? "bg-primary text-white shadow-2xl shadow-primary/20 translate-y-[-2px] scale-105"
                          : "bg-white text-slate-500 border border-slate-100 hover:border-primary/20 hover:text-slate-700"
                      )}
                    >
                      <span>{cat.icon}</span>
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ☀️ Morning promo banner — shows only during active promo time window */}
        {activeMorningPromo && (
          <div className={`animate-in slide-in-from-top duration-300 ${isMobile ? "mx-0.5" : "mb-4"}`}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 shadow-lg shadow-amber-500/20">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute right-8 -bottom-6 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none select-none">☀️</span>
                  <div>
                    <p className="text-white font-black text-[11px] leading-tight">
                      Tặng FREE sáng nay!
                    </p>
                    <p className="text-white/80 text-[9px] font-bold mt-0.5">
                      Nhập mã{" "}
                      <span className="bg-white/25 px-1.5 py-0.5 rounded font-black text-white tracking-wider">
                        {activeMorningPromo.code}
                      </span>
                      {activeMorningPromo.validFromTime && activeMorningPromo.validToTime
                        ? ` · ${activeMorningPromo.validFromTime}–${activeMorningPromo.validToTime}`
                        : activeMorningPromo.validToTime ? ` · Đến ${activeMorningPromo.validToTime}` : ""}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {activeMorningPromo.maxUses !== null && (
                    <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      Còn {activeMorningPromo.maxUses - activeMorningPromo.usesCount}/{activeMorningPromo.maxUses} suất
                    </span>
                  )}
                  <p className="text-white/70 text-[8px] font-bold mt-0.5">🍦 Kem ốc quế · 🍋 Trà chanh</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Grid / Side-by-side Menu */}
        {isMobile ? (
          <section className="flex-1 flex gap-0 mt-2 -mx-3 min-h-0 overflow-hidden">
            {/* Left Categories Column */}
            <div className="w-[84px] bg-[#F5F5F5] flex-shrink-0 overflow-y-auto no-scrollbar flex flex-col pb-28">
              <button
                onClick={() => setCategory("all")}
                className={cn(
                  "w-full py-4 px-1.5 text-center transition-all flex flex-col items-center justify-center gap-1 border-l-4 min-h-[72px]",
                  category === "all"
                    ? "bg-white border-l-[#ee4d2d] text-[#ee4d2d] font-black"
                    : "border-l-transparent text-slate-500 font-semibold"
                )}
              >
                <span className="text-base">🥗</span>
                <span className="text-[10px] leading-tight font-black">Tất cả</span>
              </button>
              {categories.map((cat) => {
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "w-full py-4 px-1.5 text-center transition-all flex flex-col items-center justify-center gap-1 border-l-4 min-h-[72px]",
                      category === cat.id
                        ? "bg-white border-l-[#ee4d2d] text-[#ee4d2d] font-black"
                        : "border-l-transparent text-slate-500 font-semibold"
                    )}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-[10px] leading-tight break-words font-black max-w-full">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Products Column */}
            <div className="flex-1 overflow-y-auto bg-white px-3 py-1 space-y-4 no-scrollbar pb-28">
              <div className="sticky top-0 bg-white py-2 z-10 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {category === "all" ? "Tất cả món ngon" : categories.find(c => c.id === category)?.name}
                </span>
                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                  {visibleProducts.length} món
                </span>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4 p-2 bg-white rounded-xl border border-slate-50 animate-pulse h-24" />
                  ))}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-xs">
                  Không tìm thấy món ăn nào.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleProducts.map((product, idx) => {
                    const outOfStock = isProductOutOfStock(product.id);
                    const isFavorite = favorites.includes(product.id);
                    const cartItem = cart.find(item => item.product.id === product.id && !product.variants && !product.options);
                    const showQuantityControls = cartItem && !outOfStock;

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className={cn(
                          "flex gap-3 py-3 last:border-0 relative active:bg-slate-50/50 transition-colors duration-150 rounded-lg px-1",
                          outOfStock && "pointer-events-none opacity-60 grayscale"
                        )}
                      >
                        {/* Product Image */}
                        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-50 shadow-sm border border-slate-100/50">
                          <ProductImage
                            image={product.image}
                            name={product.name}
                            className="w-full h-full object-cover"
                          />
                          {outOfStock ? (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="text-[8px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                Hết hàng
                              </span>
                            </div>
                          ) : promoEligibleIds.has(product.id) ? (
                            <div className="absolute top-1 left-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider scale-90 origin-top-left animate-pulse">
                              🎁 FREE
                            </div>
                          ) : (
                            idx % 3 === 0 && (
                              <div className="absolute top-1 left-1 bg-gradient-to-r from-rose-500 to-[#ee4d2d] text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider scale-90 origin-top-left">
                                Bán chạy
                              </div>
                            )
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                              {product.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1 font-medium">
                              {product.variants ? "Nhiều hương vị lựa chọn" : "Công thức truyền thống"}
                            </p>
                          </div>
                          
                          <div className="flex items-end justify-between mt-1">
                            <span className="text-sm font-black text-[#ee4d2d] tracking-tight">
                              {formatPrice(product.price)}
                            </span>

                            <div onClick={(e) => e.stopPropagation()}>
                              {showQuantityControls ? (
                                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shadow-sm">
                                  <button
                                    onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity - 1)}
                                    className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-slate-500 shadow-xs active:scale-90 transition-transform"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="text-[10px] font-black w-3.5 text-center text-slate-800">{cartItem.quantity}</span>
                                  <button
                                    onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity + 1)}
                                    className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[#ee4d2d] shadow-xs active:scale-90 transition-transform"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                !outOfStock && (
                                  <button
                                    type="button"
                                    onClick={() => handleProductSelect(product)}
                                    className="w-7 h-7 rounded-full bg-[#ee4d2d] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform hover:bg-[#d83f23]"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="px-6 mt-8 pb-40">
            <div className={cn(
              "grid gap-4",
              "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7"
            )}>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-[32px] animate-pulse" />
                ))
              ) : (
                visibleProducts.map((product, idx) => {
                  const outOfStock = isProductOutOfStock(product.id);
                  const isFavorite = favorites.includes(product.id);

                  // Kiểm tra xem sản phẩm đơn giản này đã nằm trong giỏ hàng chưa
                  const cartItem = cart.find(item => item.product.id === product.id && !product.variants && !product.options);
                  const showQuantityControls = cartItem && !outOfStock;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className={cn(
                        "group relative flex flex-col items-center justify-between p-4 bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-slate-200/80 active:scale-[0.98] transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:border-primary/30 min-h-[220px] text-center",
                        outOfStock && "pointer-events-none opacity-50 grayscale bg-slate-50/50"
                      )}
                    >
                      {/* Badges & Favorite Heart */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                        {outOfStock ? (
                          <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Hết hàng
                          </span>
                        ) : promoEligibleIds.has(product.id) ? (
                          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 uppercase tracking-wider animate-pulse border border-white/20">
                            🎁 FREE
                          </span>
                        ) : (
                          idx % 3 === 0 ? (
                            <span className="bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 uppercase tracking-wider scale-105 border border-white/20 animate-pulse">
                              🔥 Best
                            </span>
                          ) : <div />
                        )}

                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(product.id, e)}
                          className={cn(
                            "pointer-events-auto w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-125 bg-slate-50/80 backdrop-blur-sm text-gray-300 hover:text-gray-400",
                            isFavorite && "bg-rose-50 text-rose-500"
                          )}
                        >
                          <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-rose-500")} />
                        </button>
                      </div>

                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 shadow-inner mt-4 flex items-center justify-center shrink-0">
                        <ProductImage
                          image={product.image}
                          name={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>

                      {/* Info block */}
                      <div className="w-full mt-3 flex-1 flex items-center justify-center">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 max-w-[130px]">
                          {product.name}
                        </h3>
                      </div>

                      {/* Price & Actions Row at the Bottom (Add to Cart bottom-right aligned) */}
                      <div className="mt-4 w-full flex items-center justify-between pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm font-extrabold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        
                        {showQuantityControls ? (
                          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 shadow-sm">
                            <button
                              onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity - 1)}
                              className="w-5 h-5 rounded-lg bg-white flex items-center justify-center text-slate-500 active:scale-90 transition-transform shadow-xs"
                            >
                              <Minus className="w-2 h-2" />
                            </button>
                            <span className="text-[9px] font-black w-4 text-center text-slate-800">{cartItem.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity + 1)}
                              className="w-5 h-5 rounded-lg bg-white flex items-center justify-center text-primary active:scale-90 transition-transform shadow-xs"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          !outOfStock && (
                            <button
                              type="button"
                              onClick={() => handleProductSelect(product)}
                              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 active:scale-90 transition-all hover:bg-primary/95"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      )}
    </div>

      {/* Sidebar Checkout Panel for Desktop (Sticky top-20 self-start) */}
      <div className="hidden lg:flex lg:col-span-3 sticky top-20 self-start bg-white rounded-3xl border border-slate-100/80 shadow-[0_20px_50px_rgba(0,0,0,0.02)] h-[calc(100vh-100px)] flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Giỏ hàng của bạn
          </h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])} 
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl transition-colors active:scale-95"
              >
                Xóa tất cả
              </button>
            )}
            {itemCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-black px-2.5 py-1 rounded-full">
                {itemCount} món
              </span>
            )}
          </div>
        </div>

        {/* Cart items list / Client info */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-start text-center pt-8 px-4">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 relative">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full animate-ping" />
              </div>
              <h3 className="font-black text-slate-800 text-sm mb-1">Giỏ hàng đang trống</h3>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-[200px] mb-4">Hãy chọn những món ngon cực hấp dẫn của Moka để lấp đầy chiếc bụng đói nhé!</p>
              <button
                onClick={() => {
                  window.scrollTo({ top: window.innerHeight * 0.25, behavior: 'smooth' });
                }}
                className="px-5 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/95 active:scale-95 transition-all mb-8"
              >
                Khám phá menu ngay
              </button>

              {/* Promo Banner for Empty Cart */}
              <div className="w-full border border-dashed border-primary/30 bg-primary/5 rounded-2xl p-4 text-left space-y-2 mt-auto">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Khuyến mãi hôm nay
                </p>
                <ul className="space-y-1.5 text-[10px] text-slate-600 font-bold">
                  {promotions.filter(p => p.isActive).map((p) => (
                    <li key={p.code} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        Nhập mã <span className="text-primary font-black px-1.5 py-0.5 bg-primary/10 rounded">{p.code}</span>: {p.description || `giảm ${p.discountType === 'percent' ? `${p.discountValue}%` : formatPrice(p.discountValue)} cho đơn từ ${formatPrice(p.minOrderValue)}`}
                      </div>
                    </li>
                  ))}
                  {promotions.filter(p => p.isActive).length === 0 && (
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Hiện tại không có mã giảm giá nào.
                    </li>
                  )}
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Mua thêm để được miễn phí giao hàng!
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3.5">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shadow-inner flex-shrink-0">
                      <ProductImage image={item.product.image} name={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">{item.product.name}</h4>
                        <span className="font-black text-xs text-slate-900 whitespace-nowrap">{formatPrice(item.totalPrice)}</span>
                      </div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-[10px] text-gray-400 font-bold leading-none mt-1">
                          {item.selectedOptions.map(o => o.name).join(", ")}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-lg px-2 py-0.5 shadow-sm">
                          <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="text-slate-400 active:scale-95 transition-transform"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="text-[10px] font-black w-3 text-center text-slate-800">{item.quantity}</span>
                          <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="text-primary active:scale-95 transition-transform"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Promotion Bar */}
              <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-3.5 space-y-2">
                {subtotal < 150000 ? (
                  <>
                    <div className="flex justify-between text-[10px] font-black text-slate-500">
                      <span>Mua thêm {formatPrice(150000 - subtotal)} để được Freeship</span>
                      <span className="text-primary">{Math.round((subtotal / 150000) * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${Math.min((subtotal / 150000) * 100, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">🎉</span>
                    <span>Đơn hàng đã được FREESHIP!</span>
                  </div>
                )}
                
                {promotions.filter(p => p.isActive).map((p) => (
                  <p key={p.code} className="text-[9px] text-slate-400 font-bold">
                    💡 Nhập mã <span className="text-slate-600 font-black">{p.code}</span>: {p.description || `giảm ${p.discountType === 'percent' ? `${p.discountValue}%` : formatPrice(p.discountValue)} cho đơn từ ${formatPrice(p.minOrderValue)}`}
                  </p>
                ))}
                {promotions.filter(p => p.isActive).length === 0 && (
                  <p className="text-[9px] text-slate-400 font-bold">
                    💡 Hiện tại không có chương trình khuyến mãi nào.
                  </p>
                )}
              </div>

              {/* Promo Code Input (Desktop) */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mã giảm giá</label>
                <div className="flex gap-2">
                  <Input 
                    value={promoCode} 
                    onChange={(e) => setPromoCode(e.target.value)} 
                    placeholder="Mã giảm giá..." 
                    className="h-9 rounded-xl border-slate-100 bg-white font-bold text-xs" 
                  />
                  <button 
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase shrink-0 active:scale-95 transition-all"
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedPromo && (
                  <p className="text-[10px] text-emerald-600 font-bold ml-1">
                    ✓ Đã áp dụng mã {appliedPromo} (-{formatPrice(promoDiscountAmount)})
                  </p>
                )}
              </div>

              {/* Gợi ý mua kèm (Desktop) */}
              {crossSellSuggestions.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    ✨ Gợi ý mua kèm siêu ngon
                  </p>
                  <div className="space-y-2">
                    {crossSellSuggestions.map((product) => (
                      <div 
                        key={product.id} 
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                            <ProductImage image={product.image} name={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">{product.name}</p>
                            <p className="text-[10px] font-extrabold text-[#ee4d2d]">{formatPrice(product.price)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all"
                        >
                          + Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Details Form */}
              <div className="space-y-4 pt-5 border-t border-slate-100">
                {/* Order Type Buttons (Dine-in / Takeaway / Delivery) */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hình thức nhận món</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "dine-in", label: "Ăn tại chỗ", icon: Store },
                      { id: "takeaway", label: "Mang đi", icon: ShoppingBag },
                      { id: "delivery", label: "Giao hàng", icon: Bike },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setOrderType(type.id as OrderType)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 transition-all duration-300",
                          orderType === type.id ? "border-primary bg-primary/5 text-primary" : "border-slate-50 bg-slate-50 text-slate-400"
                        )}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {orderType === "dine-in" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Số bàn của bạn</label>
                    <Input
                      value={tableNumber || ""}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Nhập số bàn (ví dụ: 5, A1...)"
                      className="h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {orderType === "delivery" ? "Tên người nhận" : "Tên của bạn (Tùy chọn)"}
                  </label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tên khách hàng..." className="h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-xs" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {orderType === "delivery" ? "Số điện thoại giao hàng" : "Số điện thoại (Nhập để tích điểm)"}
                  </label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại của bạn..." className="h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-xs" />
                </div>

                {orderType === "delivery" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ giao hàng</label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Địa chỉ giao hàng chi tiết (Số nhà, tên đường, phường...)"
                      className="min-h-[80px] rounded-xl border-slate-100 bg-slate-50/50 text-xs font-medium"
                    />
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider mr-1">Điền nhanh:</span>
                      {["Chi Long", "KCN Yên Phong", "Yên Phụ", "Thôn Đông", "Ô Cách"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setAddress((prev) => {
                              const trimmed = prev.trim();
                              if (!trimmed) return tag;
                              if (trimmed.endsWith(tag)) return prev;
                              return `${trimmed}, ${tag}`;
                            });
                            toast.success(`Đã thêm "${tag}"`, { duration: 1000 });
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 hover:border-primary/20 active:scale-95 transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú nhà bếp</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không đá, nhiều ngọt..." className="h-11 rounded-xl border-slate-100 bg-slate-50/50 text-xs" />
                </div>

                {/* Payment Options */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Phương thức thanh toán</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("transfer")}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300",
                        paymentMethod === "transfer" ? "border-primary bg-primary/5 text-primary" : "border-slate-50 bg-slate-50 text-slate-400"
                      )}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[9px] font-black">Chuyển khoản QR</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("cod")}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300",
                        paymentMethod === "cod" ? "border-primary bg-primary/5 text-primary" : "border-slate-50 bg-slate-50 text-slate-400"
                      )}
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="text-[9px] font-black">
                        {orderType === "delivery" ? "Tiền mặt (COD)" : "Trả tại quầy"}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center italic mt-2">
                    {paymentMethod === "transfer" 
                      ? "Mã QR VietQR sẽ hiện ở bước sau để bạn quét mã." 
                      : orderType === "delivery" 
                        ? "Bạn sẽ thanh toán khi nhận hàng." 
                        : "Bạn sẽ thanh toán tại quầy thu ngân."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer of Sidebar */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-white shrink-0 space-y-4">
            {/* Reassurance Trust Signals */}
            <div className="grid grid-cols-3 gap-1 border-b border-slate-50 pb-3 text-center">
              <div className="flex flex-col items-center">
                <span className="text-[14px]">⚡</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Chuẩn bị nhanh</span>
              </div>
              <div className="flex flex-col items-center border-x border-slate-100">
                <span className="text-[14px]">🌿</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Sạch tự nhiên</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px]">🛵</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Giao tận nơi</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">Tổng tiền thanh toán</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">{formatPrice(total)}</span>
                {promoDiscountAmount > 0 && (
                  <span className="text-xs font-bold text-slate-400 line-through">{formatPrice(subtotal)}</span>
                )}
              </div>
            </div>
            
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary/95 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {orderType === "delivery" ? "👉 ĐẶT GIAO NGAY" : orderType === "dine-in" ? "⚡ ĐẶT MÓN TẠI QUẦY" : "🛍️ ĐẶT MANG ĐI"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </main>

    {/* Floating Bottom Cart (Quick View) */}
    {itemCount > 0 && !checkoutOpen && (
      <div className="fixed bottom-8 left-6 right-6 z-50 animate-in slide-in-from-bottom-10 duration-500 lg:hidden">
           <button
            onClick={() => setCheckoutOpen(true)}
            className="w-full h-16 bg-[#ee4d2d] text-white rounded-[28px] flex items-center justify-between px-7 shadow-[0_20px_50px_rgba(238,77,45,0.3)] active:scale-[0.98] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md">
                <ShoppingBag className="w-5 h-5 text-[#ee4d2d]" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-100">Giỏ hàng</p>
                <p className="text-sm font-black">{itemCount} món • {formatPrice(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-black text-sm relative z-10">
              <span>Giao hàng</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* Modern Checkout Drawer */}
      {/* Mobile Checkout Page */}
      {checkoutOpen && isMobile && (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col h-screen overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCheckoutOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-800">Xác nhận đơn hàng</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Kiểm tra lại thông tin trước khi đặt</p>
              </div>
            </div>
            <button 
              onClick={() => setCheckoutOpen(false)}
              className="text-xs font-black text-[#ee4d2d] uppercase tracking-wider bg-orange-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
            >
              Thêm món
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 no-scrollbar">
            {/* Section 1: Item List - Compact */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#ee4d2d]" /> Món đã chọn
                  </h3>
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setCart([])} 
                      className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors active:scale-95"
                    >
                      Xóa tất cả
                    </button>
                  )}
               </div>
               <div className="space-y-2.5">
                {cart.map((item) => (
                  <div key={item.id} className="group relative flex gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-50 transition-all active:bg-gray-50">
                    <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-gray-50">
                      <ProductImage image={item.product.image} name={item.product.name} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900 text-xs line-clamp-1">{item.product.name}</p>
                        <button onClick={() => handleQuantityChange(item.id, 0)} className="text-gray-300 hover:text-rose-500 transition-colors p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[#ee4d2d] font-black text-xs">{formatPrice(item.totalPrice)}</p>
                        <div className="flex items-center gap-3 bg-gray-50 px-2 py-1 rounded-lg">
                          <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="text-gray-400 p-0.5 active:scale-125 transition-transform"><Minus className="w-3 h-3" /></button>
                          <span className="text-[10px] font-black w-3 text-center text-slate-800">{item.quantity}</span>
                          <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="text-[#ee4d2d] p-0.5 active:scale-125 transition-transform"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
               </div>
            </div>

            {/* Dynamic Promotion Bar (Mobile) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 space-y-2 shadow-xs">
              {subtotal < 150000 ? (
                <>
                  <div className="flex justify-between text-[10px] font-black text-slate-500">
                    <span>Mua thêm {formatPrice(150000 - subtotal)} để được Freeship</span>
                    <span className="text-[#ee4d2d]">{Math.round((subtotal / 150000) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#ee4d2d] transition-all duration-500" 
                      style={{ width: `${Math.min((subtotal / 150000) * 100, 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">🎉</span>
                  <span>Đơn hàng đã được FREESHIP!</span>
                </div>
              )}
              
              {promotions.filter(p => p.isActive).map((p) => (
                <p key={p.code} className="text-[9px] text-slate-400 font-bold">
                  💡 Nhập mã <span className="text-slate-600 font-black">{p.code}</span>: {p.description || `giảm ${p.discountType === 'percent' ? `${p.discountValue}%` : formatPrice(p.discountValue)} cho đơn từ ${formatPrice(p.minOrderValue)}`}
                </p>
              ))}
              {promotions.filter(p => p.isActive).length === 0 && (
                <p className="text-[9px] text-slate-400 font-bold">
                  💡 Hiện tại không có chương trình khuyến mãi nào.
                </p>
              )}
            </div>

            {/* Promo Code Input (Mobile) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 space-y-2 shadow-xs">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mã giảm giá</label>
              <div className="flex gap-2">
                <Input 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value)} 
                  placeholder="Mã giảm giá..." 
                  className="h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-xs" 
                />
                <button 
                  type="button"
                  onClick={handleApplyPromo}
                  className="h-11 px-5 rounded-xl bg-[#ee4d2d] text-white text-xs font-black uppercase shrink-0 active:scale-95 transition-all"
                >
                  Áp dụng
                </button>
              </div>
              {appliedPromo && (
                <p className="text-[10px] text-emerald-600 font-bold ml-1">
                  ✓ Đã áp dụng mã {appliedPromo} (-{formatPrice(promoDiscountAmount)})
                </p>
              )}
            </div>

            {/* Gợi ý mua kèm (Mobile) */}
            {crossSellSuggestions.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-4 space-y-2 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  ✨ Gợi ý mua kèm siêu ngon
                </p>
                <div className="space-y-2">
                  {crossSellSuggestions.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#ee4d2d]/20 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 shadow-inner">
                          <ProductImage image={product.image} name={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]">{product.name}</p>
                          <p className="text-[10px] font-extrabold text-[#ee4d2d]">{formatPrice(product.price)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className="px-2.5 py-1 bg-[#ee4d2d]/10 hover:bg-[#ee4d2d] text-[#ee4d2d] hover:text-white text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Personal & Type - Combined & Compact */}
            <div className="p-5 bg-white rounded-3xl shadow-sm space-y-5 border border-gray-50">
              <div className="grid grid-cols-1 gap-4">
                {/* Thông tin khách hàng cho mọi đơn hàng để liên hệ khi xong đồ */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Thông tin khách đặt (Nhập SĐT để tích điểm)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tên của bạn..."
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-sm"
                    />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Số ĐT..."
                      className="h-11 w-32 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-sm shrink-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dine-in", label: "Tại chỗ", icon: Store },
                    { id: "takeaway", label: "Mang đi", icon: ShoppingBag },
                    { id: "delivery", label: "Giao hàng", icon: Bike },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setOrderType(type.id as OrderType)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 transition-all duration-300",
                        orderType === type.id 
                          ? "border-[#ee4d2d] bg-[#ee4d2d]/5 text-[#ee4d2d] font-black scale-[1.02]" 
                          : "border-gray-50 bg-gray-50 text-gray-400 font-bold"
                      )}
                    >
                      <type.icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black">{type.label}</span>
                    </button>
                  ))}
                </div>

                {orderType === "dine-in" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số bàn của bạn</label>
                    <Input
                      value={tableNumber || ""}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Ví dụ: 5, A1, B2..."
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-sm"
                    />
                  </div>
                )}

                {orderType === "delivery" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Địa chỉ giao hàng chi tiết (Số nhà, tên đường, phường...)"
                      className="min-h-[80px] rounded-xl border-gray-100 bg-gray-50/50 text-sm font-medium focus:border-[#ee4d2d]/30"
                    />
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider mr-1">Điền nhanh:</span>
                      {["Chi Long", "KCN Yên Phong", "Yên Phụ", "Thôn Đông", "Ô Cách"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setAddress((prev) => {
                              const trimmed = prev.trim();
                              if (!trimmed) return tag;
                              if (trimmed.endsWith(tag)) return prev;
                              return `${trimmed}, ${tag}`;
                            });
                            toast.success(`Đã thêm "${tag}"`, { duration: 1000 });
                          }}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 hover:border-primary/20 active:scale-95 transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú món ăn</label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Không hành, nhiều đá..."
                    className="h-11 rounded-xl border-gray-100 bg-gray-50/50 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-3xl shadow-sm border border-gray-50 space-y-4">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Phương thức thanh toán</p>
               <div className="grid grid-cols-2 gap-2">
                 <button
                   onClick={() => setPaymentMethod("transfer")}
                   className={cn(
                     "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                     paymentMethod === "transfer"
                       ? "border-[#ee4d2d] bg-[#ee4d2d]/5 text-[#ee4d2d] font-black scale-[1.02]"
                       : "border-gray-50 bg-gray-50 text-gray-400 font-bold"
                   )}
                 >
                   <CreditCard className="w-5 h-5" />
                   <span className="text-[10px] font-black">Chuyển khoản QR</span>
                 </button>
                 <button
                   onClick={() => setPaymentMethod("cod")}
                   className={cn(
                     "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                     paymentMethod === "cod"
                       ? "border-[#ee4d2d] bg-[#ee4d2d]/5 text-[#ee4d2d] font-black scale-[1.02]"
                       : "border-gray-50 bg-gray-50 text-gray-400 font-bold"
                   )}
                 >
                   <Wallet className="w-5 h-5" />
                   <span className="text-[10px] font-black">
                     {orderType === "delivery" ? "Tiền mặt (COD)" : "Trả tại quầy"}
                   </span>
                 </button>
               </div>
               <p className="text-[10px] text-gray-400 text-center italic">
                 {paymentMethod === "transfer" 
                   ? "Mã QR VietQR sẽ hiện ở bước sau để bạn quét mã." 
                   : orderType === "delivery"
                     ? "Bạn sẽ thanh toán tiền mặt khi nhận hàng."
                     : "Bạn sẽ thanh toán tại quầy thu ngân."}
               </p>
            </div>
            
            <div className="h-10" />
          </div>

          {/* Compact Checkout Footer */}
          <div className="px-4 py-3 pb-8 bg-white border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] shrink-0">
            <div className="flex items-center gap-3">
              {/* Total */}
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Tổng cộng</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-black tracking-tight">{formatPrice(total)}</span>
                  {promoDiscountAmount > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 line-through">{formatPrice(subtotal)}</span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-[#ee4d2d]">
                  {orderType === "dine-in" ? "Ăn tại chỗ" : orderType === "takeaway" ? "Mang đi" : "Giao hàng"}
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="h-12 px-5 bg-[#ee4d2d] hover:bg-[#d83f23] text-white rounded-xl font-black text-[11px] uppercase tracking-wide active:scale-[0.97] transition-all shadow-md shadow-[#ee4d2d]/20 disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {orderType === "delivery" ? "👉 Đặt ngay" : orderType === "dine-in" ? "⚡ Đặt món" : "🛍️ Đặt đi"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Success & Payment Overlay */}
      {lastOrderNumber && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col p-4 sm:p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
          <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-md mx-auto w-full">
            {/* Receipt Ticket Container */}
            <div className="w-full bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 relative overflow-hidden flex flex-col items-center">
              {/* Zigzag serrated edge top */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#F1F5F9_33.333%,#F1F5F9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#F1F5F9_33.333%,#F1F5F9_66.667%,transparent_66.667%)] bg-[size:10px_10px] bg-repeat-x opacity-40" />

              {/* Common Branding Header */}
              <div className="flex flex-col items-center mb-6 mt-2">
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-primary blur-2xl opacity-10 animate-pulse" />
                  <BrandMark size="md" className="relative shadow-lg" />
                </div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">{brand.name}</h1>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">{brand.categoriesTagline}</p>
              </div>

              {paymentStatus === "paid" ? (
                <div className="space-y-5 animate-in zoom-in duration-500 w-full text-center">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                    <div className="relative w-full h-full bg-green-500 rounded-[28px] flex items-center justify-center shadow-xl shadow-green-200">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900">Đã nhận tiền!</h2>
                    <p className="text-gray-500 font-bold text-sm">Cảm ơn bạn, bếp đang bắt đầu làm món cho đơn <span className="text-primary">#{lastOrderNumber}</span>.</p>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-4" />

                  {lastOrder && (
                    <div className="text-left space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Biên nhận thanh toán</p>
                          <p className="mt-0.5 text-base font-black text-gray-900">Đơn hàng {lastOrder.number}</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider">
                          Thành công
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-left">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Thời gian</p>
                          <p className="mt-0.5 text-xs font-bold text-gray-900">{formatOrderTime(lastOrder.createdAt)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-left">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Hình thức</p>
                          <p className="mt-0.5 text-xs font-bold text-gray-900">{lastOrder.paymentMethod}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/50">
                        <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Chi tiết sản phẩm</p>
                          <p className="text-[10px] font-black text-gray-400">{lastOrder.itemCount} món</p>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                          {lastOrder.items.map((item) => (
                            <div key={item.id} className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs">
                              <div>
                                <p className="font-bold text-gray-900">
                                  {item.quantity} x {item.name}
                                </p>
                                {item.variantName && (
                                  <p className="mt-0.5 text-[10px] font-semibold text-gray-400">{item.variantName}</p>
                                )}
                              </div>
                              <p className="font-black text-gray-900 whitespace-nowrap">
                                {formatPrice(item.totalPrice)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-md">
                        <div className="text-left">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Tổng thanh toán</p>
                          <p className="mt-0.5 text-[10px] font-bold text-white/70">
                            {orderTypeLabel[lastOrder.orderType]}
                          </p>
                        </div>
                        <p className="text-xl font-black whitespace-nowrap">{formatPrice(lastOrder.total)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom duration-500">
                  <h2 className="text-2xl font-black text-center leading-tight tracking-tighter">
                    {lastOrder?.paymentMethod.includes("Chuyển khoản") || lastOrder?.paymentMethod.includes("VietQR") 
                      ? "Chờ quét mã QR..." 
                      : "Nhận đơn thành công!"}
                  </h2>
                  <div className="mt-2.5 px-4 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm">
                    MÃ ĐƠN {lastOrderNumber}
                  </div>

                  <div className="border-t border-dashed border-slate-200 w-full my-4" />

                  <div className="w-full flex flex-col items-center space-y-4">
                    {lastOrder?.paymentMethod.includes("Chuyển khoản") || lastOrder?.paymentMethod.includes("VietQR") ? (
                      <>
                        <div className="bg-white p-4.5 rounded-[28px] shadow-lg ring-1 ring-slate-100 relative group">
                          <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-[34px] blur opacity-40 animate-pulse" />
                          <img 
                            src={`https://img.vietqr.io/image/${brand.bankId}-${brand.bankAccount}-compact2.jpg?amount=${lastOrderTotal}&addInfo=${encodeURIComponent(`MOKA ${lastOrderNumber}`)}&accountName=${encodeURIComponent(brand.bankAccountName)}`}
                            alt="VietQR"
                            className="relative w-56 h-56 object-contain rounded-lg"
                          />
                        </div>

                        <div className="w-full space-y-3">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Tổng số tiền</span>
                            <span className="text-lg font-black text-primary">{formatPrice(lastOrderTotal)}</span>
                          </div>
                          
                          <button 
                            onClick={handleOpenBankApp}
                            className="w-full h-13 bg-primary text-white rounded-xl font-black text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            MỞ NHANH APP NGÂN HÀNG
                          </button>

                          <div className="grid grid-cols-3 gap-2">
                            <button 
                              onClick={() => handleDownloadQR(`https://img.vietqr.io/image/${brand.bankId}-${brand.bankAccount}-compact2.jpg?amount=${lastOrderTotal}&addInfo=${encodeURIComponent(`MOKA ${lastOrderNumber}`)}&accountName=${encodeURIComponent(brand.bankAccountName)}`)}
                              className="h-11 bg-white border border-slate-200 rounded-xl font-bold text-[9px] text-slate-600 flex flex-col items-center justify-center gap-0.5 active:bg-slate-50 transition-all shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" /> <span>Lưu mã QR</span>
                            </button>
                            <button 
                              onClick={() => handleCopy(brand.bankAccount, "Số tài khoản")}
                              className="h-11 bg-white border border-slate-200 rounded-xl font-bold text-[9px] text-slate-600 flex flex-col items-center justify-center gap-0.5 active:bg-slate-50 transition-all shadow-sm"
                            >
                              <Copy className="w-3.5 h-3.5" /> <span>Copy STK</span>
                            </button>
                            <button 
                              onClick={() => handleCopy(`MOKA ${lastOrderNumber}`, "Nội dung")}
                              className="h-11 bg-white border border-slate-200 rounded-xl font-bold text-[9px] text-slate-600 flex flex-col items-center justify-center gap-0.5 active:bg-slate-50 transition-all shadow-sm"
                            >
                              <Copy className="w-3.5 h-3.5" /> <span>Copy ND</span>
                            </button>
                          </div>

                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex flex-col text-left">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Nội dung CK</span>
                              <span className="text-sm font-black text-slate-800">MOKA {lastOrderNumber}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Hết hạn sau</span>
                              <span className="text-xs font-black text-rose-500 animate-pulse">{formatCountdown(countdown)}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full space-y-5 py-2">
                        <div className="relative mx-auto w-20 h-20">
                          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-10" />
                          <div className="relative w-full h-full bg-primary/10 rounded-full flex items-center justify-center">
                            <Wallet className="w-8 h-8 text-primary" />
                          </div>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Số tiền cần thanh toán</p>
                          <p className="text-2xl font-black text-primary">{formatPrice(lastOrderTotal)}</p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs text-primary font-bold leading-relaxed text-center shadow-inner">
                          {orderType === "delivery" 
                            ? "Shipper sẽ thu tiền mặt khi giao hàng tận nơi." 
                            : "Bạn vui lòng thanh toán tiền mặt tại quầy thu ngân."}
                        </div>
                      </div>
                    )}

                    {lastOrder && (
                      <div className="w-full pt-4 border-t border-dashed border-gray-200 mt-1">
                        <div className="flex items-center justify-between mb-3 px-1 text-left">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Chi tiết món</span>
                          <span className="text-[9px] font-black text-gray-400">{lastOrder.itemCount} món</span>
                        </div>
                        <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1 no-scrollbar text-left">
                          {lastOrder.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-start gap-3 text-xs">
                              <div className="flex-1">
                                <p className="font-bold text-gray-800 leading-tight">{item.quantity} x {item.name}</p>
                                {item.variantName && (
                                  <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.variantName}</p>
                                )}
                              </div>
                              <span className="font-black text-gray-900">{formatPrice(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Barcode style simulating a physical receipt paper */}
              <div className="flex flex-col items-center mt-6 pt-4 border-t border-slate-100 w-full opacity-60">
                <div className="h-8 w-44 bg-[repeating-linear-gradient(90deg,#000,#000_1.5px,#fff_1.5px,#fff_5px)]" />
                <span className="text-[9px] font-mono tracking-[0.25em] mt-1.5">MOKA-ORDER-{lastOrderNumber}</span>
              </div>

              {/* Zigzag serrated edge bottom */}
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#F1F5F9_33.333%,#F1F5F9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#F1F5F9_33.333%,#F1F5F9_66.667%,transparent_66.667%)] bg-[size:10px_10px] bg-repeat-x opacity-40 rotate-180" />
            </div>


            {/* Shared Footer Actions */}
            <div className="w-full mt-8 space-y-4">
              <div className="text-center py-4 px-6 bg-primary/5 rounded-[32px] border border-primary/10">
                <p className="text-xs font-bold text-gray-500 italic">"Cảm ơn bạn đã lựa chọn {brand.name}. Chúc bạn một bữa ăn ngon miệng!"</p>
              </div>

              <div className="w-full">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `🥗 ${brand.name} - Thưởng thức vị ngon nguyên bản`,
                        text: `Mình vừa chốt đơn tại ${brand.name} 🥗. Đồ ăn ở đây cực phẩm luôn, mọi người ghé thử nhé! ✨ (Mã đơn: ${lastOrderNumber})`,
                        url: window.location.origin
                      }).catch(() => {});
                    } else {
                      handleCopy(window.location.origin, "Link cửa hàng");
                    }
                  }}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-xs active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  CHIA SẺ ĐƠN HÀNG
                </button>
              </div>

              <button 
                onClick={handleCloseOrderOverlay}
                className="w-full h-16 bg-black text-white rounded-3xl font-black text-sm active:scale-95 transition-all shadow-xl"
              >
                XONG • QUAY LẠI TRANG CHỦ
              </button>

              {paymentStatus !== "paid" && (
                <button
                  onClick={handleEditOrder}
                  className="w-full h-14 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs active:scale-95 transition-all"
                >
                  QUAY LẠI CHỈNH SỬA
                </button>
              )}

              <a
                href={`tel:${storePhoneLink}`}
                className="flex items-center justify-center h-12 bg-white border border-gray-100 rounded-xl font-bold text-[10px] text-gray-400"
              >
                Cần hỗ trợ? Gọi {brand.storePhoneDisplay}
              </a>
            </div>

          </div>
        </div>
      )}

      {/* Product Customizer Overlay */}
      {selectedProduct && (
        <ProductCustomizer
          product={selectedProduct}
          onAdd={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default OnlineOrder;
