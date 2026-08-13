import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  FlaskConical,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  Wallet,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  MonitorDown,
  Tag,
  Award,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, FileDown, AlertTriangle, Smartphone } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout = ({ children, title, subtitle, actions }: AdminLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    }
    return false;
  });

  const handleToggleCollapse = () => {
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
    localStorage.setItem("admin-sidebar-collapsed", String(nextValue));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Đã đăng xuất");
      navigate("/auth");
    } catch (error) {
      toast.error("Không thể đăng xuất");
    }
  };

  const navItems = [
    { to: "/pos", label: "Bán hàng", icon: ShoppingCart },
    { to: "/orders-history", label: "Lịch sử đơn", icon: ClipboardList },
    { to: "/cashbook", label: "Sổ quỹ", icon: Wallet },
    { to: "/inventory", label: "Kho & Công thức", icon: FlaskConical },
    { to: "/loyalty", label: "Quản lý điểm", icon: Award },
    { to: "/reports", label: "Báo cáo", icon: BarChart3 },
    { to: "/promotions", label: "Khuyến mãi", icon: Tag },
    { to: "/admin", label: "Thiết lập hệ thống", icon: Settings },
  ];

  const renderNavLinks = (onClickItem?: () => void) => {
    return navItems.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.to || 
                       (item.to === "/cashbook" && location.pathname.startsWith("/cashbook"));
                       
      const linkContent = (
        <Link
          to={item.to}
          onClick={onClickItem}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
            isActive
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
        </Link>
      );

      if (isCollapsed && !isMobile) {
        return (
          <Tooltip key={item.to} delayDuration={100}>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }

      return <div key={item.to}>{linkContent}</div>;
    });
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className={cn("flex items-center gap-3 border-b border-sidebar-border px-4 py-5", 
        isCollapsed && !isMobile ? "justify-center" : ""
      )}>
        <BrandMark size="sm" className="shrink-0" />
        {(!isCollapsed || isMobile) && (
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-wider text-sidebar-foreground">MOMOKA POS</span>
            <span className="block text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest">Workspace</span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {renderNavLinks()}
      </nav>

      {/* Footer User Info */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {user?.email && (!isCollapsed || isMobile) && (
          <div className="rounded-lg bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
            <span className="truncate">{user.email}</span>
          </div>
        )}

        {/* App Download Button (only if not inside Electron) */}
        {!isElectron && (
          <Dialog>
            <DialogTrigger asChild>
              {isCollapsed && !isMobile ? (
                <button className="flex w-full justify-center rounded-xl p-2.5 text-primary hover:bg-primary/10 transition-colors">
                  <MonitorDown className="h-5 w-5" />
                </button>
              ) : (
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all justify-center lg:justify-start">
                  <MonitorDown className="h-5 w-5 shrink-0" />
                  <span>Cài đặt ứng dụng</span>
                </button>
              )}
            </DialogTrigger>

            <DialogContent className="max-w-lg rounded-3xl p-6 border-border/80 bg-card">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <MonitorDown className="h-5 w-5 text-primary" />
                  Cài đặt Momoka POS
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Lựa chọn phương thức cài đặt tối ưu nhất cho thiết bị của bạn.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="pwa" className="w-full mt-4">
                <TabsList className="grid grid-cols-2 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="pwa" className="rounded-lg text-xs font-bold py-2">
                    <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                    Cài nhanh (PWA)
                  </TabsTrigger>
                  <TabsTrigger value="desktop" className="rounded-lg text-xs font-bold py-2">
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Tải File (.exe)
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: PWA (Khuyên dùng) */}
                <TabsContent value="pwa" className="space-y-4 pt-4 outline-none">
                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                      Đây là giải pháp nhẹ nhất, an toàn nhất và tự động cập nhật khi hệ thống có tính năng mới.
                    </p>
                    <div className="rounded-2xl border border-primary/25 bg-primary/[0.03] p-4 text-xs space-y-2.5 text-foreground/90">
                      <div className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-black">1</span>
                        <p className="font-semibold">Mở trang web bằng trình duyệt Chrome hoặc Edge trên máy tính.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-black">2</span>
                        <p className="font-semibold">Bấm vào biểu tượng Tải xuống / Cài đặt Moka POS nằm ở góc bên phải của thanh địa chỉ trình duyệt.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-black">3</span>
                        <p className="font-semibold">Xác nhận Cài đặt. Ứng dụng sẽ tự động thêm icon ra màn hình chính lập tức.</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/75 italic">
                      * Dành cho iOS (iPhone): Nhấp nút "Chia sẻ" trong Safari, sau đó chọn "Thêm vào màn hình chính".
                    </p>
                  </div>
                </TabsContent>

                {/* Tab 2: Tệp cài đặt truyền thống (.exe) */}
                <TabsContent value="desktop" className="space-y-4 pt-4 outline-none">
                  <div className="space-y-3.5">
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                      Phù hợp cho máy tính POS cố định Windows. Hỗ trợ in hóa đơn/tem dán cốc trực tiếp không cần xác nhận.
                    </p>

                    <div className="flex flex-col gap-2">
                      <a
                        href="https://drive.google.com/file/d/1Wr6g5q6dHh6grzvrLAaOZIqbmhwTeHdM/view"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs sm:text-sm font-black text-primary-foreground transition-opacity hover:opacity-95 shadow-sm"
                      >
                        <FileDown className="h-4 w-4" />
                        Tải xuống tệp cài đặt (.exe)
                      </a>
                      <p className="text-[10px] text-center text-muted-foreground font-semibold">Dung lượng: ~105 MB • Dành cho Windows 10/11 x64</p>
                    </div>

                    <div className="rounded-2xl border border-amber-200/60 bg-amber-500/[0.04] p-4 text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 flex gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Lưu ý khi mở tệp lần đầu:</p>
                        <p className="leading-relaxed font-semibold">
                          Do ứng dụng chưa đăng ký chứng chỉ bảo mật với Microsoft, Windows Defender có thể hiện cảnh báo "Windows protected your PC". Bạn hãy bấm "More info" và chọn "Run anyway" để cài đặt.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
        
        {isCollapsed && !isMobile ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex w-full justify-center rounded-xl p-2.5 text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-destructive">
              Đăng xuất
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      {isMobile ? (
        <div className="flex w-full flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="rounded-xl border border-border bg-background p-2 text-muted-foreground"
                    aria-label="Mở menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[260px] border-r-0">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
              <span className="text-base font-bold text-foreground truncate">{title}</span>
            </div>
            
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          
          <main className="flex-1 p-3 pb-16 overflow-x-hidden">
            {children}
          </main>
        </div>
      ) : (
        /* Desktop layout with sidebar */
        <div className="flex flex-1">
          {/* Sidebar container */}
          <aside 
            className={cn(
              "relative border-r border-sidebar-border transition-all duration-300 ease-in-out select-none shrink-0",
              isCollapsed ? "w-[64px]" : "w-[240px]"
            )}
          >
            <div className="sticky top-0 h-screen overflow-y-auto overflow-x-hidden no-scrollbar">
              {sidebarContent}
            </div>

            {/* Collapse toggle button */}
            <button
              onClick={handleToggleCollapse}
              className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent transition-colors"
              aria-label={isCollapsed ? "Mở rộng" : "Thu gọn"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </aside>

          {/* Main workspace */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <header className="border-b border-border bg-card/45 px-6 py-5 shrink-0 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </header>
            
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-background/50">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
