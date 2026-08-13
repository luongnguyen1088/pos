import { formatOrderPrice, getKitchenStatusMeta, getOrderTypeLabel, type KitchenOrder } from "@/lib/orders";
import { brand } from "@/lib/brand";

type PrintMode = "receipt" | "kitchen";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPrintDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const buildReceiptMarkup = (order: KitchenOrder) => `
  <section class="card">
    ${order.paymentStatus === 'pending' ? `
      <div style="background: #000; color: #fff; text-align: center; padding: 4px 0; margin-bottom: 8px; border-radius: 2px;">
        <h2 style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 2px;">PHIEU TAM TINH</h2>
      </div>
    ` : ""}
    <div class="brand">
      <h1>${brand.name}</h1>
      <p class="tagline">${brand.categoriesTagline}</p>
      <p class="info">${brand.address}</p>
      <p class="info">SĐT: ${brand.storePhoneDisplay}</p>
    </div>
    <div class="meta-grid">
      <div><span>Ma don</span><strong>${escapeHtml(order.number)}</strong></div>
      <div><span>Thoi gian</span><strong>${escapeHtml(formatPrintDate(order.createdAt))}</strong></div>
      <div><span>Hinh thuc</span><strong>${escapeHtml(getOrderTypeLabel(order.orderType, order.orderInfo))}</strong></div>
      <div><span>Thanh toan</span><strong>${escapeHtml(order.paymentMethod)}</strong></div>
    </div>
    <div class="divider"></div>
    <div class="items">
      ${order.items
        .map(
          (item) => `
            <div class="item-row">
              <div>
                <div class="item-title">${item.quantity}x ${escapeHtml(item.name)}</div>
                ${item.variantName ? `<div class="item-sub">${escapeHtml(item.variantName)}</div>` : ""}
                ${item.options.length > 0 ? `<div class="item-sub">${escapeHtml(item.options.join(", "))}</div>` : ""}
                ${item.note ? `<div class="item-note">Ghi chu: ${escapeHtml(item.note)}</div>` : ""}
              </div>
              <strong>${escapeHtml(formatOrderPrice(item.totalPrice))}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="divider"></div>
    <div class="summary">
      <div><span>So mon</span><strong>${order.itemCount}</strong></div>
      <div><span>Tam tinh</span><strong>${escapeHtml(formatOrderPrice(order.subtotal))}</strong></div>
      ${
        order.discountAmount > 0
          ? `<div><span>Giam gia</span><strong>- ${escapeHtml(formatOrderPrice(order.discountAmount))}</strong></div>`
          : ""
      }
      <div class="total"><span>Tong cong</span><strong>${escapeHtml(formatOrderPrice(order.total))}</strong></div>
      ${order.customerPhone ? `
        <div style="border-top: 1px dashed rgba(0, 0, 0, 0.4); padding-top: 6px; margin-top: 6px; font-size: 8px; font-weight: bold; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;"><span>Khach hang (SDT):</span> <span>${escapeHtml(order.customerPhone)}</span></div>
          ${order.earnedPoints ? `<div style="display: flex; justify-content: space-between;"><span>Diem tich luy:</span> <span>+${escapeHtml(formatOrderPrice(order.earnedPoints)).replace('đ', '')} diem</span></div>` : ""}
          ${order.spentPoints ? `<div style="display: flex; justify-content: space-between;"><span>Diem da dung:</span> <span>-${escapeHtml(formatOrderPrice(order.spentPoints)).replace('đ', '')} diem</span></div>` : ""}
        </div>
      ` : ""}
    </div>
    
    <div class="payment-qr">
      <p>Quét mã để thanh toán</p>
      <div class="qr-container">
        <img src="https://img.vietqr.io/image/${brand.bankId}-${brand.bankAccount}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(`MOKA ${order.number}`)}&accountName=${brand.bankAccountName}&addTag=1" alt="VietQR" />
      </div>

      <div style="font-size: 8px; font-weight: bold; line-height: 1.3; text-align: center; margin: 6px 0; border: 1px solid #000; padding: 4px; border-radius: 2px;">
        <div>Ngân hàng: VietinBank</div>
        <div>STK: ${brand.bankAccount}</div>
        <div>Chủ TK: ${brand.bankAccountName}</div>
      </div>

      <p class="method">Phương thức: <strong>${escapeHtml(order.paymentMethod)}</strong></p>
    </div>

    ${order.paymentStatus === 'pending' ? `
      <div class="payment-status-paid" style="border: 2px dashed #000; color: #000; font-weight: bold; background: transparent;">
        <strong>PHIEU TAM TINH - CHUA THANH TOAN</strong>
      </div>
    ` : `
      <div class="payment-status-paid" style="border: 2px solid #000; color: #000; font-weight: bold;">
        <strong>DA THANH TOAN</strong>
      </div>
    `}

    <div class="footer">
      <p style="font-size: 8px; font-weight: bold; margin-bottom: 6px; line-height: 1.3; text-align: center;">
        Quý khách vui lòng cung cấp Số điện thoại khi đặt hàng để được tích điểm đổi quà!
      </p>
      <p class="thanks">Cảm ơn & Hẹn gặp lại!</p>
    </div>
  </section>
