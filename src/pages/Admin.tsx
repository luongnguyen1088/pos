import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PrintTemplates } from "@/components/pos/PrintTemplates";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  ArrowLeft,
  BarChart3,
  ChefHat,
  ClipboardList,
  Database,
  FlaskConical,
  Package,
  Pencil,
  PlusCircle,
  Settings2,
  Tag,
  Trash2,
  Search,
  ChevronRight,
  Image as ImageIcon,
  Globe,
  Printer,
  QrCode,
  Wifi,
  WifiOff,
  Wallet,
  LayoutGrid,
  List,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { brand } from "@/lib/brand";
import { qzService } from "@/lib/qz-service";
import { androidPrint } from "@/lib/android-print";
import { Switch } from "@/components/ui/switch";
import {
  removeCategory,
  removeProduct,
  saveCategory,
  saveProduct,
  useCatalog,
} from "@/lib/catalog";
import {
  type Category,
  type Product,
  type ProductOption,
} from "@/data/products";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInventory } from "@/lib/inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm, ProductForm, OptionForm } from "@/components/admin/AdminForms";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { ProductImage } from "@/components/pos/ProductImage";

type Tab = "products" | "categories" | "options" | "library" | "table_qr" | "system";

const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

const defaultOptionTemplates: ProductOption[] = [
  {
    id: "sugar",
    name: "Đường",
    type: "single",
    choices: [
      { id: "s0", name: "Không đường", priceAdd: 0 },
      { id: "s30", name: "30%", priceAdd: 0 },
      { id: "s50", name: "50%", priceAdd: 0 },
      { id: "s70", name: "70%", priceAdd: 0 },
      { id: "s100", name: "100%", priceAdd: 0 },
    ],
  },
  {
    id: "ice",
    name: "Đá",
    type: "single",
    choices: [
      { id: "i0", name: "Không đá", priceAdd: 0 },
      { id: "i1", name: "Ít đá", priceAdd: 0 },
      { id: "i2", name: "Đá bình thường", priceAdd: 0 },
    ],
  },
  {
    id: "topping",
    name: "Topping",
    type: "multi",
    choices: [
      { id: "t1", name: "Trân châu", priceAdd: 5000 },
      { id: "t2", name: "Thạch", priceAdd: 5000 },
      { id: "t3", name: "Pudding", priceAdd: 8000 },
      { id: "t4", name: "Kem cheese", priceAdd: 10000 },
    ],
  },
];

