import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Monitor,
  Cloud,
  Zap,
  Printer,
  QrCode,
  ChefHat,
  Boxes,
  Coins,
  Gift,
  Users,
  BarChart3,
  HelpCircle,
  Phone,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Headphones,
  FileSpreadsheet,
  Rocket,
  Lock,
  Layers
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandMark";
import { toast } from "sonner";

export const Price: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeType, setStoreType] = useState("Quán Cà phê / Trà sữa");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Vui lòng nhập Họ tên và Số điện thoại!");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConsultModal(false);
      toast.success("Gửi yêu cầu thành công!", {
        description: "Đội ngũ Moka POS sẽ liên hệ tư vấn và demo trực tiếp cho bạn trong vòng 15 phút.",
      });
      setCustomerName("");
      setPhone("");
      setNote("");
    }, 800);
  };

  const faqs = [
    {
      q: "Chi phí 10 triệu đã bao gồm những tính năng nào?",
      a: "Trọn gói 10.000.000 VNĐ đã bao gồm đầy đủ tất cả các phân hệ: Giao diện Bán hàng POS, Giao diện Bếp realtime, Đặt hàng Online qua QR, Quản lý Kho & Định lượng nguyên liệu (BOM), Sổ quỹ thu chi, Khuyến mãi voucher, Khách hàng thân thiết tích điểm, Báo cáo doanh thu & Đóng gói App Desktop (.exe) + Mobile Android (.apk)."
    },
    {
      q: "Phí duy trì 200.000 VNĐ / tháng bao gồm những quyền lợi gì?",
      a: "Phí 200k/tháng chi trả cho hạ tầng máy chủ Supabase Cloud Database (PostgreSQL) 24/7, hệ thống Webhook n8n tự động xác nhận chuyển khoản ngân hàng qua VietQR, Vercel Web Hosting bảo mật SSL, bảo trì kỹ thuật, sửa lỗi gián đoạn 24/7 và cập nhật tính năng mới miễn phí."
    },
    {
      q: "Tôi có cần mua thêm máy POS hoặc thiết bị phần cứng đắt tiền không?",
      a: "Không bắt buộc. Moka POS chạy mượt mà trên máy tính Windows có sẵn, máy tính bảng, điện thoại Android hoặc máy in hóa đơn khổ 80mm/58mm chuẩn ESC-POS/QZ Tray thông thường."
    },
    {
      q: "Khi khách quét VietQR chuyển khoản, đơn hàng có tự động xác nhận không?",
      a: "Có! Tích hợp Webhook n8n thông minh giúp đối soát mã đơn hàng và số tiền chuyển khoản theo thời gian thực. Ngay khi tiền về tài khoản, phần mềm tự động đổi trạng thái đơn sang 'Đã thanh toán' mà không cần nhân viên chụp màn hình hay bấm tay."
    },
    {
      q: "Hệ thống có tự động trừ kho nguyên liệu khi bán hàng không?",
      a: "Có. Bạn chỉ cần cài đặt công thức định lượng (BOM) cho món (ví dụ: 1 ly Trà sữa truyền thống = 30g Bột trà + 20ml Sữa đặc + 50g Trân châu), mỗi khi bán 1 ly, kho nguyên liệu tương ứng sẽ tự động trừ chính xác."
    },
    {
      q: "Tôi muốn tự tải ứng dụng về trải nghiệm dùng thử trước được không?",
      a: "Hoàn toàn được! Bạn có thể nhấn nút 'Dùng thử Demo' hoặc truy cập tính năng Đặt hàng online ngay trên trang web để trải nghiệm luồng bán hàng thực tế."
    }
  ];

  const featuresList = [
    {
      icon: <Monitor className="h-5 w-5 text-amber-500" />,
      title: "Giao diện POS Bán hàng",
      desc: "Giao diện chọn món nhanh, tùy chỉnh biến thể (size, topping), sơ đồ bàn, mang về, giao hàng, in hóa đơn & phiếu bếp."
    },
    {
      icon: <QrCode className="h-5 w-5 text-emerald-500" />,
      title: "Đặt hàng Online QR Code",
      desc: "Trang web đặt món công khai tại bàn hoặc từ xa. Khách hàng quét mã QR menu, gửi đơn trực tiếp về máy POS & Bếp."
    },
    {
      icon: <ChefHat className="h-5 w-5 text-indigo-500" />,
      title: "Giao diện Bếp Realtime (KDS)",
      desc: "Giao diện dành riêng cho khu vực pha chế/bếp. Tự động nhận đơn hàng mới theo thời gian thực và quản lý trạng thái làm món."
    },
    {
      icon: <Zap className="h-5 w-5 text-amber-400" />,
      title: "Tự động gạch nợ VietQR (n8n)",
      desc: "Webhook thông minh tự động đối soát tiền về ngân hàng qua mã QR động, xác nhận thanh toán tức thì."
    },
    {
      icon: <Boxes className="h-5 w-5 text-blue-500" />,
      title: "Quản lý Kho & Định lượng (BOM)",
      desc: "Quản lý nguyên liệu, nhà cung cấp, công thức món. Tự động trừ kho khi bán và cảnh báo tồn kho tối thiểu."
    },
    {
      icon: <Coins className="h-5 w-5 text-emerald-400" />,
      title: "Sổ quỹ & Báo cáo Thu Chi",
      desc: "Quản lý phiếu thu, phiếu chi tiền mặt và ngân hàng. Theo dõi dòng tiền thực tế và tồn quỹ minh bạch."
    },
    {
      icon: <Gift className="h-5 w-5 text-pink-500" />,
      title: "Khuyến mãi & Mã giảm giá",
      desc: "Tạo mã giảm giá theo %, tiền cố định hoặc quà tặng. Thiết lập điều kiện áp dụng và giới hạn lượt dùng."
    },
    {
      icon: <Users className="h-5 w-5 text-purple-500" />,
      title: "Khách hàng & Tích điểm (CRM)",
      desc: "Lưu lịch sử mua hàng, tích điểm tự động theo doanh số và phân hạng thành viên (Vàng, Bạc, Kim Cương)."
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-cyan-500" />,
      title: "Báo cáo Doanh thu & Lợi nhuận",
      desc: "Đồ thị biểu đồ trực quan, phân tích top món bán chạy, báo cáo lợi nhuận gộp và lịch sử giao dịch chi tiết."
    },
    {
      icon: <Smartphone className="h-5 w-5 text-rose-500" />,
      title: "Đóng gói App Windows & Android",
      desc: "Xuất ứng dụng cài đặt mượt mà cho máy tính Windows (.exe) và máy POS/điện thoại Android (.apk)."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLockup title="Moka POS" subtitle="Phần mềm quản lý bán hàng F&B" />
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#tinh-nang" className="transition-colors hover:text-foreground">Tính năng</a>
            <a href="#bang-gia" className="transition-colors hover:text-foreground">Bảng giá</a>
            <a href="#ha-tang" className="transition-colors hover:text-foreground">Hạ tầng & Dịch vụ</a>
            <a href="#faq" className="transition-colors hover:text-foreground">Hỏi đáp</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dat-hang"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors"
            >
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Demo Đặt Món
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              Đăng nhập POS
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6 shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>Giải Pháp Bán Hàng & Quản Lý Kho F&B Đa Nền Tảng</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Bảng Giá Hệ Thống <span className="bg-gradient-to-r from-amber-500 via-primary to-emerald-500 bg-clip-text text-transparent">Moka POS</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Sở hữu trọn gói giải pháp quản lý bán hàng chuyên nghiệp cho Nhà hàng, Quán Cà phê, Trà sữa & Đồ ăn nhanh. Đồng bộ Realtime từ POS bán hàng đến Bếp pha chế & Đặt hàng QR Online.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowConsultModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
            >
              <Phone className="h-4 w-4" />
              Đăng Ký Tư Vấn Trọn Gói
            </button>
            <a
              href="#bang-gia"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Xem Chi Tiết Báo Giá
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          {/* Quick stats badges */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
              <div className="text-2xl font-black text-amber-500">10 Tr VNĐ</div>
              <div className="text-xs text-muted-foreground mt-1">Khởi tạo trọn gói 1 lần</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
              <div className="text-2xl font-black text-emerald-500">200K / tháng</div>
              <div className="text-xs text-muted-foreground mt-1">Phí máy chủ & Bảo trì</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
              <div className="text-2xl font-black text-primary">100% Realtime</div>
              <div className="text-xs text-muted-foreground mt-1">Đồng bộ POS - Bếp - QR</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
              <div className="text-2xl font-black text-indigo-500">Đa nền tảng</div>
              <div className="text-xs text-muted-foreground mt-1">Web, Windows & Android</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Card Section */}
      <section id="bang-gia" className="py-12 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold sm:text-3xl">Gói Giải Pháp Trọn Gói Moka POS</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Không chi phí ẩn - Đầy đủ tất cả các tính năng nâng cao & hỗ trợ đa nền tảng
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-[32px] border-2 border-primary bg-card p-6 sm:p-10 shadow-2xl shadow-primary/10">
              {/* Badge Most Popular */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-primary px-4 py-1 text-xs font-bold text-white shadow-md flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                GÓI GIẢI PHÁP ĐƯỢC CHỌN NHIỀU NHẤT
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">Moka POS All-In-One</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dành cho Quán Cà phê, Trà sữa, Nhà hàng, Quán ăn nhanh
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-primary">10.000.000</span>
                    <span className="text-sm font-semibold text-muted-foreground">VNĐ / Trọn gói</span>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <Cloud className="h-3.5 w-3.5" />
                    + Phí duy trì máy chủ: 200.000 VNĐ / tháng
                  </div>
                </div>
              </div>

              {/* Package includes checklist */}
              <div className="py-8">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Bao gồm đầy đủ các phân hệ & quyền lợi:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    "Giao diện POS Bán hàng & In hóa đơn / phiếu bếp",
                    "Giao diện Khách đặt hàng QR Code Online",
                    "Giao diện Bếp & Pha chế Realtime (KDS)",
                    "Tự động gạch nợ VietQR động (Webhook n8n)",
                    "Quản lý Kho & Định lượng nguyên liệu (BOM)",
                    "Sổ quỹ Thu Chi & Báo cáo dòng tiền",
                    "Chương trình Khuyến mãi, Mã giảm giá",
                    "Khách hàng thân thiết & Tích điểm (Loyalty)",
                    "Báo cáo Doanh thu & Lợi nhuận (Recharts)",
                    "Đóng gói App Windows (.exe) & Android (.apk)",
                    "Cấu hình Database Supabase Cloud 24/7",
                    "Bảo trì & Hỗ trợ kỹ thuật 24/7"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm">
                      <div className="mt-0.5 rounded-full bg-emerald-500/15 p-0.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action area */}
              <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground text-center sm:text-left">
                  ⚡ Triển khai & Bàn giao hệ thống hoàn chỉnh trong <strong className="text-foreground">2 - 3 tuần</strong>
                </div>
                <button
                  onClick={() => setShowConsultModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  <Rocket className="h-4 w-4" />
                  Đăng Ký Khởi Tạo Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Grid */}
      <section id="tinh-nang" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Chi Tiết Các Phân Hệ Chức Năng</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Moka POS được xây dựng đầy đủ các công cụ để bạn vận hành quán mượt mà, tối ưu nhân sự và quản lý dòng tiền chặt chẽ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresList.map((feat, idx) => (
              <div
                key={idx}
                className="group rounded-3xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-border bg-muted/60 p-3 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maintenance & Infrastructure Section */}
      <section id="ha-tang" className="py-16 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Cloud className="h-3.5 w-3.5" />
                <span>Hạ Tầng Cloud & Dịch Vụ Vận Hành</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Phí duy trì 200.000 VNĐ / tháng mang lại giá trị gì?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chúng tôi chịu trách nhiệm toàn bộ về hạ tầng máy chủ đám mây, bảo mật dữ liệu và hỗ trợ kỹ thuật để bạn yên tâm tập trung phát triển kinh doanh.
              </p>

              <div className="space-y-4">
                {[
                  {
                    title: "Hạ tầng Database Supabase Cloud 24/7",
                    desc: "Cơ sở dữ liệu PostgreSQL chuẩn enterprise, đồng bộ dữ liệu siêu tốc Realtime giữa các thiết bị."
                  },
                  {
                    title: "Tự động gạch nợ Ngân hàng VietQR (n8n)",
                    desc: "Hệ thống tự động lắng nghe báo có ngân hàng và cập nhật đơn hàng đã thanh toán tức thì."
                  },
                  {
                    title: "Bảo trì & Hỗ trợ kỹ thuật 24/7",
                    desc: "Đội ngũ kỹ thuật túc trực khắc phục sự cố, giải đáp thắc mắc và xử lý gián đoạn trong 2 - 4h."
                  },
                  {
                    title: "Cập nhật ứng dụng & An toàn dữ liệu",
                    desc: "Dữ liệu được sao lưu định kỳ, bảo mật theo chuẩn Row Level Security (RLS) và cập nhật vá lỗi tự động."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="mt-1 rounded-full bg-primary/10 p-1 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-[32px] border border-border bg-card p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Bảng Tổng Hợp Chi Phí</h3>
                    <p className="text-xs text-muted-foreground">Minh bạch - Không phụ phí</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border/60">
                    <span className="text-muted-foreground">Chi phí khởi tạo hệ thống (1 lần):</span>
                    <span className="font-bold text-foreground">10.000.000 VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/60">
                    <span className="text-muted-foreground">Phí máy chủ & duy trì hàng tháng:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">200.000 VNĐ / tháng</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/60">
                    <span className="text-muted-foreground">Phí đóng gói App Windows (.exe):</span>
                    <span className="font-bold text-primary">Miễn phí (Tặng kèm)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/60">
                    <span className="text-muted-foreground">Phí đóng gói App Android (.apk):</span>
                    <span className="font-bold text-primary">Miễn phí (Tặng kèm)</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Bảo hành & Hỗ trợ kỹ thuật:</span>
                    <span className="font-bold text-foreground">Xuyên suốt thời gian sử dụng</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowConsultModal(true)}
                  className="mt-6 w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
                >
                  Nhận Báo Giá Chi Tiết Qua Zalo / Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
              <HelpCircle className="h-4 w-4" />
              <span>Giải Đáp Thắc Mắc</span>
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">Câu Hỏi Thường Gặp</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-12 bg-gradient-to-br from-primary/15 via-background to-emerald-500/10 border-t border-border">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">
            Sẵn Sàng Mở Rộng & Tối Ưu Quản Lý Cửa Hàng Bằng Moka POS?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Liên hệ ngay hôm nay để nhận báo giá chi tiết, trải nghiệm bản demo trực tiếp và nhận ưu đãi hỗ trợ khởi tạo nhanh.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowConsultModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity"
            >
              <Phone className="h-4 w-4" />
              Đăng Ký Tư Vấn Ngay
            </button>
            <Link
              to="/dat-hang"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Trải Nghiệm Đặt Món QR
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <p>© 2026 Moka POS System. All rights reserved.</p>
        </div>
      </footer>

      {/* Modal Consultation Form */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setShowConsultModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              ✕
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-foreground">Đăng Ký Tư Vấn & Demo Moka POS</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại ngay cho bạn!
              </p>
            </div>

            <form onSubmit={handleConsultSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Họ tên của bạn *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập họ tên"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Số điện thoại / Zalo *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Mô hình cửa hàng</label>
                <select
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="Quán Cà phê / Trà sữa">Quán Cà phê / Trà sữa</option>
                  <option value="Nhà hàng / Quán ăn">Nhà hàng / Quán ăn</option>
                  <option value="Quán Đồ ăn nhanh / Fastfood">Quán Đồ ăn nhanh / Fastfood</option>
                  <option value="Mô hình Khác">Mô hình Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yêu cầu tư vấn thêm..."
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi Yêu Cầu Tư Vấn"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Price;
