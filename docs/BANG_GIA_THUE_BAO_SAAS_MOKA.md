# ĐỀ ÁN CHUYỂN ĐỔI SANG MÔ HÌNH BÁN THUÊ BAO (SAAS - SOFTWARE AS A SERVICE) CHO MOKA POS

**Dự án:** Hệ thống Quản lý Bán hàng & Đặt hàng Moka (Momoka POS)  
**Ngày lập:** 22/07/2026  

---

## 🎯 I. TỔNG QUAN MÔ HÌNH THUÊ BAO SAAS (OVERVIEW)

Chuyển đổi từ mô hình **Bán trọn gói 1 lần** sang **Mô hình Thuê bao SaaS (Hàng tháng / Hàng năm)** mang lại 3 lợi ích chiến lược:
1. **Tạo dòng tiền ổn định (MRR/ARR)**: Thu phí định kỳ đều đặn hàng tháng/hàng năm từ hàng trăm, hàng ngàn cửa hàng.
2. **Hạ thấp rào cản gia nhập cho khách hàng**: Khách hàng không cần bỏ ra 10 triệu ngay từ đầu, chỉ cần từ **99k - 199k/tháng** là có thể bắt đầu sử dụng ngay.
3. **Mở rộng quy mô nhanh chóng (Scalability)**: Cho phép khách hàng tự đăng ký dùng thử (Self-service Trial) và kích hoạt tự động mà không cần nhân viên kỹ thuật đến tận nơi lắp đặt.

---

## 💰 II. BẢNG GIÁ THUÊ BAO ĐỀ XUẤT (SAAS PRICING TIERS)

| Gói Dịch Vụ | Giá Thuê Bao / Tháng | Thanh Toán Theo Năm (Giảm 20%) | Đối Tượng Phù Hợp | Tính Năng Nổi Bật |
| :--- | :---: | :---: | :--- | :--- |
| **GÓI BASIC** *(Cơ Bản)* | **99.000 VNĐ / tháng** | **950.000 VNĐ / năm** *(Chỉ 79k/tháng)* | Xe đẩy Takeaway, Quán cà phê nhỏ, Kiosk nhỏ | - 1 Tài khoản bán hàng POS<br>- Menu, biến thể món, topping<br>- Thanh toán QR VietQR tự động<br>- In hóa đơn bán hàng |
| **GÓI PRO** *(Nâng Cao)* | **199.000 VNĐ / tháng** | **1.900.000 VNĐ / năm** *(Chỉ 158k/tháng)* | Quán Cà phê, Trà sữa, Nhà hàng vừa & nhỏ *(Gói phổ biến nhất)* | - Full tính năng Gói Basic<br>- **Giao diện Bếp Realtime (KDS)**<br>- **Khách đặt hàng QR Code Online**<br>- **Quản lý Kho & Định lượng (BOM)**<br>- **Sổ quỹ Thu Chi & Báo cáo dòng tiền**<br>- **Khuyến mãi & Mã giảm giá**<br>- **Khách hàng thân thiết & Tích điểm** |
| **GÓI CHAIN** *(Đa Chi Nhánh)* | **399.000 VNĐ / cửa hàng / tháng** | **3.800.000 VNĐ / cửa hàng / năm** | Chuỗi từ 2 cửa hàng trở lên, Bếp trung tâm | - Full tính năng Gói Pro<br>- **Quản lý Đa chi nhánh tập trung**<br>- **Kho tổng & Bếp trung tâm**<br>- **Phân quyền nhân viên nâng cao**<br>- **Báo cáo COGS & Lợi nhuận ròng**<br>- App Windows (.exe) & Android (.apk)<br>- Support ưu tiên 24/7 |

🎁 **CHÍNH SÁCH DÙNG THỬ**: **14 Ngày Dùng Thử Miễn Phí (14-day Free Trial)** - Không cần thẻ tín dụng, đầy đủ tính năng Gói PRO.

---

## 🏗️ III. CÁC YÊU CẦU KỸ THUẬT CẦN NÂNG CẤP (TECHNICAL ROADMAP)

Để phần mềm Moka POS chạy được mô hình Thuê bao SaaS cho hàng ngàn cửa hàng cùng lúc, cần thực hiện 4 nâng cấp hạ tầng chính:

### 1. Kiến trúc Đa hộ kinh doanh (Multi-Tenancy Database Architecture)
- **Cấu hình bảng Tenants**: Tạo bảng `tenants` (hoặc `stores`) lưu thông tin cửa hàng, gói dịch vụ (`plan_type`), trạng thái thuê bao (`status`), ngày hết hạn (`expires_at`).
- **Phân lập dữ liệu (Row Level Security - RLS)**: Thêm cột `tenant_id` vào tất cả các bảng dữ liệu (`products`, `categories`, `orders`, `ingredients`, `cashbook`, `customers`).
- **Bảo mật RLS Supabase**: Đảm bảo cửa hàng A **tuyệt đối không xem hoặc sửa** được dữ liệu của cửa hàng B thông qua chính sách RLS `auth.jwt() -> tenant_id`.