const Admin = () => {
  const { categories, products, isLoading, isSupabaseConfigured, error } = useCatalog();
  const inventory = useInventory();
  const [tab, setTab] = useState<Tab>("products");
  const [qrDomain, setQrDomain] = useState("https://moka.claro.vn");
  const [qrTableCount, setQrTableCount] = useState(12);
  const [qrTablePrefix, setQrTablePrefix] = useState("Bàn ");
  const [qrType, setQrType] = useState<"order" | "zalo">("order");
  const [zaloLink, setZaloLink] = useState("https://zalo.me/g/ljqft3jbxny8cfr3txdo");
  const [electronPrinters, setElectronPrinters] = useState<string[]>([]);
  const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  const [selectedStickerCategories, setSelectedStickerCategories] = useState<string[]>(() => {
    const raw = localStorage.getItem("print-sticker-categories");
    if (raw) {
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return ["tra-sua", "tra-hoa-qua", "cafe", "kem"];
      }
    }
    return ["tra-sua", "tra-hoa-qua", "cafe", "kem"];
  });

  useEffect(() => {
    if (isElectron) {
      (window as any).electronAPI.getPrinters()
        .then((printers: any[]) => {
          setElectronPrinters(printers.map((p) => p.name));
        })
        .catch((err: any) => {
          console.error("Failed to load Electron printers:", err);
        });
    }
  }, [isElectron]);

  const [printData, setPrintData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"bill" | "stickers" | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleTestAutoPrint = () => {
    const testPayload = {
      orderNumber: "TEST-88",
      items: [
        {
          product: {
            id: "test-milk-tea",
            name: "Trà sữa Moka (In Thử)",
            price: 39000,
            image: "",
            category: "milktea"
          },
          quantity: 1,
          totalPrice: 39000,
          selectedOptions: [
            { optionId: "opt-ice", name: "Ít đá (50%)", price: 0 },
            { optionId: "opt-sugar", name: "Bình thường", price: 0 }
          ],
          note: "Ghi chú: Thơm ngon, đậm vị trà"
        }
      ],
      subtotal: 39000,
      total: 39000,
      discountAmount: 0,
      paymentMethod: "Tiền mặt (IN THỬ)",
      orderType: "dine-in",
      orderInfo: "Bàn 09",
      createdAt: new Date().toISOString(),
      paymentStatus: "paid"
    };

    setPrintData(testPayload);
    setPrintMode("bill");
    toast.info("Bắt đầu tiến trình in thử tự động (Hóa đơn -> Tem dán)...");
  };

  // Printing sequence effect in Admin
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

      document.body.classList.add(`printing-${printMode}`);
      
      try {
        const useQZ = localStorage.getItem("qz-enabled") === "true";
        let billPrinter = localStorage.getItem("qz-bill-printer") || "";
        let stickerPrinter = localStorage.getItem("qz-sticker-printer") || "";

        if (isElectron) {
          try {
            const printers = await (window as any).electronAPI.getPrinters();
            const printerNames = printers.map((p: any) => p.name.trim().toLowerCase());
            
            const targetBill = billPrinter.trim().toLowerCase();
            const targetSticker = stickerPrinter.trim().toLowerCase();
            
            if (billPrinter && !printerNames.includes(targetBill)) {
              console.warn(`Configured bill printer "${billPrinter}" not found. Falling back to default.`);
              billPrinter = "";
            }
            if (stickerPrinter && !printerNames.includes(targetSticker)) {
              console.warn(`Configured sticker printer "${stickerPrinter}" not found. Falling back to default.`);
              stickerPrinter = "";
            }
          } catch (e) {
            console.error("Failed to check system printers:", e);
          }
        } else {
          if (!billPrinter) billPrinter = "Bill";
          if (!stickerPrinter) stickerPrinter = "Sticker";
        }

        if (isAndroid && useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          await new Promise(resolve => setTimeout(resolve, 500));
          await androidPrint.printHTML(printRef.current.innerHTML, printerName);
          
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("In thử tự động hoàn thành trên Android RawBT!");
          }
        } else if (isElectron && useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          
          toast.info(`Đang in thử ${printMode === "bill" ? "Hóa đơn" : "Tem dán"} qua máy in: ${printerName || "Máy in mặc định"}`);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
          
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("In thử tự động hoàn thành trên Desktop App!");
          }
        } else if (useQZ && printRef.current) {
          const printerName = printMode === "bill" ? billPrinter : stickerPrinter;
          await new Promise(resolve => setTimeout(resolve, 500));
          await qzService.printElement(printerName, printRef.current);
          
          if (printMode === "bill") {
            setPrintMode("stickers");
          } else {
            setPrintMode(null);
            setPrintData(null);
            toast.success("In thử tự động hoàn thành qua QZ Tray!");
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
        console.error("Print error in Admin:", err);
        const printerName = isAndroid ? "Android RawBT" : isElectron ? "Electron" : "QZ Tray";
        toast.error(`Lỗi in thử ${printerName}`, {
          description: "Đang chuyển sang chế độ in thử thủ công..."
        });
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

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  const [editingCategory, setEditingCategory] = useState<Category | "new" | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | "new" | null>(null);
  const [quickImageProduct, setQuickImageProduct] = useState<Product | null>(null);
  const [editingOption, setEditingOption] = useState<ProductOption | "new" | null>(null);
  const [optionTemplates, setOptionTemplates] = useState<ProductOption[]>(defaultOptionTemplates);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryId === "all" || p.categoryId === activeCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategoryId]);

  const groupedProducts = useMemo(() => {
    const relevantCategories = activeCategoryId === "all" 
      ? categories 
      : categories.filter(c => c.id === activeCategoryId);

    return relevantCategories.map((category) => ({
      category,
      products: filteredProducts.filter((product) => product.categoryId === category.id),
    })).filter(group => group.products.length > 0);
  }, [categories, filteredProducts, activeCategoryId]);

  return (
    <AdminLayout
      title="Momoka Admin"
      subtitle={isSupabaseConfigured ? "Đồng bộ đám mây (Cloud Sync)" : "Dữ liệu cục bộ (Local Data)"}
    >
        {error && (
          <Badge variant="destructive" className="w-full justify-center rounded-lg py-1.5 font-normal">
            Lỗi kết nối: {error}
          </Badge>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-11 w-full justify-start rounded-xl bg-muted/50 p-1 sm:w-auto">
              <TabsTrigger value="products" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Package className="mr-2 h-4 w-4" />
                Sản phẩm
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="mr-2 h-4 w-4" />
                Danh mục
              </TabsTrigger>
              <TabsTrigger value="options" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Tùy chọn
              </TabsTrigger>
              <TabsTrigger value="library" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ImageIcon className="mr-2 h-4 w-4" />
                Thư viện
              </TabsTrigger>
              <TabsTrigger value="table_qr" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <QrCode className="mr-2 h-4 w-4" />
                QR Gọi món
              </TabsTrigger>
              <TabsTrigger value="system" className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Hệ thống
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (tab === "products") setEditingProduct("new");
                  if (tab === "categories") setEditingCategory("new");
                  if (tab === "options") setEditingOption("new");
                }}
                className="flex-1 rounded-xl shadow-lg shadow-primary/20 sm:flex-none"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm mới
              </Button>
            </div>
          </div>

          <TabsContent value="products" className="space-y-6 outline-none">
            {/* Search & Filtering */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm trà sữa, cà phê..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl pl-10 ring-offset-background transition-all focus-visible:ring-primary/20"
                />
              </div>

              {/* View Switcher */}
              <div className="flex bg-muted/60 dark:bg-muted/30 p-1 rounded-xl border border-border/40 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all",
                    viewMode === "grid"
                      ? "bg-background text-primary shadow-xs border border-border/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Hiển thị dạng lưới thẻ"
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Dạng lưới
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all",
                    viewMode === "table"
                      ? "bg-background text-primary shadow-xs border border-border/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Hiển thị dạng bảng tồn kho"
                >
                  <List className="h-3.5 w-3.5" /> Dạng bảng
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:pb-0">
                <Button
                  variant={activeCategoryId === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategoryId("all")}
                  className="h-11 rounded-xl px-4"
                >
                  Tất cả
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategoryId === cat.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={cn(
                      "h-11 rounded-xl px-4 border transition-all whitespace-nowrap",
                      activeCategoryId === cat.id ? "border-primary/50 bg-primary/5 text-primary" : "border-transparent"
                    )}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-muted/50" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-3">
                  <div className="rounded-full bg-muted p-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Không tìm thấy sản phẩm nào</p>
                    <p className="text-sm text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc danh mục khác.</p>
                  </div>
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setActiveCategoryId("all"); }}>
                    Hiện tất cả
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {groupedProducts.map(({ category, products: categoryProducts }) => (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-1 rounded-full bg-primary/60" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                        {category.name} <span className="ml-1 opacity-50">({categoryProducts.length})</span>
                      </h3>
                    </div>

                      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead>
                            <tr className="border-b border-border/80 bg-muted/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
                              <th className="p-4">Sản phẩm</th>
                              <th className="p-4">Giá bán</th>
                              <th className="p-4 text-center">Quản lý kho</th>
                              <th className="p-4 text-center">Tồn thực tế</th>
                              <th className="p-4 text-center">Giá nhập định mức</th>
                              <th className="p-4 text-center">Trị giá tồn</th>
                              <th className="p-4 text-center">Trạng thái bán</th>
                              <th className="p-4 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-xs sm:text-sm font-semibold">
                            {categoryProducts.map((product) => {
                              const matchingIng = inventory.ingredients.find(
                                (ing) => ing.name.toLowerCase().trim() === product.name.toLowerCase().trim()
                              );
                              const isManaged = !!matchingIng;
                              const stockVal = matchingIng ? matchingIng.stockQuantity * matchingIng.purchasePrice : 0;

                              return (
                                <tr key={product.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        onClick={() => setQuickImageProduct(product)}
                                        className="h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 cursor-pointer hover:scale-105 transition-all shadow-xs"
                                        title="Click đổi ảnh nhanh"
                                      >
                                        <ProductImage image={product.image} name={product.name} fallbackClassName="text-xl" />
                                      </div>
                                      <span className="font-bold text-foreground">{product.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 font-bold text-foreground">
                                    {formatPrice(product.price)}
                                  </td>
                                  <td className="p-4 text-center">
                                    {isManaged ? (
                                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border-none font-bold">
                                        Đang quản lý
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground/30 font-medium">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center font-bold">
                                    {isManaged ? (
                                      <span className={cn(
                                        matchingIng.stockQuantity <= matchingIng.lowStockThreshold
                                          ? "text-rose-600 dark:text-rose-400 font-black animate-pulse"
                                          : "text-foreground"
                                      )}>
                                        {matchingIng.stockQuantity} cái
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/30 font-medium">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center font-semibold text-muted-foreground">
                                    {isManaged ? `${new Intl.NumberFormat("vi-VN").format(matchingIng.purchasePrice)}đ` : "-"}
                                  </td>
                                  <td className="p-4 text-center font-bold text-violet-600 dark:text-violet-400">
                                    {isManaged ? `${new Intl.NumberFormat("vi-VN").format(stockVal)}đ` : "-"}
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Switch 
                                        checked={product.isOnsite !== false}
                                        onCheckedChange={async (checked) => {
                                          try {
                                            await saveProduct({ ...product, isOnsite: checked });
                                            toast.success(`Đã ${checked ? 'mở' : 'tắt'} menu online: ${product.name}`, {
                                              icon: <Globe className="w-4 h-4 text-primary" />,
                                              className: "rounded-2xl"
                                            });
                                          } catch (e) {
                                            toast.error("Lỗi khi cập nhật trạng thái");
                                          }
                                        }}
                                        className="h-4 w-7 data-[state=checked]:bg-emerald-500 scale-90"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex justify-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingProduct(product)}
                                        className="h-8 w-8 rounded-lg hover:bg-muted"
                                      >
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={async () => {
                                          if (confirm(`Xóa ${product.name}?`)) {
                                            try {
                                              await removeProduct(product.id);
                                              toast.success("Đã xóa sản phẩm");
                                            } catch (e) {
                                              toast.error("Lỗi khi xóa");
                                            }
                                          }
                                        }}
                                        className="h-8 w-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4 outline-none">
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Card key={category.id} className="group transition-all hover:border-primary/50 hover:shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl group-hover:scale-110 transition-transform shadow-inner">
                        {category.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{category.name}</CardTitle>
                        <CardDescription className="text-xs font-medium">
                          {products.filter((p) => p.categoryId === category.id).length} sản phẩm hiện có
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setEditingCategory(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (confirm(`Xóa danh mục ${category.name}?`)) {
                            try {
                              await removeCategory(category.id);
                              toast.success("Đã xóa danh mục");
                            } catch (e) {
                              toast.error("Lỗi khi xóa");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-6 outline-none">
            <Card className="border-amber-100 bg-amber-50/50 dark:border-amber-900/10 dark:bg-amber-950/20 rounded-2xl">
              <CardContent className="flex items-start gap-3 p-5">
                <Settings2 className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs font-medium leading-relaxed text-amber-900/70 dark:text-amber-400/70">
                  Phần này hiện vẫn là mẫu cục bộ để gán logic chọn món ở giao diện. Dữ liệu đang đồng bộ
                  thật với Supabase là danh mục, sản phẩm và đơn hàng.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {optionTemplates.map((option) => (
                <Card key={option.id} className="overflow-hidden rounded-2xl border-muted-foreground/10">
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-bold tracking-tight">{option.name}</CardTitle>
                      <Badge variant="outline" className={cn(
                        "font-bold text-[10px] uppercase bg-background",
                        option.type === "single" ? "text-blue-500 border-blue-200" : "text-purple-500 border-purple-200"
                      )}>
                        {option.type === "single" ? "Chọn một" : "Chọn nhiều"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => setEditingOption(option)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-lg h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Xóa tùy chọn này?")) {
                            setOptionTemplates(prev => prev.filter(i => i.id !== option.id));
                            toast.success("Đã xóa");
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 p-4">
                    {option.choices.map((choice) => (
                      <Badge
                        key={choice.id}
                        variant="secondary"
                        className="rounded-full bg-muted/50 px-3 py-1 text-xs font-semibold hover:bg-muted"
                      >
                        {choice.name}
                        {choice.priceAdd > 0 && (
                          <span className="ml-1.5 font-black text-primary">+{formatPrice(choice.priceAdd)}</span>
                        )}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6 outline-none">
            <Card className="rounded-2xl border-orange-200 bg-orange-50/50 dark:border-orange-950/20 dark:bg-orange-950/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-700">Chế độ hoạt động (Offline / Online)</CardTitle>
                </div>
                <CardDescription className="text-orange-900/70 dark:text-orange-400/70">
                  {isSupabaseConfigured 
                    ? "Hệ thống đang hoạt động ở chế độ Cloud (đồng bộ đám mây Supabase)."
                    : "Hệ thống đang hoạt động ở chế độ Local (dữ liệu offline lưu cục bộ)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-background p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold">Chế độ Offline cưỡng bức (Force Local/Offline)</div>
                    <div className="text-xs text-muted-foreground">
                      Bật tùy chọn này để bắt buộc hệ thống hoạt động ở chế độ Cục bộ (Offline), bỏ qua đồng bộ đám mây ngay cả khi đã cấu hình khóa Supabase. Hữu ích khi mất internet hoặc cấu hình sai.
                    </div>
                  </div>
                  <Switch 
                    checked={localStorage.getItem("moka_force_offline") === "true"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        localStorage.setItem("moka_force_offline", "true");
                      } else {
                        localStorage.removeItem("moka_force_offline");
                      }
                      window.location.reload();
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100 bg-amber-50/50 dark:border-amber-900/10 dark:bg-amber-950/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-amber-600">Hệ thống & PWA</CardTitle>
                <CardDescription className="text-amber-900/70 dark:text-amber-400/70">
                  Nếu bạn thấy hình ảnh không hiển thị đúng hoặc giao diện bị lỗi, hãy thử xóa bộ nhớ đệm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="border-amber-200 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa cache và tải lại trang?")) {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                          for (let registration of registrations) {
                            registration.unregister();
                          }
                          window.location.reload(true);
                        });
                      } else {
                        window.location.reload(true);
                      }
                    }
                  }}
                >
                  Xóa Cache & Làm mới App
                </Button>
                <p className="text-xs text-muted-foreground italic">
                  * Thao tác này sẽ gỡ bỏ Service Worker hiện tại và tải lại toàn bộ tài nguyên từ máy chủ.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/10 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-primary" />
                  <CardTitle>
                    {isAndroid 
                      ? "Cấu hình in ấn (Android POS)" 
                      : isElectron 
                        ? "Cấu hình in ấn (Electron Desktop)" 
                        : "Cấu hình in ấn (QZ Tray)"}
                  </CardTitle>
                </div>
                <CardDescription>
                  {isAndroid
                    ? "Hỗ trợ in trực tiếp qua hệ thống Android hoặc in ngầm tự động (Silent Print) qua ứng dụng RawBT."
                    : isElectron 
                      ? "In hóa đơn và tem dán trực tiếp thông qua hệ điều hành của máy tính mà không cần bất cứ công cụ trung gian nào."
                      : "Kết nối với QZ Tray để in hóa đơn và tem tự động không cần xác nhận."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background p-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold">Kích hoạt in tự động (Silent Print)</div>
                    <div className="text-xs text-muted-foreground">
                      {isAndroid
                        ? "BẬT để in ngầm tự động (yêu cầu cài app RawBT). TẮT để in trực tiếp qua hộp thoại Android (không cần cài thêm gì)."
                        : isElectron 
                          ? "Hệ thống sẽ in tự động ngầm qua API của phần mềm Desktop."
                          : "Yêu cầu phần mềm QZ Tray đang chạy trên máy tính."}
                    </div>
                  </div>
                  <Switch 
                    checked={localStorage.getItem("qz-enabled") === "true"}
                    onCheckedChange={(checked) => {
                      localStorage.setItem("qz-enabled", String(checked));
                      window.location.reload(); // Reload to apply to Index.tsx logic
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Máy in hóa đơn (Bill)</label>
                    {isElectron && electronPrinters.length > 0 ? (
                      <select
                        defaultValue={localStorage.getItem("qz-bill-printer") || "Bill"}
                        onChange={(e) => {
                          localStorage.setItem("qz-bill-printer", e.target.value);
                          toast.success(`Đã lưu máy in hóa đơn: ${e.target.value}`);
                        }}
                        className="w-full h-11 px-3 rounded-xl border border-primary/20 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- Chọn máy in hóa đơn --</option>
                        {electronPrinters.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input 
                        defaultValue={localStorage.getItem("qz-bill-printer") || "Bill"}
                        onChange={(e) => localStorage.setItem("qz-bill-printer", e.target.value)}
                        placeholder="VD: XP-80C"
                        className="rounded-xl border-primary/20"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Máy in tem (Sticker)</label>
                    {isElectron && electronPrinters.length > 0 ? (
                      <select
                        defaultValue={localStorage.getItem("qz-sticker-printer") || "Sticker"}
                        onChange={(e) => {
                          localStorage.setItem("qz-sticker-printer", e.target.value);
                          toast.success(`Đã lưu máy in tem dán: ${e.target.value}`);
                        }}
                        className="w-full h-11 px-3 rounded-xl border border-primary/20 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- Chọn máy in tem dán cốc --</option>
                        {electronPrinters.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input 
                        defaultValue={localStorage.getItem("qz-sticker-printer") || "Sticker"}
                        onChange={(e) => localStorage.setItem("qz-sticker-printer", e.target.value)}
                        placeholder="VD: Xprinter 350B"
                        className="rounded-xl border-primary/20"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Khổ giấy in Hóa đơn (Bill)</label>
                    <select
                      defaultValue={localStorage.getItem("print-bill-width") || "80"}
                      onChange={(e) => {
                        localStorage.setItem("print-bill-width", e.target.value);
                        toast.success(`Đã chọn khổ hóa đơn: ${e.target.value}mm`);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-primary/20 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="80">K80 (80mm - Tiêu chuẩn)</option>
                      <option value="58">K58 (58mm - Nhỏ/Cầm tay)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Khổ giấy in Tem dán (Sticker)</label>
                    <select
                      defaultValue={`${localStorage.getItem("print-sticker-width") || "50"}x${localStorage.getItem("print-sticker-height") || "30"}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split("x");
                        localStorage.setItem("print-sticker-width", w);
                        localStorage.setItem("print-sticker-height", h);
                        toast.success(`Đã chọn khổ tem: ${w}mm x ${h}mm`);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-primary/20 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="50x30">50mm x 30mm (Tiêu chuẩn cốc trà sữa)</option>
                      <option value="40x30">40mm x 30mm (Cỡ vừa)</option>
                      <option value="30x20">30mm x 20mm (Cỡ nhỏ)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 mt-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">Danh mục in Tem dán (Stickers)</h4>
                    <p className="text-xs text-muted-foreground">Chỉ in tem dán chế biến cho các danh mục sản phẩm được tích chọn dưới đây nhằm tiết kiệm giấy tem.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((category) => {
                      const isChecked = selectedStickerCategories.includes(category.id);
                      return (
                        <div key={category.id} className="flex items-center space-x-2 rounded-lg border bg-background p-2.5 hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id={`category-sticker-${category.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              let next: string[];
                              if (checked) {
                                next = [...selectedStickerCategories, category.id];
                              } else {
                                next = selectedStickerCategories.filter((id) => id !== category.id);
                              }
                              setSelectedStickerCategories(next);
                              localStorage.setItem("print-sticker-categories", JSON.stringify(next));
                              toast.success(`Cập nhật danh mục in tem: ${category.name}`);
                            }}
                          />
                          <Label htmlFor={`category-sticker-${category.id}`} className="cursor-pointer text-xs font-semibold select-none flex items-center gap-1.5">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {isElectron ? (
                    <Button 
                      variant="secondary"
                      className="rounded-xl"
                      onClick={async () => {
                        try {
                          const printers = await (window as any).electronAPI.getPrinters();
                          setElectronPrinters(printers.map((p: any) => p.name));
                          toast.success("Làm mới danh sách máy in thành công", {
                            description: `Tìm thấy ${printers.length} máy in đang sẵn sàng trên Windows.`
                          });
                        } catch (err) {
                          toast.error("Không thể quét máy in từ hệ điều hành.");
                        }
                      }}
                    >
                      <Wifi className="mr-2 h-4 w-4" />
                      Làm mới máy in
                    </Button>
                  ) : isAndroid ? (
                    <Button 
                      variant="secondary"
                      className="rounded-xl"
                      onClick={async () => {
                        try {
                          const billPrinter = localStorage.getItem("qz-bill-printer") || "Bill";
                          const testHtml = `
                            <div class="card" style="text-align: center; font-family: sans-serif; padding: 10px;">
                              <h2>MOKA POS TEST</h2>
                              <p>Kiểm tra in ấn Android RawBT hoạt động tốt!</p>
                              <p>Thời gian: ${new Date().toLocaleTimeString()}</p>
                            </div>
                          `;
                          await androidPrint.printHTML(testHtml, billPrinter);
                          toast.success("Đã gửi lệnh in thử qua RawBT!");
                        } catch (err: any) {
                          toast.error("Không thể in thử qua RawBT", {
                            description: err.message || "Đảm bảo ứng dụng RawBT đã được cài đặt và đang chạy."
                          });
                        }
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      In thử (RawBT)
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary"
                      className="rounded-xl"
                      onClick={async () => {
                        try {
                          await qzService.connect();
                          const printers = await qzService.listPrinters();
                          console.log("Available printers:", printers);
                          toast.success("Kết nối QZ Tray thành công", {
                            description: `Tìm thấy ${printers.length} máy in. Kiểm tra Console để xem danh sách.`
                          });
                        } catch (err) {
                          toast.error("Không thể kết nối QZ Tray", {
                            description: "Hãy đảm bảo phần mềm QZ Tray đã được khởi động."
                          });
                        }
                      }}
                    >
                      <Wifi className="mr-2 h-4 w-4" />
                      Kiểm tra kết nối
                    </Button>
                  )}
                  
                  <Button 
                    variant="default"
                    className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white"
                    onClick={handleTestAutoPrint}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    In thử tự động (Cả 2 máy)
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      const instructions = isAndroid
                        ? "HƯỚNG DẪN IN TRÊN APP ANDROID (RAWBT):\n\n1. Tải và cài đặt ứng dụng 'RawBT printer' từ Google Play Store.\n2. Mở ứng dụng RawBT, cấu hình kết nối với máy in nhiệt của bạn (Bluetooth, USB, hoặc LAN).\n3. Đảm bảo RawBT ở trạng thái chạy ngầm (Service is running).\n4. Bật 'Kích hoạt in tự động' và bấm 'In thử' để kiểm tra kết nối."
                        : isElectron
                          ? "HƯỚNG DẪN IN TRÊN APP DESKTOP (ELECTRON):\n\n1. Đảm bảo máy in của bạn đã được cắm USB/LAN và cài đặt Driver đầy đủ trên máy tính.\n2. Bấm nút 'Làm mới máy in' để quét danh sách máy in trực tiếp từ Windows.\n3. Chọn máy in tương ứng cho ô Máy in hóa đơn và Máy in tem.\n4. Bấm 'Lưu cấu hình' ở phía dưới để hoàn tất."
                          : "HƯỚNG DẪN IN TRÊN TRÌNH DUYỆT WEB:\n\n1. Tải phần mềm kết nối QZ Tray tại địa chỉ: https://qz.io\n2. Cài đặt và chạy ứng dụng QZ Tray trên máy tính.\n3. Bấm nút 'Kiểm tra kết nối' ở trên để kết nối.\n4. Nhập chính xác tên máy in từ Control Panel của Windows vào ô tương ứng.";
                      alert(instructions);
                    }}
                  >
                    Hướng dẫn cài đặt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-6 outline-none">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="table_qr" className="space-y-6 outline-none">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {/* Cấu hình in QR */}
              <Card className="flex-1 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase tracking-wider text-primary">In mã QR để bàn</CardTitle>
                  <CardDescription>
                    Tạo bản in mã QR đặt trên bàn ăn, hỗ trợ quét Gọi món trực tuyến hoặc tham gia nhóm Zalo khuyến mãi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selector loại QR */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Loại mã QR</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQrType("order")}
                        className={cn(
                          "py-2.5 px-3 text-xs font-bold rounded-xl border transition-all duration-200",
                          qrType === "order"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        QR Gọi món tại bàn
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrType("zalo")}
                        className={cn(
                          "py-2.5 px-3 text-xs font-bold rounded-xl border transition-all duration-200",
                          qrType === "zalo"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        QR Nhóm Zalo khuyến mãi
                      </button>
                    </div>
                  </div>

                  {qrType === "order" ? (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tên miền gọi món (Website URL)</label>
                      <Input
                        value={qrDomain}
                        onChange={(e) => setQrDomain(e.target.value)}
                        placeholder="https://moka.claro.vn"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link tham gia nhóm Zalo</label>
                      <Input
                        value={zaloLink}
                        onChange={(e) => setZaloLink(e.target.value)}
                        placeholder="https://zalo.me/g/..."
                      />
                    </div>
                  )}

                  {qrType === "order" && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Số lượng bàn cần tạo</label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={qrTableCount}
                          onChange={(e) => setQrTableCount(Math.max(1, Number(e.target.value)))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiền tố tên bàn</label>
                        <Input
                          value={qrTablePrefix}
                          onChange={(e) => setQrTablePrefix(e.target.value)}
                          placeholder="Bàn "
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={() => window.print()}
                      className="w-full rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      IN BẢN QR ĐỂ BÀN (A4/CARD)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Hướng dẫn sử dụng */}
              <Card className="w-full md:w-[350px] rounded-2xl bg-muted/30 border-dashed border-border/80">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">Hướng dẫn sử dụng</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                  {qrType === "order" ? (
                    <>
                      <p>
                        1. <strong>Kiểm tra tên miền:</strong> Đảm bảo tên miền chính xác là <strong>https://moka.claro.vn</strong> để khách quét QR truy cập đúng website.
                      </p>
                      <p>
                        2. <strong>Cấu hình bàn:</strong> Nhập số lượng bàn bạn đang có. Hệ thống sẽ tự động sinh mã tương ứng: <em>Bàn 1, Bàn 2,...</em>
                      </p>
                      <p>
                        3. <strong>Thực hiện In:</strong> Nhấp vào nút "IN BẢN QR ĐỂ BÀN". Cửa sổ in trình duyệt sẽ mở ra. Chọn hướng in **Khổ dọc (Portrait)**, bật **In màu** và **In hình nền (Background graphics)**.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1. <strong>Nhóm Zalo khuyến mãi:</strong> Giúp khách hàng quét để nhanh chóng tham gia nhóm Zalo kín của quán nhằm nhận voucher, đổi quà và xem tin ưu đãi.
                      </p>
                      <p>
                        2. <strong>Bản in đơn nhất:</strong> QR Nhóm Zalo là duy nhất cho cả quán, không phân biệt theo số bàn. Hệ thống sẽ chỉ sinh ra 1 thẻ in duy nhất.
                      </p>
                      <p>
                        3. <strong>In & Dán:</strong> Bấm in và chọn in màu chất lượng cao để dán lên chân đế mica hoặc trực tiếp tại các vị trí thu hút trong quán.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Print preview grid of cards */}
            <div className="border border-border/60 bg-muted/10 rounded-2xl p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Bản xem trước khi in (Print Preview)</h3>
              
              <div id="printable-table-qrs" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4 bg-white rounded-xl shadow-inner max-h-[600px] overflow-y-auto printable-qr-grid">
                {qrType === "order" ? (
                  Array.from({ length: qrTableCount }).map((_, idx) => {
                    const tableNumStr = String(idx + 1);
                    const qrUrl = `${qrDomain.trim()}?table=${tableNumStr}`;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center justify-between border-2 border-slate-900 bg-white p-6 rounded-2xl text-center shadow-md w-full max-w-[280px] mx-auto my-2 aspect-[3/4] break-inside-avoid">
                        <div className="w-full space-y-1">
                          <div className="text-xs font-black tracking-widest text-slate-800 uppercase">{brand.name}</div>
                          <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{brand.categoriesTagline}</div>
                          <div className="w-full border-b border-dashed border-slate-300 pt-1" />
                        </div>
                        
                        <div className="my-4 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                          <QRCodeSVG value={qrUrl} size={150} level="H" includeMargin={true} />
                        </div>

                        <div className="w-full space-y-1">
                          <div className="text-[10px] font-black text-slate-700 tracking-wider uppercase font-black">QUÉT QR ĐỂ GỌI MÓN</div>
                          <div className="text-[8px] text-muted-foreground leading-normal font-semibold max-w-[180px] mx-auto">
                            Gọi món & thanh toán tự động
                          </div>
                          <div className="text-xl font-black text-slate-900 tracking-wider mt-1">{qrTablePrefix.toUpperCase()}{tableNumStr.padStart(2, '0')}</div>
                          <div className="text-[8px] text-muted-foreground mt-0.5">
                            {qrDomain.replace("https://", "")}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-between border-[3px] border-emerald-600 bg-white p-8 rounded-[24px] text-center shadow-lg w-full max-w-[320px] mx-auto my-4 aspect-[2.8/4] break-inside-avoid col-span-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600" />
                    
                    <div className="w-full space-y-1.5">
                      <div className="text-sm font-black tracking-wider text-emerald-700 uppercase">{brand.name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{brand.categoriesTagline}</div>
                      <div className="w-full border-b-2 border-slate-100 pt-1" />
                    </div>
                    
                    <div className="my-4 space-y-3">
                      <div className="text-[11px] font-extrabold text-emerald-600 tracking-wider bg-emerald-50 px-3 py-1 rounded-full uppercase inline-block">
                        QUÉT QR - NHẬN ƯU ĐÃI NGAY 🎁
                      </div>
                      <h4 className="text-base font-black text-slate-800 leading-tight">
                        GIA NHẬP NHÓM ZALO KHÁCH QUEN
                      </h4>
                      <div className="text-[8.5px] text-slate-700 text-left space-y-1.5 font-bold max-w-[250px] mx-auto bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        <div className="flex items-start gap-1">
                          <span className="shrink-0 text-[10px]">🍋</span>
                          <span><strong>Tặng Free 5 cốc Trà chanh</strong> mỗi ngày cho 5 khách may mắn (qua Minigame)</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="shrink-0 text-[10px]">📉</span>
                          <span><strong>Giảm giá từ 10% - 30%</strong> cập nhật hàng ngày & hàng tuần</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="shrink-0 text-[10px]">🎁</span>
                          <span><strong>Chương trình quà tặng tri ân</strong> đặc quyền hội viên</span>
                        </div>
                      </div>
                    </div>

                    <div className="my-2 flex flex-col items-center justify-center p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl shadow-xs">
                      <QRCodeSVG value={zaloLink.trim()} size={160} level="H" includeMargin={true} />
                    </div>

                    <div className="w-full space-y-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Quét bằng ứng dụng Zalo
                      </div>
                      <div className="text-sm font-black text-emerald-600 tracking-wider uppercase mt-1">
                        ZALO VIP CLUB
                      </div>
                      <div className="text-[8.5px] text-slate-400 font-medium">
                        {zaloLink.replace("https://", "")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stylesheet injected to hide other UI during window.print() */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-table-qrs, #printable-table-qrs * {
                  visibility: visible !important;
                }
                #printable-table-qrs {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  display: grid !important;
                  grid-template-columns: repeat(2, 1fr) !important;
                  gap: 15px !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                }
                #printable-table-qrs > div {
                  border-width: 3px !important;
                  border-style: solid !important;
                  border-radius: 20px !important;
                  padding: 24px !important;
                  margin: 20px auto !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  box-shadow: none !important;
                }
              }
            `}} />
          </TabsContent>
        </Tabs>

      {/* Forms in Dialogs */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">{editingCategory === "new" ? "Danh mục mới" : "Chỉnh sửa"}</DialogTitle>
            <DialogDescription className="text-sm font-medium">Nhập thông tin danh mục sản phẩm của bạn.</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              initial={editingCategory === "new" ? undefined : editingCategory}
              onSave={async (cat) => {
                await saveCategory(cat);
                setEditingCategory(null);
                toast.success("Đã lưu danh mục");
              }}
              onCancel={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase">{editingProduct === "new" ? "Sản phẩm mới" : "Cập nhật món"}</DialogTitle>
            <DialogDescription className="text-base font-medium text-muted-foreground/80">Cấu hình thông tin, giá và các phiên bản của món uống.</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initial={editingProduct === "new" ? undefined : editingProduct}
              categories={categories}
              optionTemplates={optionTemplates}
              onSave={async (prod) => {
                await saveProduct(prod);
                setEditingProduct(null);
                toast.success("Đã cập nhật sản phẩm");
              }}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingOption} onOpenChange={(open) => !open && setEditingOption(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">{editingOption === "new" ? "Thêm tùy chọn" : "Sửa tùy chọn"}</DialogTitle>
            <DialogDescription className="text-sm font-medium">Tạo các lựa chọn như mức đường, đá hoặc topping.</DialogDescription>
          </DialogHeader>
          {editingOption && (
            <OptionForm
              initial={editingOption === "new" ? undefined : editingOption}
              onSave={(opt) => {
                setOptionTemplates(prev => 
                  prev.some(i => i.id === opt.id) ? prev.map(i => i.id === opt.id ? opt : i) : [...prev, opt]
                );
                setEditingOption(null);
                toast.success("Đã lưu cấu hình");
              }}
              onCancel={() => setEditingOption(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Image Update Dialog */}
      <Dialog open={!!quickImageProduct} onOpenChange={(open) => !open && setQuickImageProduct(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-[32px] border-none shadow-2xl p-0">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                Đổi ảnh: {quickImageProduct?.name}
              </DialogTitle>
              <DialogDescription>Chọn một hình ảnh từ thư viện hoặc tải ảnh mới lên.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {quickImageProduct && (
              <MediaLibrary 
                selectedUrl={quickImageProduct.image} 
                onSelect={async (url) => {
                  try {
                    await saveProduct({ ...quickImageProduct, image: url });
                    setQuickImageProduct(null);
                    toast.success(`Đã cập nhật ảnh cho ${quickImageProduct.name}`);
                  } catch (e) {
                    toast.error("Lỗi khi cập nhật ảnh");
                  }
                }} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {createPortal(
        <PrintTemplates data={printData} mode={printMode || undefined} ref={printRef} />,
        document.getElementById("print-root") || document.body
      )}
    </AdminLayout>
  );
};

export default Admin;
