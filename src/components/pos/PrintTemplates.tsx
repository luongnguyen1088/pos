import React from "react";
import { type CartItem } from "@/data/products";
import { brand } from "@/lib/brand";

interface PrintData {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  discountAmount: number;
  paymentMethod: string;
  orderType: string;
  orderInfo: string;
  createdAt: string;
  paymentStatus?: string;
  customerPhone?: string | null;
  earnedPoints?: number;
  spentPoints?: number;
}

const BANK_ACCOUNT = {
  ownerName: brand.bankAccountName,
  bankName: "VietinBank",
  bankCode: "970415",
  accountNumber: brand.bankAccount,
};

export const PrintTemplates = React.forwardRef<HTMLDivElement, { data: PrintData | null; mode?: "bill" | "stickers" }>(
  ({ data, mode }, ref) => {
    if (!data) return null;

    const billWidth = localStorage.getItem("print-bill-width") || "80";
    const stickerWidth = localStorage.getItem("print-sticker-width") || "50";
    const stickerHeight = localStorage.getItem("print-sticker-height") || "30";

    const billWidthNum = Number(billWidth) || 80;
    const printableWidth = billWidthNum === 80 ? 72 : 48; // Khổ in thực tế của K80 là 72mm, K58 là 48mm

    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ACCOUNT.bankCode}-${BANK_ACCOUNT.accountNumber}-compact2.png?amount=${data.total}&addInfo=${encodeURIComponent("MOKA " + data.orderNumber)}&accountName=${BANK_ACCOUNT.ownerName}&addTag=1`;
    const orderQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://${brand.orderingUrl}`;

    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat("vi-VN").format(amount);

    return (
      <div ref={ref} id="momoka-print-template" className="momoka-print-container">
        {/* CUSTOMER BILL (Standard 80mm) */}
        {(!mode || mode === "bill") && (
          <div className="momoka-print-page bill-format">
            {data.paymentStatus === "pending" && (
              <div className="text-center py-1 bg-black text-white font-black text-[11px] uppercase tracking-widest mb-2 rounded-sm">
                Phiếu Tạm Tính
              </div>
            )}
            <div className="text-center mb-2">
              <div className="text-base font-black uppercase tracking-tighter mb-0.5">{brand.name}</div>
              <div className="text-[8px] font-black uppercase tracking-wide mb-0.5">{brand.categoriesTagline}</div>
              <div className="text-[8px] font-bold leading-relaxed">
                {brand.address}
                <br />
                SĐT: {brand.storePhoneDisplay}
              </div>
            </div>

            <div className="text-center py-1 border-y border-black mb-2">
              <div className="text-[8px] font-bold uppercase tracking-widest mb-0.5">Mã đơn hàng</div>
              <div className="text-lg font-black leading-none">#{data.orderNumber}</div>
              <div className="mt-1 inline-block px-1.5 py-0.5 bg-black text-white text-[8.5px] font-bold uppercase rounded-sm">
                {data.orderType === "dine-in" ? "Phục vụ tại chỗ" : data.orderType === "delivery" ? "Giao hàng" : "Mang về"}
              </div>
            </div>

            <div className="mb-2">
              <div className="grid grid-cols-[1fr_30px_70px] border-b border-black pb-0.5 mb-0.5 text-[8.5px] font-bold uppercase">
                <div>Tên món</div>
                <div className="text-center">SL</div>
                <div className="text-right">Tiền</div>
              </div>
              <div className="space-y-1">
                {data.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_30px_70px] text-[10px] leading-snug font-bold">
                    <div>
                      <div className="font-bold uppercase">{item.product.name}</div>
                      {item.variant && !item.product.name.toLowerCase().includes(item.variant.name.toLowerCase()) && (
                        <div className="text-[8.5px] italic font-bold">- {item.variant.name}</div>
                      )}
                      {item.selectedOptions.map((opt) => (
                        <div key={opt.optionId} className="text-[8.5px] ml-1 flex gap-1 font-bold">
                          <span>•</span>
                          <span>{opt.name}</span>
                        </div>
                      ))}
                      {item.note && <div className="text-[8.5px] italic mt-0.5 border-l border-black pl-1 font-bold">{item.note}</div>}
                    </div>
                    <div className="text-center font-bold">{item.quantity}</div>
                    <div className="text-right font-bold">{formatCurrency(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-black pt-1.5 space-y-0.5 mb-2">
              <div className="flex justify-between text-[9.5px] font-bold">
                <span>Tạm tính:</span>
                <span>{formatCurrency(data.subtotal)}đ</span>
              </div>
              {data.discountAmount > 0 && (
                <div className="flex justify-between text-[9.5px] font-bold">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(data.discountAmount)}đ</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] font-black border-t border-black pt-1">
                <span>TỔNG:</span>
                <span>{formatCurrency(data.total)}đ</span>
              </div>
              {data.customerPhone && (
                <div className="border-t border-black/40 border-dashed pt-1 mt-1 space-y-0.5 text-[8.5px] font-bold">
                  <div className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span>{data.customerPhone}</span>
                  </div>
                  {data.earnedPoints !== undefined && data.earnedPoints > 0 && (
                    <div className="flex justify-between">
                      <span>Điểm tích lũy:</span>
                      <span>+{formatCurrency(data.earnedPoints)} điểm</span>
                    </div>
                  )}
                  {data.spentPoints !== undefined && data.spentPoints > 0 && (
                    <div className="flex justify-between">
                      <span>Điểm đã dùng:</span>
                      <span>-{formatCurrency(data.spentPoints)} điểm</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center mb-2">
              <div className="text-[8px] font-bold uppercase mb-0.5">Quét mã thanh toán</div>
              <div className="flex justify-center mb-0.5">
                <img src={qrImageUrl} alt="VietQR" className="w-36 h-36 border border-black p-0.5" />
              </div>
              
              <div className="text-[8px] font-bold leading-tight text-center my-1.5 border border-black p-1 rounded-sm">
                <div>Ngân hàng: {BANK_ACCOUNT.bankName}</div>
                <div>STK: {BANK_ACCOUNT.accountNumber}</div>
                <div>Chủ TK: {BANK_ACCOUNT.ownerName}</div>
              </div>

              <div className="text-[8.5px] font-bold uppercase mb-0.5">Phương thức: {data.paymentMethod}</div>
              
              {data.paymentStatus === "pending" ? (
                <div className="mt-1 py-0.5 border-2 border-black border-dashed rounded-md bg-transparent">
                  <div className="text-[9px] font-black text-black tracking-wider">PHIẾU TẠM TÍNH - CHƯA THANH TOÁN</div>
                </div>
              ) : (
                <div className="mt-1 py-0.5 border-2 border-black rounded-md">
                  <div className="text-[9px] font-black text-black tracking-wider">ĐÃ THANH TOÁN</div>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="w-full h-px border-b border-black mb-1.5" />

              <div className="text-[8px] font-bold mb-1.5 leading-normal">
                Quý khách vui lòng cung cấp Số điện thoại khi đặt hàng để được tích điểm đổi quà!
              </div>

              <div className="text-[8.5px] uppercase font-black tracking-widest mb-0.5">Cảm ơn & Hẹn gặp lại</div>
              <div className="text-[9.5px] font-black text-black">{brand.name}</div>
            </div>
          </div>
        )}

        {/* STICKERS - Optimized for 50x30mm Landscape */}
        {(!mode || mode === "stickers") && data.items
          .filter((item) => {
            const enabledCategoriesStr = localStorage.getItem("print-sticker-categories");
            const enabledCategories = enabledCategoriesStr
              ? (JSON.parse(enabledCategoriesStr) as string[])
              : ["tra-sua", "tra-hoa-qua", "cafe", "kem"]; // Mặc định in nước và kem
            return enabledCategories.includes(item.product.categoryId);
          })
          .map((item, itemIdx) => 
            Array.from({ length: item.quantity }).map((_, qIdx) => (
            <div key={`${itemIdx}-${qIdx}`} className="momoka-print-page sticker-format">
              <div className="sticker-content">
                {/* Top Row: Order #, Sequence, and Time */}
                <div className="flex justify-between items-center mb-1 border-b border-black pb-0.5">
                  <div className="text-sm font-black leading-none">#{data.orderNumber}</div>
                  <div className="text-[11px] font-bold leading-none">{qIdx + 1}/{item.quantity}</div>
                  <div className="text-[8.5px] font-black leading-none text-right flex flex-col items-end">
                    <div>
                      {new Date(data.createdAt).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}{" "}
                      {new Date(data.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[8px] font-black uppercase text-black mt-0.5">
                      {data.orderType === "dine-in" ? "Tại chỗ" : data.orderType === "delivery" ? "Giao hàng" : "Mang đi"}
                    </div>
                  </div>
                </div>

                {/* Middle Row: Product Name and Size */}
                <div className="mb-0.5">
                  <div className="text-[13px] font-black uppercase leading-[1.2] line-clamp-2">
                    {item.product.name}
                    {item.variant && <span className="ml-1 text-[11px] font-bold">[{item.variant.name}]</span>}
                  </div>
                </div>

                {/* Options Row */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 leading-tight">
                    {item.selectedOptions.map((opt) => (
                      <div key={opt.optionId} className="text-[10px] font-bold flex items-center gap-0.5">
                        <span className="text-[8px]">•</span>
                        <span>{opt.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Note and Unit Price */}
                <div className="flex justify-between items-end mt-0.5 border-t border-black pt-0.5">
                  <div className="flex-1 overflow-hidden mr-2">
                    {item.note ? (
                      <div className="text-[9px] font-bold uppercase bg-black text-white px-1 truncate leading-relaxed">
                        {item.note}
                      </div>
                    ) : (
                      <div className="text-[8px] font-bold uppercase">Ghi chú: ...</div>
                    )}
                  </div>
                  <div className="text-[13px] font-black shrink-0 leading-none">
                    {formatCurrency(item.totalPrice / item.quantity)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          /* Normal View */
          .momoka-print-container {
            display: none;
          }

          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            }

            /* Hide main app, show print root */
            body > #root {
              display: none !important;
            }

            #print-root {
              display: block !important;
              visibility: visible !important;
            }

            .momoka-print-container {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              z-index: 999999 !important;
            }

            /* Ensure children keep their intended display (flex/grid) */
            .momoka-print-container * {
              visibility: visible !important;
              opacity: 1 !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .momoka-print-page {
              page-break-after: always !important;
              page-break-inside: avoid !important;
              border: none !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }

            /* FORMAT FOR BILL */
            .bill-format {
              width: ${printableWidth}mm !important;
              max-width: ${printableWidth}mm !important;
              padding: 2mm 4mm 2mm 2mm !important;
              box-sizing: border-box !important;
            }

            /* FORMAT FOR STICKER */
            .sticker-format {
              width: ${stickerWidth}mm !important;
              max-width: ${stickerWidth}mm !important;
              height: ${stickerHeight}mm !important;
              padding: 1.5mm 3.5mm 1.5mm 1.5mm !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
            }

            .sticker-content {
              display: flex !important;
              flex-direction: column !important;
              height: 100% !important;
              justify-content: space-between !important;
            }

            /* Tối ưu hóa đặc biệt cho khổ tem 40x30mm (4x3) */
            ${stickerWidth === "40" ? `
              .sticker-format {
                padding: 1mm 1.5mm !important;
                box-sizing: border-box !important;
              }
              .sticker-content {
                gap: 1px !important;
              }
              .sticker-format .text-sm {
                font-size: 11px !important;
              }
              .sticker-format .text-\\[13px\\] {
                font-size: 11px !important;
                line-height: 1.1 !important;
              }
              .sticker-format .text-\\[11px\\] {
                font-size: 9px !important;
              }
              .sticker-format .text-\\[10px\\] {
                font-size: 8.5px !important;
              }
              .sticker-format .text-\\[9px\\] {
                font-size: 8px !important;
              }
              .sticker-format .text-\\[8px\\] {
                font-size: 7.5px !important;
              }
              .sticker-format .mb-1 {
                margin-bottom: 2px !important;
              }
              .sticker-format .mb-0.5 {
                margin-bottom: 1px !important;
              }
              .sticker-format .mt-0.5 {
                margin-top: 1px !important;
              }
              .sticker-format .pb-0.5 {
                padding-bottom: 2px !important;
              }
              .sticker-format .pt-0.5 {
                padding-top: 2px !important;
              }
            ` : ""}

            /* Tối ưu hóa đặc biệt cho khổ tem 30x20mm (3x2) */
            ${stickerWidth === "30" ? `
              .sticker-format {
                padding: 0.5mm 1mm !important;
                box-sizing: border-box !important;
              }
              .sticker-content {
                gap: 0.5px !important;
              }
              .sticker-format .text-sm {
                font-size: 9px !important;
              }
              .sticker-format .text-\\[13px\\] {
                font-size: 9px !important;
                line-height: 1.0 !important;
              }
              .sticker-format .text-\\[11px\\] {
                font-size: 8px !important;
              }
              .sticker-format .text-\\[10px\\] {
                font-size: 7px !important;
              }
              .sticker-format .text-\\[9px\\] {
                font-size: 7px !important;
              }
              .sticker-format .text-\\[8px\\] {
                font-size: 6px !important;
              }
              .sticker-format .mb-1 {
                margin-bottom: 1px !important;
              }
              .sticker-format .mb-0.5 {
                margin-bottom: 0.5px !important;
              }
              .sticker-format .mt-0.5 {
                margin-top: 0.5px !important;
              }
              .sticker-format .pb-0.5 {
                padding-bottom: 1px !important;
              }
              .sticker-format .pt-0.5 {
                padding-top: 1px !important;
              }
            ` : ""}

            @page {
              margin: 0;
            }

            /* Switch size based on mode */
            body.printing-stickers @page {
              size: ${stickerWidth}mm ${stickerHeight}mm;
            }
          }
        `}} />
      </div>
    );
  }
);

PrintTemplates.displayName = "PrintTemplates";
