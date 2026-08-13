import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const ProtectedRoute = () => {
  const location = useLocation();
  const { user, isLoading, isConfigured } = useAuth();

  if (!isConfigured) {
    // Nếu chưa cấu hình Supabase thực tế, tự động cho phép vào POS ở chế độ Local (Offline)
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
