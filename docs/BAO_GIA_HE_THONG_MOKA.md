# BẢNG BÁO GIÁ DỰ ÁN XÂY DỰNG HỆ THỐNG QUẢN LÝ BÁN HÀNG MOKA (MOMOKA POS)

**Kính gửi:** Quý Khách hàng / Quý Đối tác  
**Tên dự án:** Hệ thống Quản lý Bán hàng, Kho & Đặt hàng Đa nền tảng (Moka POS System)  
**Ngày lập báo giá:** 22/07/2026  
**Đơn vị phát triển:** Đội ngũ Phát triển Phần mềm Moka  
**Hiệu lực báo giá:** 30 ngày kể từ ngày lập  

---

## I. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

Hệ thống **Moka POS** là giải pháp phần mềm quản lý bán hàng toàn diện, thiết kế tối ưu cho ngành F&B (Nhà hàng, Quán cà phê, Trà sữa, Đồ ăn nhanh). Hệ thống hỗ trợ đa nền tảng, hoạt động mượt mà trên cả trình duyệt Web, Ứng dụng Desktop (Windows) và Ứng dụng Di động (Android).

### Key Technical Stack & Architecture:
- **Frontend Web & Mobile App**: React 18, Vite, TypeScript, TailwindCSS, Shadcn UI, Lucide Icons.
- **Desktop Application**: Electron Framework (Xuất file cài đặt `.exe` độc lập).
- **Mobile Application**: Capacitor Framework (Xuất file ứng dụng `.apk` Android).
- **Backend & Database**: Supabase Serverless Platform (PostgreSQL Database, Row Level Security, Supabase Auth, Storage).
- **Realtime Sync**: Supabase Realtime Engine (Đồng bộ tức thì giữa POS - Bếp - Đặt hàng Online).
- **Tự động hóa & Thanh toán**: Webhook n8n (Tự động đối soát và xác nhận thanh toán chuyển khoản ngân hàng qua VietQR/SeABank động).
- **In ấn chuyên nghiệp**: Tích hợp QZ Tray & Direct Thermal Print (ESC/POS) in hóa đơn và phiếu bếp.

---

## II. BẢNG BÁO GIÁ CHI TIẾT THEO PHÂN HỆ (MODULE BREAKDOWN)

| STT | Phân hệ / Module | Chi tiết Chức năng | Chi phí Thiết lập (VNĐ) |
| :---: | :--- | :--- | :---: |
| **1** | **Giao diện Bán hàng (POS Core)** | - Giao diện chọn món trực quan, phân loại danh mục.<br>- Chọn biến thể (Size), Topping, ghi chú món ăn.<br>- Quản lý giỏ hàng, áp mã giảm giá, chiết khấu hóa đơn.<br>- Quản lý sơ đồ bàn, mang về (Takeaway), giao hàng.<br>- Thanh toán đa phương thức: Tiền mặt, QR Code VietQR động.<br>- Tích hợp Webhook n8n tự động xác nhận chuyển khoản Ngân hàng.<br>- Tích hợp in hóa đơn & phiếu bếp qua trình duyệt / QZ Tray / ESC-POS. | **3.000.000** |
| **2** | **Giao diện Khách đặt hàng Online (QR Order)** | - Trang web công khai cho khách quét mã QR tại bàn hoặc truy cập từ xa (`/dat-hang`).<br>- Giao diện tối ưu Mobile, xem menu, tùy chỉnh món & topping.<br>- Đặt hàng trực tuyến, tự động đẩy đơn Realtime về giao diện POS & Bếp. | **1.500.000** |
| **3** | **Giao diện Bếp & Pha chế (KDS)** | - Nhận thông báo đơn hàng mới theo thời gian thực (Supabase Realtime).<br>- Hiển thị chi tiết danh sách món cần chế biến, ghi chú của khách.<br>- Cập nhật trạng thái chế biến (Đang làm $\rightarrow$ Hoàn thành $\rightarrow$ Đã giao). | **1.000.000** |
| **4** | **Quản lý Kho & Định lượng (Inventory & BOM)** | - Quản lý danh mục nguyên vật liệu, đơn vị tính, nhà cung cấp, vị trí kho.<br>- Cấu hình Định lượng sản phẩm (Công thức/BOM - Bill of Materials).<br>- Tự động trừ tồn kho nguyên liệu tương ứng khi bán hàng.<br>- Tạo và quản lý Phiếu nhập kho, Phiếu xuất kho, Kiểm kho, Điều chuyển kho.<br>- Cảnh báo tồn kho dưới mức tối thiểu. | **1.500.000** |
| **5** | **Sổ quỹ Thu Chi & Khuyến mãi (Cashbook & Promo)** | - Quản lý phiếu Thu / phiếu Chi (Tiền mặt, Ngân hàng), báo cáo tồn quỹ.<br>- Tạo mã giảm giá (theo %, theo tiền cố định, tặng quà), cài đặt điều kiện áp dụng. | **1.000.000** |
| **6** | **Khách hàng thân thiết & Tích điểm (Loyalty & CRM)** | - Quản lý thông tin khách hàng, lịch sử mua hàng.<br>- Tích điểm tự động, phân hạng thành viên (Đồng, Bạc, Vàng, Kim Cương). | **1.000.000** |
| **7** | **Quản trị Hệ thống, Phân quyền & Báo cáo** | - Quản lý danh mục, sản phẩm, giá bán, tài khoản nhân viên & phân quyền.<br>- Báo cáo doanh thu theo ngày/tháng, đồ thị trực quan (Recharts), top bán chạy, lợi nhuận. | **1.000.000** |