`;

const buildKitchenMarkup = (order: KitchenOrder) => {
  const status = getKitchenStatusMeta(order.status);

  return `
    <section class="card kitchen">
      <div class="brand">
        <h1>${brand.kitchenName}</h1>
        <p>${escapeHtml(order.number)} • ${escapeHtml(status.label)}</p>
      </div>
      <div class="meta-grid">
        <div><span>Thoi gian</span><strong>${escapeHtml(formatPrintDate(order.createdAt))}</strong></div>
        <div><span>Loai don</span><strong>${escapeHtml(getOrderTypeLabel(order.orderType, order.orderInfo))}</strong></div>
      </div>
      <div class="divider"></div>
      <div class="items">
        ${order.items
          .map(
            (item) => `
              <div class="kitchen-item">
                <div class="kitchen-qty">${item.quantity}x</div>
                <div class="kitchen-content">
                  <div class="item-title">${escapeHtml(item.name)}</div>
                  ${item.variantName ? `<div class="item-sub">${escapeHtml(item.variantName)}</div>` : ""}
                  ${item.options.length > 0 ? `<div class="item-sub">${escapeHtml(item.options.join(", "))}</div>` : ""}
                  ${item.note ? `<div class="item-note">Ghi chu: ${escapeHtml(item.note)}</div>` : ""}
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
};

const buildDocument = (order: KitchenOrder, mode: PrintMode) => {
  const billWidth = typeof window !== "undefined" ? (localStorage.getItem("print-bill-width") || "80") : "80";
  const printableWidth = billWidth === "80" ? 72 : 48; // Khổ in thực tế K80 là 72mm, K58 là 48mm

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>${mode === "receipt" ? "Hoa don" : "Phieu bep"} ${escapeHtml(order.number)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 10px;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #fff4f4;
        color: #000000;
      }
      .card {
        max-width: 420px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #000000;
        border-radius: 12px;
        padding: 14px;
      }
      .brand {
        text-align: center;
      }
      .brand h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 900;
        text-transform: uppercase;
        color: #000000;
      }
      .brand p {
        margin: 2px 0 0;
        color: #000000;
        font-size: 10px;
        font-weight: bold;
      }
      .brand p.tagline {
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .brand p.info {
        font-size: 9px;
        font-weight: bold;
      }
      .meta-grid {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 10px;
      }
      .meta-grid span,
      .summary span {
        display: block;
        color: #000000;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: bold;
      }
      .meta-grid strong,
      .summary strong {
        display: block;
        margin-top: 2px;
        font-size: 11.5px;
        font-weight: bold;
        color: #000000;
      }
      .summary .total {
        border-top: 2px solid #000000;
        padding-top: 6px;
        margin-top: 2px;
      }
      .summary .total strong {
        font-size: 16px;
        font-weight: 900;
      }
      .payment-qr, .payment-status-paid {
        text-align: center;
        margin-top: 10px;
        padding: 10px;
        border: 2px solid #000000;
        border-radius: 8px;
        color: #000000;
      }
      .payment-qr p {
        margin: 0 0 6px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .payment-qr .qr-container img {
        width: 180px; /* Tăng cỡ QR lên 150% (từ 120px lên 180px) */
        height: 180px;
        border: 1px solid #000000;
        padding: 2px;
      }
      .payment-qr .method {
        margin-top: 6px;
        font-size: 9.5px;
        font-weight: bold;
      }
      .payment-status-paid {
        border-color: #000000;
        color: #000000;
        font-size: 13px;
        letter-spacing: 2px;
        font-weight: bold;
      }
      .footer {
        margin-top: 14px;
        text-align: center;
        border-top: 1.5px solid #000000;
        padding-top: 10px;
      }
      .footer p {
        margin: 2px 0;
        font-size: 9.5px;
        color: #000000;
        font-weight: bold;
      }
      .footer .qr-container {
        display: flex;
        justify-content: center;
        margin: 6px 0;
      }
      .footer .qr-container img {
        width: 80px;
        height: 80px;
        border: 1px solid #000000;
        padding: 2px;
        background: white;
      }
      .footer .url {
        margin-bottom: 8px;
      }
      .footer .thanks {
        margin-top: 4px;
        font-weight: bold;
        text-transform: uppercase;
        color: #000000;
      }
      .divider {
        border-top: 1.5px solid #000000;
        margin: 10px 0;
      }
      .items {
        display: grid;
        gap: 8px;
      }
      .item-row,
      .kitchen-item {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .item-title {
        font-size: 11.5px;
        font-weight: bold;
        color: #000000;
      }
      .item-sub {
        margin-top: 2px;
        color: #000000;
        font-size: 9.5px;
        font-weight: bold;
      }
      .item-note {
        margin-top: 3px;
        color: #000000;
        font-size: 9.5px;
        font-weight: bold;
        font-style: italic;
      }
      .summary {
        display: grid;
        gap: 6px;
      }
      .total strong {
        font-size: 15px;
      }
      .kitchen .item-title {
        font-size: 14px;
      }
      .kitchen-qty {
        min-width: 40px;
        font-size: 16px;
        font-weight: 800;
        color: #000000;
      }
      .kitchen-content {
        flex: 1;
      }
      @media print {
        body {
          background: white;
          padding: 0;
        }
        .card {
          border: none;
          border-radius: 0;
          width: ${printableWidth}mm;
          max-width: ${printableWidth}mm;
          padding: 2mm 4mm 2mm 2mm;
          margin: 0 auto;
          box-sizing: border-box;
        }
      }
    </style>
  </head>
  <body>
    ${mode === "receipt" ? buildReceiptMarkup(order) : buildKitchenMarkup(order)}
    <script>
      window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 150);
      };
    </script>
  </body>
</html>`;
};

export const printOrder = (order: KitchenOrder, mode: PrintMode) => {
  if (typeof window === "undefined") {
    return;
  }

  const popup = window.open("", "_blank", "width=520,height=720");
  if (!popup) {
    throw new Error("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
  }

  popup.document.open();
  popup.document.write(buildDocument(order, mode));
  popup.document.close();
};
