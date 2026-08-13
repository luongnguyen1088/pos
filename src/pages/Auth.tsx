import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandMark";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signOut, signUp, isLoading, isConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const next = location.state as { from?: string } | null;
    return next?.from || "/admin";
  }, [location.state]);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Vui lòng nhập email và mật khẩu");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        toast.success("Đăng nhập thành công");
        navigate(redirectTo, { replace: true });
      } else {
        const result = await signUp(email.trim(), password, fullName.trim());
        if (result.needsEmailConfirmation) {
          toast.success("Đăng ký thành công", {
            description: "Hãy kiểm tra email để xác nhận tài khoản trước khi đăng nhập.",
          });
          setMode("signin");
        } else {
          toast.success("Tạo tài khoản thành công");
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (error) {
      toast.error(mode === "signin" ? "Đăng nhập thất bại" : "Đăng ký thất bại", {
        description: error instanceof Error ? error.message : "Có lỗi xảy ra.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="rounded-2xl p-2 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {brand.authName}
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm shadow-primary/5">
          <div className="rounded-[28px] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_60%)] p-4">
            <div className="mb-3 flex items-center gap-3 text-primary">
              <LockKeyhole className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">Team Access</span>
            </div>
            <BrandLockup
              eyebrow="Operator Login"
              title="Tài khoản nhân viên Momoka"
              subtitle={brand.authLine}
            />
          </div>

          {!isConfigured ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5 text-sm text-foreground">
                <div className="font-bold text-amber-600 dark:text-amber-500 mb-1">Chế độ Offline (Cục bộ)</div>
                Hệ thống đang hoạt động không cần tài khoản đám mây. Dữ liệu bán hàng sẽ được lưu trực tiếp trên thiết bị này.
              </div>
              <button
                onClick={() => navigate(redirectTo, { replace: true })}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <LogIn className="h-4 w-4" />
                Vào phần mềm (Local POS)
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("moka_force_offline");
                    window.location.reload();
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Thử kết nối lại Online
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                {([
                  { id: "signin", label: "Đăng nhập" },
                  { id: "signup", label: "Đăng ký" },
                ] as { id: Mode; label: string }[]).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors",
                      mode === item.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {mode === "signup" ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Họ tên</label>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
                    placeholder="staff@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>

                {mode === "signup" ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Xác nhận mật khẩu
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                ) : null}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading || !isConfigured}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {mode === "signin" ? "Đăng nhập" : "Đăng ký"}
              </button>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "signin" ? "Đăng ký ngay" : "Đăng nhập"}
                </button>
              </div>

              <div className="mt-6 text-center border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("moka_force_offline", "true");
                    toast.success("Đã chuyển sang chế độ Offline (Cục bộ)");
                    window.location.reload();
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Chạy chế độ Offline (Local POS)
                </button>
              </div>
            </>
          )}
        </div>

        {isConfigured && !isLoading ? (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Nếu đã đăng nhập ở tab khác nhưng phiên lỗi, bạn có thể{" "}
            <button
              onClick={() => {
                void signOut().catch(() => undefined);
              }}
              className="font-semibold text-primary hover:underline"
            >
              đăng xuất toàn bộ
            </button>
            .
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Auth;