---

## III. TỔNG HỢP CHI PHÍ & PHÍ DUY TRÌ (COST & MAINTENANCE SUMMARY)

### 1. Chi phí Khởi tạo & Triển khai Trọn gói (One-time Setup Fee)

| STT | Danh mục Chi phí | Ghi chú | Thành tiền (VNĐ) |
| :---: | :--- | :--- | :---: |
| **1** | **Chi phí Phát triển & Khởi tạo Phần mềm** | Bao gồm toàn bộ 7 nhóm chức năng nêu trên | 10.000.000 |
| **2** | **Đóng gói Đa nền tảng (Windows & Android)** | File `.exe` cho máy tính và `.apk` cho máy bán hàng/điện thoại | Tặng kèm |
| **3** | **Cấu hình Hạ tầng Cloud & Webhook VietQR** | Cấu hình Supabase Database, Webhook n8n ngân hàng | Tặng kèm |
| **TỔNG** | **TỔNG CHI PHÍ KHỞI TẠO HỆ THỐNG** | **Bàn giao trọn gói hệ thống Moka POS** | **10.000.000 VNĐ** |

*(Bằng chữ: Mười triệu đồng chẵn)*

---

### 2. Phí Duy trì Service & Máy chủ Cloud (Monthly Maintenance Fee)

| Danh mục Dịch vụ | Đơn giá hàng tháng | Phương thức Thanh toán |
| :--- | :---: | :---: |
| **Phí Duy trì Hạ tầng Cloud & Bảo trì Kỹ thuật** | **200.000 VNĐ / tháng** | Đóng theo năm (2.400.000 VNĐ/năm) hoặc đóng theo quý |

**Phí duy trì 200.000 VNĐ/tháng bao gồm các quyền lợi:**
- **Hạ tầng máy chủ Cloud**: Máy chủ Supabase PostgreSQL Database & Realtime Pub/Sub Engine hoạt động 24/7.
- **Hạ tầng Webhook n8n Banking**: Duy trì hệ thống tự động gạch nợ chuyển khoản ngân hàng qua VietQR.
- **Hosting & Domain SSL**: Lưu trữ Webapp đặt hàng online & POS trên Vercel Cloud bảo mật SSL.
- **Bảo trì & Hỗ trợ kỹ thuật**: Hỗ trợ vận hành, khắc phục sự cố kỹ thuật 24/7, cam kết xử lý sự cố gián đoạn trong 2 - 4h.
- **Cập nhật phần mềm**: Cập nhật các bản sửa lỗi nhỏ và nâng cấp hiệu năng định kỳ.

---

## IV. LỘ TRÌNH TRIỂN KHAI DỰ ÁN (IMPLEMENTATION TIMELINE)

Tổng thời gian triển khai & bàn giao: **02 - 03 tuần** kể từ ngày ký hợp đồng.

1. **Giai đoạn 1: Khởi tạo CSDL & Cấu hình Menu/Hệ thống (Tuần 1)**
   - Khởi tạo cơ sở dữ liệu Supabase PostgreSQL & phân quyền RLS.
   - Nạp danh mục món, topping, nguyên liệu và thông tin cửa hàng.
2. **Giai đoạn 2: Cấu hình Webhook VietQR & Đóng gói App (Tuần 2)**
   - Cấu hình Webhook n8n tự động xác nhận chuyển khoản ngân hàng.
   - Đóng gói file cài đặt Windows Desktop (`.exe`) & Android (`.apk`).
3. **Giai đoạn 3: Kiểm thử, Hướng dẫn & Bàn giao (Tuần 3)**
   - Hướng dẫn nhân viên & chủ cửa hàng thao tác bán hàng, kiểm kho, xem báo cáo.
   - Bàn giao hệ thống chính thức đưa vào vận hành.

---

## V. ĐIỀU KHOẢN THANH TOÁN & BẢO HÀNH (TERMS & WARRANTY)

### 1. Tiến độ Thanh toán:
- **Đợt 1 (Tạm ứng 50%)**: **5.000.000 VNĐ** ngay sau khi ký hợp đồng chính thức.
- **Đợt 2 (Nghiệm thu & Bàn giao - 50%)**: **5.000.000 VNĐ** + **Phí duy trì năm đầu (2.400.000 VNĐ)** khi nghiệm thu bàn giao trọn gói hệ thống.

### 2. Cam kết Bàn giao & Bảo hành:
- **Bàn giao**: Toàn bộ hệ thống hoạt động hoàn chỉnh, File cài đặt Windows Desktop (`.exe`), Android (`.apk`), Tài khoản quản trị Supabase Cloud & Hướng dẫn sử dụng.
- **Bảo hành & Hỗ trợ**: Hỗ trợ xuyên suốt theo gói phí duy trì 200k/tháng.

---

**ĐẠI DIỆN ĐƠN VỊ PHÁT TRIỂN**  
*(Ký, ghi rõ họ tên)*
