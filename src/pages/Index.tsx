import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FlaskConical,
  LogIn,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Wallet,
  Printer,
  Trash2,
  Clock,
  Bell,
  Loader2,
  Tag,
  Award,
  Pencil,
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLockup, BrandMark } from "@/components/brand/BrandMark";
import CategoryBar from "@/components/pos/CategoryBar";
import ProductGrid from "@/components/pos/ProductGrid";
import ProductCustomizer from "@/components/pos/ProductCustomizer";
import Cart from "@/components/pos/Cart";
import PaymentDialog from "@/components/pos/PaymentDialog";
import { QRCodeDialog } from "@/components/pos/QRCodeDialog";
import { PrintTemplates } from "@/components/pos/PrintTemplates";
import { qzService } from "@/lib/qz-service";
import { androidPrint } from "@/lib/android-print";
import { useInventory } from "@/lib/inventory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type CartItem, type OrderType, type Product } from "@/data/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { useCatalog } from "@/lib/catalog";
import { DEFAULT_DISCOUNT, calculateDiscountSummary } from "@/lib/discounts";
import { createKitchenOrder, type KitchenOrder, useKitchenOrdersSnapshot, updateKitchenOrderPaymentStatus, cancelKitchenOrder, updateKitchenOrderReleaseStatus, updateKitchenOrder } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

type PrintPayload = {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  discountAmount: number;
  paymentMethod: string;
  orderType: OrderType;
  orderInfo: string;
  createdAt: string;
  paymentStatus: "pending" | "paid";
};

type PendingQrPayment = {
  order: KitchenOrder;
  items: CartItem[];
  subtotal: number;
  total: number;
  discountAmount: number;
  orderType: OrderType;
  orderInfo: string;
  paymentMethod: string;
};

