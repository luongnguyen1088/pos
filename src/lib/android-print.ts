/**
 * Android Native Receipt & Sticker Thermal Printing Service
 * Uses RawBT (Standard F&B Printer Gateway on Android)
 */

export const androidPrint = {
  /**
   * Check if the application is running on an Android OS device
   */
  isAndroid: (): boolean => {
    if (typeof navigator === "undefined") return false;
    return /android/i.test(navigator.userAgent);
  },

  /**
   * Send print HTML content silently to the connected printer via RawBT Local Server
   * Falls back to standard Android Intent if the local background server is asleep.
   */
  printHTML: async (htmlContent: string, printerName: string): Promise<boolean> => {
    const cleanHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Segoe UI', Arial, sans-serif;
              width: 100%;
              background: white;
              color: black;
            }
            .card { width: 100%; border: none; padding: 0; box-shadow: none; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .payment-qr { text-align: center; margin-top: 10px; }
            .payment-qr img { width: 130px; height: 130px; }
            @media print {
              body { background: white; color: black; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    try {
      // Attempt 1: RawBT background server API (Silent, fast, professional)
      const response = await fetch("http://localhost:40213/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "html",
          data: cleanHtml,
          printer: printerName, // Direct mapping if they configured multiple printers in RawBT
          cut: true,
          openCashDrawer: true
        })
      });

      if (response.ok) {
        return true;
      }
      throw new Error("RawBT server responded with error status");
    } catch (err) {
      console.warn("RawBT local server print failed. Using native Android Intent fallback...", err);
      
      // Attempt 2: Android Native Intent (Launches RawBT app with the receipt payload automatically)
      try {
        const base64Html = btoa(unescape(encodeURIComponent(cleanHtml)));
        const intentUrl = `intent:#Intent;scheme=rawbt;package=ru.a410.rawbtprinter;S.base64=${base64Html};end`;
        
        window.location.href = intentUrl;
        return true;
      } catch (intentErr) {
        console.error("Android Native print failed completely:", intentErr);
        throw new Error("Không thể kết nối máy in. Vui lòng đảm bảo ứng dụng RawBT đã được cài đặt và khởi động trên máy POS Android.");
      }
    }
  }
};