### 2. Tự Động Hóa Thanh Toán & Gia Hạn Thuê Bao (Auto Billing via VietQR)
- **Tích hợp Webhook gia hạn**:
  1. Khách bấm "Gia hạn gói PRO 1 năm" trong trang Admin cửa hàng.
  2. Moka POS hiển thị mã QR VietQR động kèm nội dung chuyển khoản mã hóa: `GH MOKA [TENANT_ID] 12M`.
  3. Khi khách chuyển khoản thành công, Webhook n8n nhận thông báo từ ngân hàng $\rightarrow$ Tự động cộng **365 ngày** vào tài khoản cửa hàng và kích hoạt trạng thái `ACTIVE` ngay lập tức.
- **Cảnh báo hết hạn tự động**:
  - Gửi thông báo trên màn hình POS và tin nhắn Zalo trước 7 ngày, 3 ngày và 1 ngày khi gói cước sắp hết hạn.
  - Khi hết hạn: Tự động chuyển sang chế độ **Chỉ xem (Read-only)** hoặc khóa màn hình bán hàng, yêu cầu gia hạn để tiếp tục.

### 3. Quy Trình Đăng Ký Tự Động 1-Click (Self-Service Onboarding)
- **Trang Đăng ký SaaS (`moka.claro.vn/signup`)**:
  1. Chủ cửa hàng điền: *Tên Quán, Số điện thoại, Mật khẩu, Loại hình kinh doanh (Cà phê / Trà sữa / Nhà hàng)*.
  2. Hệ thống tự động tạo `tenant_id` mới.
  3. Nạp sẵn **Dữ liệu mẫu (Seed Data)** phù hợp với loại hình kinh doanh (ví dụ chọn Cà phê $\rightarrow$ Tự động nạp danh mục Cà phê, Trà trái cây, Công thức mẫu...).
  4. Đưa khách thẳng vào màn hình bán hàng POS trong chưa đầy 15 giây!

### 4. Bảng Điều Khiển Quản Trị SaaS Tổng (Super Admin Control Panel)
- Trang dành riêng cho chủ phần mềm Moka SaaS (`admin.moka.claro.vn`):
  - **Chỉ số kinh doanh SaaS**: Theo dõi chỉ số **MRR** (Doanh thu hàng tháng), **ARR** (Doanh thu hàng năm), Số cửa hàng đang hoạt động, Số cửa hàng sắp hết hạn.
  - **Quản lý Thuê bao**: Nút duyệt gia hạn thủ công, nâng/hạ gói cước, mở khóa / khóa tài khoản cửa hàng.
  - **Quản lý Mã Giới Thiệu / Đại Lý (Affiliate / Partner)**: Chiết khấu cho đại lý giới thiệu phần mềm Moka POS.

---

## 📈 IV. KẾ HOẠCH DOANH THU & TÍNH TOÁN ĐỂ CHUYỂN ĐỔI SAAS

### Bài toán Doanh thu Dự kiến (Revenue Projection):

| Quy Mô Khách Hàng | Cơ Cấu Gói Dịch Vụ | Doanh Thu Hàng Tháng (MRR) | Doanh Thu Hàng Năm (ARR) |
| :---: | :--- | :---: | :---: |
| **50 Cửa hàng** | 10 Basic (99k) + 40 Pro (199k) | **8.950.000 VNĐ / tháng** | **107.400.000 VNĐ / năm** |
| **200 Cửa hàng** | 40 Basic + 140 Pro + 20 Chain (399k) | **39.800.000 VNĐ / tháng** | **477.600.000 VNĐ / năm** |
| **500 Cửa hàng** | 100 Basic + 350 Pro + 50 Chain | **99.600.000 VNĐ / tháng** | **1.195.200.000 VNĐ / năm** |
| **1.000 Cửa hàng** | 200 Basic + 700 Pro + 100 Chain | **199.200.000 VNĐ / tháng** | **2.390.400.000 VNĐ / năm** |

---

## 🚀 V. TỔNG KẾT & CÁC BƯỚC THỰC HIỆN TIẾP THEO

Nếu chọn phát triển theo mô hình Thuê bao SaaS, lộ trình triển khai kỹ thuật 3 bước bao gồm:

1. **Bước 1 (1 - 2 tuần)**: Nâng cấp Database Supabase sang kiến trúc **Multi-Tenant (bảng `tenants` & cột `tenant_id` + RLS)**.
2. **Bước 2 (1 tuần)**: Xây dựng trang **Đăng ký dùng thử 14 ngày (`/signup`)** & Nạp dữ liệu mẫu tự động.
3. **Bước 3 (1 tuần)**: Xây dựng luồng **Quét VietQR Tự động Gia hạn Gói** & Trang **Super Admin Quản lý Thuê bao**.
