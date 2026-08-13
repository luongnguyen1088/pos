import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import { PWAUpdater } from "@/components/PWAUpdater";

// Lazy loaded pages for performance optimization (bundle code-splitting)
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const OrdersHistory = lazy(() => import("./pages/OrdersHistory.tsx"));
const Inventory = lazy(() => import("./pages/Inventory.tsx"));
const Cashbook = lazy(() => import("./pages/Cashbook.tsx"));
const CreateCashEntry = lazy(() => import("./pages/CreateCashEntry.tsx"));
const OnlineOrder = lazy(() => import("./pages/OnlineOrder.tsx"));
const Promotions = lazy(() => import("./pages/Promotions.tsx"));
const Loyalty = lazy(() => import("./pages/Loyalty.tsx"));
const Price = lazy(() => import("./pages/Price.tsx"));

const queryClient = new QueryClient();

const App = () => {
  // Check if current domain is for customers
  const isCustomerDomain = window.location.hostname === "moka.claro.vn";
  const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;

  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PWAUpdater />
        <Toaster />
        <Sonner />
        <AuthProvider>
          <Router>
            <Suspense fallback={
              <div className="flex h-screen items-center justify-center bg-background text-foreground font-semibold">
                Đang tải trang...
              </div>
            }>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/dat-hang" element={<OnlineOrder />} />
                <Route path="/price" element={<Price />} />
                <Route path="/bao-gia" element={<Price />} />
                
                {/* Public Home for Customers, Protected Home for POS */}
                {isCustomerDomain ? (
                  <Route path="/" element={<OnlineOrder />} />
                ) : (
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Index />} />
                  </Route>
                )}

                <Route element={<ProtectedRoute />}>
                  <Route path="/pos" element={<Index />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/orders-history" element={<OrdersHistory />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/cashbook" element={<Cashbook />} />
                  <Route path="/cashbook/create" element={<CreateCashEntry />} />
                  <Route path="/cashbook/:entryId/edit" element={<CreateCashEntry />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/loyalty" element={<Loyalty />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