const mapKitchenItemsToCartItems = (items: any[], productsList: Product[]): CartItem[] => {
  return items.map((item) => {
    const product = productsList.find((p) => p.id === item.productId) || {
      id: item.productId,
      name: item.name,
      price: item.unitPrice || (item.totalPrice / item.quantity),
      categoryId: "an-vat",
      image: item.image || "",
    };

    const variant = item.variantName 
      ? product.variants?.find((v: any) => v.name === item.variantName)
      : undefined;

    const selectedOptions = (item.optionsDetail || []).map((opt: any) => {
      let optionId = "";
      let choiceId = "";
      for (const o of product.options || []) {
        const choice = o.choices.find((c: any) => c.name === opt.name);
        if (choice) {
          optionId = o.id;
          choiceId = choice.id;
          break;
        }
      }
      return {
        optionId,
        choiceId,
        name: opt.name,
        priceAdd: opt.price,
      };
    });

    return {
      id: item.id || crypto.randomUUID(),
      product,
      variant,
      selectedOptions,
      note: item.note || "",
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    };
  });
};

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const Index = () => {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { isConfigured, products, categories, isLoading } = useCatalog();
  const { ingredients, recipes } = useInventory();

  const [editingOrder, setEditingOrder] = useState<KitchenOrder | null>(null);

  // Restore editing order from localStorage when products are loaded
  useEffect(() => {
    if (products.length === 0) {
      return;
    }
    const stored = localStorage.getItem("speedy-order-system:editing-order");
    if (stored) {
      try {
        const order = JSON.parse(stored) as KitchenOrder;
        setEditingOrder(order);
        
        const cartItems = mapKitchenItemsToCartItems(order.items, products);
        setCart(cartItems);
        
        if (order.discountType) {
          setDiscount({
            type: order.discountType,
            value: order.discountValue,
            code: "",
          });
        } else {
          setDiscount(DEFAULT_DISCOUNT);
        }
      } catch (e) {
        console.error("Lỗi khôi phục đơn hàng đang sửa:", e);
      }
    }
  }, [products]);

  const handleCancelEdit = () => {
    setCart([]);
    setDiscount(DEFAULT_DISCOUNT);
    setEditingOrder(null);
    localStorage.removeItem("speedy-order-system:editing-order");
    toast.info("Đã hủy chế độ sửa đơn");
  };


  const outOfStockMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    products.forEach((product) => {
      map[product.id] = false;
    });
    return map;
  }, [products]);
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(DEFAULT_DISCOUNT);
  const [payment, setPayment] = useState<{
    orderType: OrderType;
    info: string;
    loyaltyData?: { customerPhone: string; customerName: string; spentPoints: number };
  } | null>(null);
  const [printData, setPrintData] = useState<PrintPayload | null>(null);
  const [printMode, setPrintMode] = useState<"bill" | "stickers" | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [pendingQrPayment, setPendingQrPayment] = useState<PendingQrPayment | null>(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [payingDraftOrder, setPayingDraftOrder] = useState<KitchenOrder | null>(null);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { orders } = useKitchenOrdersSnapshot();
  const printRef = useRef<HTMLDivElement>(null);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) => o.paymentStatus === "pending" && o.kitchenReleaseStatus === "released" && o.status !== "cancelled"
    );
  }, [orders]);

  const approvalOrders = useMemo(() => {
    return orders.filter(
      (o) => o.kitchenReleaseStatus === "hold" && o.status !== "cancelled"
    );
  }, [orders]);

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      
      // Beep 1
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      // Beep 2
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Chime playback error:", e);
    }
  };

  const notifiedOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (orders.length === 0) return;

    if (isFirstLoad.current) {
      approvalOrders.forEach((order) => notifiedOrderIds.current.add(order.id));
      isFirstLoad.current = false;
      return;
    }

    let hasNewApproval = false;
    approvalOrders.forEach((order) => {
      if (!notifiedOrderIds.current.has(order.id)) {
        notifiedOrderIds.current.add(order.id);
        hasNewApproval = true;
      }
    });

    if (hasNewApproval) {
      playChimeSound();
      toast.info("Có đơn đặt online mới chờ duyệt!", {
        description: "Vui lòng kiểm tra danh sách chờ duyệt.",
        duration: 5000,
      });
    }
  }, [approvalOrders, orders]);

  const handleApproveOnlineOrder = async (order: KitchenOrder) => {
    setUpdatingOrderId(order.id);
    try {
      await updateKitchenOrderReleaseStatus(order.id, "released");
      toast.success(`Đã duyệt đơn ${order.number} thành công!`);
      
      // Trigger in hóa đơn & tem tự động
      startPrintSequence({
        orderNumber: order.number,
        items: order.items.map((item) => ({
          id: item.id,
          product: {
            id: item.productId,
            name: item.name,
            price: item.totalPrice / item.quantity,
            image: item.image || "",
            status: "active",
            categoryId: "",
          },
          quantity: item.quantity,
          selectedOptions: item.options.map((optName) => ({
            optionId: "",
            choiceId: "",
            name: optName,
            price: 0,
          })),
          note: item.note || "",
          totalPrice: item.totalPrice,
        })),
        subtotal: order.subtotal,
        total: order.total,
        discountAmount: order.discountAmount,
        paymentMethod: order.paymentMethod,
        orderType: order.orderType,
        orderInfo: order.orderInfo,
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
      });
    } catch (e) {
      toast.error("Không thể duyệt đơn: " + ((e as any)?.message || String(e) || "Lỗi hệ thống"));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRejectOnlineOrder = async (order: KitchenOrder) => {
    if (!window.confirm(`Bạn có chắc chắn muốn từ chối và hủy đơn online ${order.number}?`)) {
      return;
    }
    setUpdatingOrderId(order.id);
    try {
      await cancelKitchenOrder(order.id, "Thu ngân từ chối đơn");
      toast.success(`Đã từ chối đơn ${order.number}`);
    } catch (e) {
      toast.error("Không thể từ chối đơn: " + ((e as any)?.message || String(e) || "Lỗi hệ thống"));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeCategory = categories.some((item) => item.id === category)
    ? category
    : categories[0]?.id || "";

  const buildCartItemSignature = (
    item: Pick<CartItem, "product" | "variant" | "selectedOptions" | "note">,
  ) => {
    const optionsKey = [...item.selectedOptions]
      .map((option) => `${option.optionId}:${option.choiceId}`)
      .sort()
      .join("|");

    return [item.product.id, item.variant?.id || "", item.note.trim(), optionsKey].join("::");
  };

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

  const handleProductSelect = (product: Product) => {
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
    toast.success(`Đã thêm ${product.name}`);
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((previous) => mergeCartItem(previous, item));
    setSelectedProduct(null);
    toast.success(`Đã thêm ${item.product.name}`);
  };

  const handleCheckout = async (
    orderType: OrderType,
    info: string,
    loyaltyData?: { customerPhone: string; customerName: string; spentPoints: number }
  ) => {
    const payload = { orderType, info, loyaltyData };
    await handleConfirmPayment("cash", payload);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountSummary = calculateDiscountSummary(subtotal, discount);
  const total = discountSummary.total;

  useEffect(() => {
    if (cart.length === 0 && discount.value !== 0) {
      setDiscount(DEFAULT_DISCOUNT);
    }
  }, [cart.length, discount.value]);

  const handleClearCart = () => {
    setCart([]);
    setDiscount(DEFAULT_DISCOUNT);
  };

  const handleInventoryWarnings = (
    lowStockIngredients: {
      id: string;
      name: string;
      stockQuantity: number;
      lowStockThreshold: number;
      unit: string;
    }[],
    inventoryError: string | null,
  ) => {
    if (lowStockIngredients.length > 0) {
      toast.warning("Nguyên liệu sắp hết", {
        description: lowStockIngredients
          .slice(0, 3)
          .map((ingredient) => `${ingredient.name}: ${ingredient.stockQuantity} ${ingredient.unit}`)
          .join(" • "),
      });
    }

    if (inventoryError) {
      toast.warning("Đơn đã lưu nhưng tồn kho chưa cập nhật", {
        description: inventoryError,
      });
    }
  };

  const startPrintSequence = (payload: PrintPayload) => {
    setPrintData(payload);
    setPrintMode("bill");
  };

  const handleConfirmPayment = async (method: "cash" | "qr" | "draft", overridePayment?: any) => {
    const activePayment = overridePayment || payment;
    if (!activePayment || cart.length === 0 || isSubmitting) {
      return;
    }

    if (method === "qr" && !supabase) {
      toast.error("QR POS cần Supabase online", {
        description: "Hãy bật Supabase để hệ thống chờ webhook n8n xác nhận thanh toán.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cartSnapshot = [...cart];
      const paymentSnapshot = activePayment;
      const subtotalSnapshot = subtotal;
      
      const pointsDiscount = paymentSnapshot.loyaltyData?.spentPoints
        ? paymentSnapshot.loyaltyData.spentPoints
        : 0;

      const totalSnapshot = Math.max(0, total - pointsDiscount);
      const discountAmountSnapshot = discountSummary.amount + pointsDiscount;
      
      const normalizedPaymentLabel =
        method === "cash" 
          ? "Tiền mặt" 
          : method === "draft" 
            ? "Thanh toán sau" 
            : "Chuyển khoản QR - MBBank";

      const orderPayload = {
        items: cartSnapshot,
        subtotal: subtotalSnapshot,
        total: totalSnapshot,
        orderType: paymentSnapshot.orderType,
        orderInfo: paymentSnapshot.info || editingOrder?.orderInfo || "",
        paymentMethod: normalizedPaymentLabel,
        paymentStatus: (method === "draft" ? "pending" : method === "cash" ? "paid" : "pending") as any,
        kitchenReleaseStatus: "released" as const,
        discountAmount: discountAmountSnapshot,
        discountType: discountSummary.type || (pointsDiscount > 0 ? "amount" : null),
        discountValue: discountSummary.value || pointsDiscount,
        customerPhone: paymentSnapshot.loyaltyData?.customerPhone,
        customerName: paymentSnapshot.loyaltyData?.customerName,
        spentPoints: paymentSnapshot.loyaltyData?.spentPoints,
        orderSource: "pos" as const,
      };

      const result = editingOrder 
        ? await updateKitchenOrder(editingOrder.id, orderPayload)
        : await createKitchenOrder(orderPayload);

      const { order, lowStockIngredients, inventoryError } = result;

      setCart([]);
      setDiscount(DEFAULT_DISCOUNT);
      setPayment(null);

      if (editingOrder) {
        setEditingOrder(null);
        localStorage.removeItem("speedy-order-system:editing-order");
      }

      if (method === "qr") {
        handleInventoryWarnings(lowStockIngredients, inventoryError);
        setPendingQrPayment({
          order,
          items: cartSnapshot,
          subtotal: subtotalSnapshot,
          total: totalSnapshot,
          discountAmount: discountAmountSnapshot,
          orderType: paymentSnapshot.orderType,
          orderInfo: paymentSnapshot.info,
          paymentMethod: normalizedPaymentLabel,
        });

        // Trigger in hóa đơn tạm tính chứa mã QR & tem dán ly ngay lập tức
        startPrintSequence({
          orderNumber: order.number,
          items: cartSnapshot,
          subtotal: subtotalSnapshot,
          total: totalSnapshot,
          discountAmount: discountAmountSnapshot,
          paymentMethod: normalizedPaymentLabel,
          orderType: paymentSnapshot.orderType,
          orderInfo: paymentSnapshot.info,
          createdAt: order.createdAt,
          paymentStatus: "pending",
        });

        toast.success("Đã tạo đơn QR và in bill tạm tính", {
          description: `Đơn ${order.number} đang chờ n8n xác nhận chuyển khoản.`,
        });
        return;
      }

      if (method === "draft") {
        handleInventoryWarnings(lowStockIngredients, inventoryError);
        toast.success("Lưu đơn tạm thành công", {
          description: `Đơn ${order.number} đã được lưu tạm và chuyển xuống bếp.`,
        });
        
        // Chỉ kích hoạt luồng in tem pha chế cho bếp
        setPrintData({
          orderNumber: order.number,
          items: cartSnapshot,
          subtotal: subtotalSnapshot,
          total: totalSnapshot,
          discountAmount: discountAmountSnapshot,
          paymentMethod: normalizedPaymentLabel,
          orderType: paymentSnapshot.orderType,
          orderInfo: paymentSnapshot.info,
          createdAt: order.createdAt,
          paymentStatus: "pending",
        });
        setPrintMode("stickers");
        return;
      }

      toast.success("Thanh toán thành công", {
        description: `${order.number} đã chuyển sang màn hình bếp`,
      });

      // Trigger print sequence (in bill trước, sau đó in tem dán)
      startPrintSequence({
        orderNumber: order.number,
        items: cartSnapshot,
        subtotal: subtotalSnapshot,
        total: totalSnapshot,
        discountAmount: discountAmountSnapshot,
        paymentMethod: normalizedPaymentLabel,
        orderType: paymentSnapshot.orderType,
        orderInfo: paymentSnapshot.info,
        createdAt: order.createdAt,
        paymentStatus: "paid",
      });

      handleInventoryWarnings(lowStockIngredients, inventoryError);
    } catch (error) {
      toast.error("Không thể lưu đơn hàng", {
        description:
          error instanceof Error ? error.message : "Vui lòng kiểm tra cấu hình Supabase.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Printing sequence effect
  useEffect(() => {
    const handlePrint = async () => {
      if (!printData || !printMode) return;

      // Chờ React Portal gắn DOM thành công nếu ref chưa sẵn sàng
      if (!printRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!printRef.current) {
          console.warn("Vùng in printRef.current vẫn trống sau thời gian chờ.");
        }
      }

      // Add class for CSS targeting of @page size (legacy/manual fallback)
      document.body.classList.add(`printing-${printMode}`);
      
      try {
        // Try to use QZ Tray for silent printing if available
        const useQZ = localStorage.getItem("qz-enabled") === "true";

        const isAndroid = androidPrint.isAndroid();
        const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;

        let billPrinter = localStorage.getItem("qz-bill-printer") || "";
        let stickerPrinter = localStorage.getItem("qz-sticker-printer") || "";

        if (isElectron) {
          try {
            const printers = await (window as any).electronAPI.getPrinters();
            const printerNames = printers.map((p: any) => p.name.trim().toLowerCase());
            
            const targetBill = billPrinter.trim().toLowerCase();
            const targetSticker = stickerPrinter.trim().toLowerCase();
            
            if (billPrinter && !printerNames.includes(targetBill)) {
              console.warn(`Configured bill printer "${billPrinter}" not found on system. Falling back to default printer.`);
              billPrinter = "";
            }
            if (stickerPrinter && !printerNames.includes(targetSticker)) {
              console.warn(`Configured sticker printer "${stickerPrinter}" not found on system. Falling back to default printer.`);
              stickerPrinter = "";
            }
          } catch (e) {
            console.error("Failed to check system printers:", e);
          }
        } else {
          // Fallback placeholders for non-Electron if not configured
          if (!billPrinter) billPrinter = "Bill";
          if (!stickerPrinter) stickerPrinter = "Sticker";
        }

        if (isAndroid && useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          
          // Small delay to ensure React has rendered the template
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await androidPrint.printHTML(printRef.current.innerHTML, printerName);
          
          // Success, move to next mode
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("Đã in đơn hàng tự động trên máy POS Android!");
          }
        } else if (isElectron && useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          
          toast.info(`Đang tự động in ${printMode === "bill" ? "Hóa đơn" : "Tem dán"} qua máy in: ${printerName || "Máy in mặc định"}`);
          
          // Small delay to ensure React has rendered the template
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Clone all styles (CSS classes) from current document using absolute URLs
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => {
              if (s.tagName.toLowerCase() === 'link') {
                return `<link rel="stylesheet" href="${(s as HTMLLinkElement).href}">`;
              }
              return s.outerHTML;
            })
            .join('\n');
          
          const fullHtml = `
            <html>
              <head>
                ${styles}
                <style>
                  body { margin: 0; padding: 0; background: white; }
                  .momoka-print-container { display: block !important; }
                </style>
              </head>
              <body>
                <div id="print-root">
                  ${printRef.current.innerHTML}
                </div>
              </body>
            </html>
          `;
          
          const widthMm = printMode === "bill" ? (localStorage.getItem("print-bill-width") || "80") : (localStorage.getItem("print-sticker-width") || "50");
          const heightMm = printMode === "bill" ? "297" : (localStorage.getItem("print-sticker-height") || "30");
          await (window as any).electronAPI.printHTML(fullHtml, printerName, Number(widthMm), Number(heightMm));
          
          // Success, move to next mode
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("Đã in đơn hàng tự động thành công!");
          }
        } else if (useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          
          // Small delay to ensure React has rendered the template
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await qzService.printElement(printerName, printRef.current);
          
          // Success, move to next mode
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("Đã gửi lệnh in thành công");
          }
        } else {
          // Fallback to manual browser print
          const timer = setTimeout(() => {
            window.print();
            
            document.body.classList.remove(`printing-${printMode}`);

            if (printMode === "bill") {
              setPrintMode("stickers");
            } else {
              setPrintMode(null);
              setPrintData(null);
            }
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Print error:", err);
        const printerName = isAndroid 
          ? "Android RawBT" 
          : isElectron 
            ? "Electron" 
            : "QZ Tray";
        toast.error(`Lỗi in ấn ${printerName}`, {
          description: "Đang chuyển sang chế độ in thủ công..."
        });
        // Fallback to manual
        window.print();
        if (printMode === "bill") {
          setPrintMode("stickers");
        } else {
          setPrintMode(null);
          setPrintData(null);
        }
      }
    };

    handlePrint();

    return () => {
      document.body.classList.remove("printing-bill", "printing-stickers");
    };
  }, [printData, printMode]);

  useEffect(() => {
    if (!pendingQrPayment || !supabase) {
      return;
    }

    const channel = supabase
      .channel(`pos-payment-${pendingQrPayment.order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "anvat_orders",
          filter: `id=eq.${pendingQrPayment.order.id}`,
        },
        (payload) => {
          if (payload.new.payment_status !== "paid") {
            return;
          }

          toast.success("Đã nhận thanh toán QR", {
            description: `${pendingQrPayment.order.number} đã sẵn sàng để in và chuyển bếp.`,
          });

          startPrintSequence({
            orderNumber: pendingQrPayment.order.number,
            items: pendingQrPayment.items,
            subtotal: pendingQrPayment.subtotal,
            total: pendingQrPayment.total,
            discountAmount: pendingQrPayment.discountAmount,
            paymentMethod: pendingQrPayment.paymentMethod,
            orderType: pendingQrPayment.orderType,
            orderInfo: pendingQrPayment.orderInfo,
            createdAt: pendingQrPayment.order.createdAt,
            paymentStatus: "paid",
          });
          setPendingQrPayment(null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingQrPayment]);

  const pendingQrImageUrl = pendingQrPayment
    ? `https://img.vietqr.io/image/${brand.bankId}-${brand.bankAccount}-compact2.jpg?amount=${pendingQrPayment.total}&addInfo=${encodeURIComponent(`MOKA ${pendingQrPayment.order.number}`)}&accountName=${encodeURIComponent(brand.bankAccountName)}`
    : "";

  const handleClosePendingQr = () => {
    setPendingQrPayment(null);
  };

  const handleCopyPendingValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error(`Không thể sao chép ${label.toLowerCase()}`);
    }
  };

  const handleDownloadPendingQr = () => {
    if (!pendingQrImageUrl || !pendingQrPayment) {
      return;
    }

    const link = document.createElement("a");
    link.href = pendingQrImageUrl;
    link.download = `QR-${pendingQrPayment.order.number.replace(/\D/g, "")}.jpg`;
    link.click();
    toast.success("Đã tải mã QR thanh toán");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Đã đăng xuất");
    } catch (error) {
      toast.error("Không thể đăng xuất", {
        description: error instanceof Error ? error.message : "Có lỗi xảy ra.",
      });
    }
  };

  const handlePrintDraftReceipt = (order: KitchenOrder) => {
    startPrintSequence({
      orderNumber: order.number,
      items: order.items.map((item) => ({
        id: item.id,
        product: {
          id: item.productId,
          name: item.name,
          price: item.totalPrice / item.quantity,
          image: item.image || "",
          status: "active",
          categoryId: "",
        },
        quantity: item.quantity,
        selectedOptions: item.options.map((optName) => ({
          optionId: "",
          choiceId: "",
          name: optName,
          price: 0,
        })),
        note: item.note || "",
        totalPrice: item.totalPrice,
      })),
      subtotal: order.subtotal,
      total: order.total,
      discountAmount: order.discountAmount,
      paymentMethod: order.paymentMethod,
      orderType: order.orderType,
      orderInfo: order.orderInfo,
      createdAt: order.createdAt,
      paymentStatus: "pending",
    });
    toast.success(`Đang in phiếu tạm tính cho đơn ${order.number}`);
  };

  const handleEditDraftOrder = (order: KitchenOrder) => {
    const cartItems = mapKitchenItemsToCartItems(order.items, products);
    setCart(cartItems);

    if (order.discountType) {
      setDiscount({
        type: order.discountType,
        value: order.discountValue,
        code: "",
      });
    } else {
      setDiscount(DEFAULT_DISCOUNT);
    }

    setEditingOrder(order);
    localStorage.setItem("speedy-order-system:editing-order", JSON.stringify(order));
    setDraftsOpen(false);

    toast.success(`Đang sửa đơn tạm ${order.number}`, {
      description: "Thay đổi món rồi thanh toán/lưu để cập nhật.",
    });
  };

  const handleCancelDraftOrder = async (order: KitchenOrder) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn tạm ${order.number} và trả lại nguyên liệu vào kho?`)) {
      return;
    }

    try {
      await cancelKitchenOrder(order.id, "Thu ngân hủy đơn tạm");
      toast.success(`Đã hủy thành công đơn tạm ${order.number}`);
    } catch (e) {
      toast.error("Không thể hủy đơn: " + ((e as any)?.message || String(e) || "Lỗi hệ thống"));
    }
  };

  const handleConfirmPayingDraftOrder = async (method: "cash" | "qr" | "draft", overrideOrder?: any) => {
    const activeOrder = overrideOrder || payingDraftOrder;
    if (!activeOrder || isSubmitting) return;
    
    setIsSubmitting(true);
    const order = activeOrder;
    const normalizedPaymentLabel =
      method === "cash" 
        ? "Tiền mặt" 
        : "Chuyển khoản QR - VietinBank";

    try {
      if (method === "qr") {
        await updateKitchenOrderPaymentStatus(order.id, "pending", normalizedPaymentLabel);
        
        setPendingQrPayment({
          order: { ...order, paymentMethod: normalizedPaymentLabel },
          items: order.items.map((item) => ({
            id: item.id,
            product: {
              id: item.productId,
              name: item.name,
              price: item.totalPrice / item.quantity,
              image: item.image || "",
              status: "active",
              categoryId: "",
            },
            quantity: item.quantity,
            selectedOptions: item.options.map((optName) => ({
              optionId: "",
              choiceId: "",
              name: optName,
              price: 0,
            })),
            note: item.note || "",
            totalPrice: item.totalPrice,
          })),
          subtotal: order.subtotal,
          total: order.total,
          discountAmount: order.discountAmount,
          orderType: order.orderType,
          orderInfo: order.orderInfo,
          paymentMethod: normalizedPaymentLabel,
        });
        
        setPayingDraftOrder(null);
        toast.success("Đã tạo đơn QR thanh toán");
        return;
      }

      await updateKitchenOrderPaymentStatus(order.id, "paid", normalizedPaymentLabel);
      
      toast.success("Thanh toán thành công đơn " + order.number);
      setPayingDraftOrder(null);

      startPrintSequence({
        orderNumber: order.number,
        items: order.items.map((item) => ({
          id: item.id,
          product: {
            id: item.productId,
            name: item.name,
            price: item.totalPrice / item.quantity,
            image: item.image || "",
            status: "active",
            categoryId: "",
          },
          quantity: item.quantity,
          selectedOptions: item.options.map((optName) => ({
            optionId: "",
            choiceId: "",
            name: optName,
            price: 0,
          })),
          note: item.note || "",
          totalPrice: item.totalPrice,
        })),
        subtotal: order.subtotal,
        total: order.total,
        discountAmount: order.discountAmount,
        paymentMethod: normalizedPaymentLabel,
        orderType: order.orderType,
        orderInfo: order.orderInfo,
        createdAt: order.createdAt,
        paymentStatus: "paid",
      });
    } catch (e) {
      toast.error("Không thể hoàn tất thanh toán: " + ((e as any)?.message || String(e) || "Lỗi hệ thống"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabel = isConfigured ? "Supabase online" : "Chế độ local";

  const navigationLinks = [
    { to: "/orders-history", title: "Lịch sử đơn", icon: ClipboardList },
    { to: "/cashbook", title: "Thu chi", icon: Wallet },
    { to: "/inventory", title: "Tồn kho", icon: FlaskConical },
    { to: "/loyalty", title: "Điểm TV", icon: Award },
    { to: "/reports", title: "Báo cáo", icon: BarChart3 },
    { to: "/promotions", title: "Khuyến mãi", icon: Tag },
    { to: "/admin", title: "Quản lý", icon: Settings },
  ] as const;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {isMobile ? (
        <header className="shrink-0 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size="sm" className="shrink-0" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-foreground">{brand.productName}</h1>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${isConfigured ? "bg-success" : "bg-warning"}`}
                  />
                  <span className="truncate">{statusLabel}</span>
                </div>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="shrink-0 rounded-xl border border-border bg-background p-2.5 text-muted-foreground"
                  aria-label="Mở menu điều hướng"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[84vw] max-w-[340px] border-border bg-card px-4 py-5">
                <SheetHeader className="text-left">
                  <SheetTitle>{brand.productName}</SheetTitle>
                  <SheetDescription>{statusLabel}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-2">
                   {navigationLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {item.title}
                        </Link>
                      </SheetClose>
                    );
                  })}
                  <SheetClose asChild>
                    <button
                      onClick={() => setDraftsOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm font-semibold text-warning transition-colors hover:bg-warning/10"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4" />
                        <span>Đơn tạm chờ thanh toán</span>
                      </div>
                      {pendingOrders.length > 0 && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">
                          {pendingOrders.length}
                        </span>
                      )}
                    </button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button
                      onClick={() => setApprovalsOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/[0.08]"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className={cn("h-4 w-4", approvalOrders.length > 0 && "animate-bounce text-rose-500")} />
                        <span>Đơn online chờ duyệt</span>
                      </div>
                      {approvalOrders.length > 0 && (
                        <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-black text-white animate-pulse">
                          {approvalOrders.length}
                        </span>
                      )}
                    </button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button
                      onClick={() => setQrOpen(true)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <QrCode className="h-4 w-4" />
                      QR Đặt món
                    </button>
                  </SheetClose>
                </div>


                <div className="mt-6 rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                  {user?.email}
                </div>

                <div className="mt-3">
                  <SheetClose asChild>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      ) : (
        <header className="shrink-0 border-b-2 border-border bg-card/95 px-3 py-2.5 backdrop-blur sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <BrandLockup
              eyebrow="Front Counter"
              title={brand.productName}
              subtitle={
                isConfigured
                  ? "Bán nhanh, bếp rõ, báo cáo tức thì. Momoka đang sẵn sàng."
                  : "Bán nhanh, bếp rõ, báo cáo tức thì. Đang chạy ở chế độ dữ liệu cục bộ."
              }
              size="sm"
              className="min-w-0 flex-1"
            />

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {/* User Dropdown Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border bg-background p-1 pr-3 shadow-sm hover:bg-muted transition-all">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-orange-500 text-[11px] font-black text-white uppercase">
                      {user?.email?.charAt(0) || "U"}
                    </div>
                    <div className="hidden flex-col items-start text-left md:flex">
                      <span className="max-w-[120px] truncate text-xs font-bold text-foreground leading-tight">
                        {user?.email?.split("@")[0] || "User"}
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        {statusLabel}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border p-1 bg-card shadow-xl">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-muted-foreground">
                    Tài khoản của bạn
                  </DropdownMenuLabel>
                  <div className="px-3 py-1.5 text-sm font-semibold text-foreground break-all">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2 text-xs text-muted-foreground flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">Thời gian hệ thống:</span>
                    <span>
                      {new Date().toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Action Buttons with text labels */}
              <button
                onClick={() => setApprovalsOpen(true)}
                className="relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Đơn online chờ duyệt"
              >
                <div className="relative">
                  <Bell className={cn("h-4.5 w-4.5", approvalOrders.length > 0 && "animate-bounce text-rose-500")} />
                  {approvalOrders.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-background animate-pulse">
                      {approvalOrders.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold leading-none">Chờ duyệt</span>
              </button>

              <button
                onClick={() => setDraftsOpen(true)}
                className="relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Danh sách đơn tạm"
              >
                <div className="relative">
                  <Clock className="h-4.5 w-4.5" />
                  {pendingOrders.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white ring-2 ring-background">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">Đơn tạm</span>
              </button>

              {navigationLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all hover:bg-muted text-muted-foreground hover:text-foreground"
                    title={item.title}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span className="text-[10px] font-medium leading-none">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <CategoryBar categories={categories} selected={activeCategory} onSelect={setCategory} />
          <ProductGrid
            categoryId={activeCategory}
            products={products}
            isLoading={isLoading}
            onSelect={handleProductSelect}
            outOfStockMap={outOfStockMap}
          />
        </div>

        <Cart
          items={cart}
          onRemove={(id) => setCart((previous) => previous.filter((item) => item.id !== id))}
          discount={discount}
          discountSummary={discountSummary}
          onDiscountChange={setDiscount}
          onClear={handleClearCart}
          onCheckout={handleCheckout}
          isSubmitting={isSubmitting}
          onUpdateQuantity={(id, newQty) => {
            setCart((previous) =>
              previous
                .map((item) => {
                  if (item.id === id) {
                    const unitPrice = item.totalPrice / item.quantity;
                    return {
                      ...item,
                      quantity: newQty,
                      totalPrice: unitPrice * newQty,
                    };
                  }
                  return item;
                })
                .filter((item) => item.quantity > 0)
            );
          }}
          initialOrderType={editingOrder?.orderType}
          initialCustomerPhone={editingOrder?.customerPhone || undefined}
          initialCustomerName={editingOrder?.customerName || undefined}
          initialOrderInfo={editingOrder?.orderInfo || undefined}
          editingOrderNumber={editingOrder?.number}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {selectedProduct ? (
        <ProductCustomizer
          product={selectedProduct}
          onAdd={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}

      {payment ? (
        <PaymentDialog
          items={cart}
          subtotal={subtotal}
          discountSummary={discountSummary}
          total={total}
          orderType={payment.orderType}
          orderInfo={payment.info}
          onConfirm={handleConfirmPayment}
          onClose={() => setPayment(null)}
          isSubmitting={isSubmitting}
        />
      ) : null}
      {pendingQrPayment ? (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
              <div className="rounded-[32px] border border-border bg-card p-6 shadow-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-warning">
                      <CreditCard className="h-3.5 w-3.5" />
                      Chờ thanh toán QR
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground">
                      {pendingQrPayment.order.number}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                      Khách quét mã này để chuyển khoản đúng nội dung đơn hàng. Hệ thống sẽ tự đóng màn này khi n8n xác nhận đã nhận tiền.
                    </p>
                  </div>

                  <button
                    onClick={handleClosePendingQr}
                    className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Đóng màn chờ
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[300px_1fr]">
                  <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
                    <img
                      src={pendingQrImageUrl}
                      alt="Mã QR thanh toán POS"
                      className="mx-auto aspect-square w-full max-w-[280px] rounded-2xl object-contain"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-muted/70 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Số tiền cần chuyển</div>
                      <div className="mt-2 text-3xl font-black text-primary">
                        {formatPrice(pendingQrPayment.total)}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Ngân hàng</div>
                        <div className="mt-1 text-base font-bold text-foreground">VietinBank</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Số tài khoản</div>
                        <div className="mt-1 text-base font-bold text-foreground">{brand.bankAccount}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Nội dung chuyển khoản</div>
                      <div className="mt-1 text-lg font-black text-foreground">
                        MOKA {pendingQrPayment.order.number}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={handleDownloadPendingQr}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        Lưu QR
                      </button>
                      <button
                        onClick={() => handleCopyPendingValue(brand.bankAccount, "số tài khoản")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                        Copy STK
                      </button>
                      <button
                        onClick={() =>
                          handleCopyPendingValue(`MOKA ${pendingQrPayment.order.number}`, "nội dung")
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                        Copy ND
                      </button>
                    </div>

                    <div className="rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-foreground">
                      Thu ngân không cần xác nhận tay. Khi webhook n8n cập nhật thanh toán thành công, hệ thống sẽ tự in phiếu và đóng màn chờ.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-border bg-card p-6 shadow-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Theo dõi đơn
                </div>

                <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Loại đơn</div>
                    <div className="mt-1 text-base font-bold text-foreground">
                      {pendingQrPayment.orderType === "dine-in"
                        ? "Tại chỗ"
                        : pendingQrPayment.orderType === "takeaway"
                          ? "Mang đi"
                          : "Giao hàng"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Thông tin đơn</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {pendingQrPayment.orderInfo || "Không có ghi chú bổ sung"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Món đã tạo</div>
                    <div className="mt-3 space-y-2">
                      {pendingQrPayment.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">
                              {item.quantity}x {item.product.name}
                            </div>
                            {item.variant ? (
                              <div className="text-xs text-muted-foreground">{item.variant.name}</div>
                            ) : null}
                          </div>
                          <div className="shrink-0 font-semibold text-foreground">
                            {formatPrice(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-success/5 px-4 py-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Khi thanh toán xong</div>
                    <div className="mt-2 text-sm text-foreground">
                      POS sẽ tự động:
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-foreground">
                      <div>1. Đánh dấu đơn đã thanh toán</div>
                      <div>2. In hóa đơn và tem bếp</div>
                      <div>3. Chuyển đơn vào quy trình xử lý bếp</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {payingDraftOrder ? (
        <PaymentDialog
          items={payingDraftOrder.items.map((item) => ({
            id: item.id,
            product: {
              id: item.productId,
              name: item.name,
              price: item.totalPrice / item.quantity,
              image: item.image || "",
              status: "active",
              categoryId: "",
            },
            quantity: item.quantity,
            selectedOptions: item.options.map((optName) => ({
              optionId: "",
              choiceId: "",
              name: optName,
              price: 0,
            })),
            note: item.note || "",
            totalPrice: item.totalPrice,
          }))}
          subtotal={payingDraftOrder.subtotal}
          discountSummary={{
            type: payingDraftOrder.discountType || "percentage",
            value: payingDraftOrder.discountValue || 0,
            amount: payingDraftOrder.discountAmount || 0,
          }}
          total={payingDraftOrder.total}
          orderType={payingDraftOrder.orderType}
          orderInfo={payingDraftOrder.orderInfo}
          onConfirm={handleConfirmPayingDraftOrder}
          onClose={() => setPayingDraftOrder(null)}
          isSubmitting={isSubmitting}
        />
      ) : null}

      <Sheet open={draftsOpen} onOpenChange={setDraftsOpen}>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[480px] border-border bg-card flex flex-col p-0">
          <SheetHeader className="p-4 border-b border-border text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="h-5 w-5 text-primary" />
              Danh sách Đơn tạm
            </SheetTitle>
            <SheetDescription>
              Các đơn hàng trả sau đang sử dụng tại quán ({pendingOrders.length} đơn)
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                <ClipboardList className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-semibold text-sm">Không có đơn tạm nào</p>
                <p className="text-xs opacity-75 mt-1">Các đơn hàng thanh toán sau sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-foreground">
                        {order.number}
                        {order.orderInfo && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {order.orderInfo}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Lưu lúc: {new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        {formatPrice(order.total)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {order.itemCount} sản phẩm
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                      >
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border">
                    <button
                      onClick={() => handlePrintDraftReceipt(order)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 text-[10px] font-semibold text-foreground hover:bg-muted"
                      title="In tạm tính kiểm đồ"
                    >
                      <Printer className="h-3 w-3" />
                      Tạm tính
                    </button>
                    <button
                      onClick={() => handleEditDraftOrder(order)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 py-2 text-[10px] font-bold hover:bg-amber-500/20"
                      title="Sửa chi tiết đơn tạm này"
                    >
                      <Pencil className="h-3 w-3" />
                      Sửa đơn
                    </button>
                    <button
                      onClick={async () => {
                        setDraftsOpen(false);
                        await handleConfirmPayingDraftOrder("cash", order);
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-success text-success-foreground py-2 text-[10px] font-bold hover:opacity-90"
                    >
                      <CreditCard className="h-3 w-3" />
                      Tính tiền
                    </button>
                    <button
                      onClick={() => handleCancelDraftOrder(order)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive py-2 text-[10px] font-semibold hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hủy đơn
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={approvalsOpen} onOpenChange={setApprovalsOpen}>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[480px] border-border bg-card flex flex-col p-0">
          <SheetHeader className="p-4 border-b border-border text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold text-rose-600">
              <Bell className="h-5 w-5 animate-bounce" />
              Đơn Online Chờ Duyệt
            </SheetTitle>
            <SheetDescription>
              Các đơn hàng khách tự đặt từ xa cần xác nhận ({approvalOrders.length} đơn)
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {approvalOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                <Bell className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-semibold text-sm">Không có đơn chờ duyệt nào</p>
                <p className="text-xs opacity-75 mt-1">Đơn đặt online từ xa của khách sẽ hiện ở đây.</p>
              </div>
            ) : (
              approvalOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                  
                  <div className="flex items-start justify-between gap-3 pl-1.5">
                    <div>
                      <div className="text-sm font-black text-foreground flex flex-wrap items-center gap-1.5">
                        <span>{order.number}</span>
                        <span className="rounded-full bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          {order.orderType === "dine-in" ? "Tại bàn" : order.orderType === "takeaway" ? "Mang đi" : "Giao hàng"}
                        </span>
                        {order.paymentStatus === "paid" ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Đã thanh toán
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Chưa thanh toán
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-semibold leading-relaxed">
                        Đặt lúc: {new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        <br />
                        {order.orderInfo}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        {formatPrice(order.total)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {order.itemCount} sản phẩm
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pl-1.5">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                      >
                        {item.quantity}x {item.name} {item.variantName ? `(${item.variantName})` : ""}
                        {item.note && <span className="ml-1 text-primary">({item.note})</span>}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 pl-1.5 border-t border-border">
                    <button
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleApproveOnlineOrder(order)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-success text-success-foreground py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {updatingOrderId === order.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Duyệt & In
                    </button>
                    <button
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleRejectOnlineOrder(order)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive py-2 text-xs font-semibold hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {createPortal(
        <PrintTemplates data={printData} mode={printMode || undefined} ref={printRef} />,
        document.getElementById("print-root") || document.body
      )}
      <QRCodeDialog open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
};

export default Index;
