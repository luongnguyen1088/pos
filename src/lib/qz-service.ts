import qz from "qz-tray";

/**
 * QZ Tray Service for Silent Printing
 */

export interface QZPrinterConfig {
  billPrinter: string;
  stickerPrinter: string;
}

class QZService {
  private connected = false;

  async connect() {
    if (this.connected) return;
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
        this.connected = true;
        console.log("QZ Tray connected");
      }
    } catch (err) {
      console.error("QZ Tray connection failed:", err);
      throw err;
    }
  }

  async findPrinter(name: string) {
    await this.connect();
    return qz.printers.find(name);
  }

  /**
   * Print HTML content to a specific printer
   * @param printerName The name of the printer (from OS)
   * @param htmlContent The HTML string to print
   * @param options Printing options (size, etc.)
   */
  async printHTML(printerName: string, htmlContent: string, options: any = {}) {
    try {
      await this.connect();
      const config = qz.configs.create(printerName, options);
      
      const data = [
        {
          type: 'html',
          format: 'plain',
          data: htmlContent
        }
      ];

      return qz.print(config, data);
    } catch (err) {
      console.error(`Printing to ${printerName} failed:`, err);
      throw err;
    }
  }

  /**
   * Print a DOM element's HTML content
   */
  async printElement(printerName: string, element: HTMLElement, options: any = {}) {
    // Clone styles to ensure they are included
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');
    
    const htmlContent = `
      <html>
        <head>
          ${styles}
          <style>
            body { margin: 0; padding: 0; }
            .momoka-print-container { display: block !important; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;

    return this.printHTML(printerName, htmlContent, options);
  }

  /**
   * Get all available printers
   */
  async listPrinters() {
    await this.connect();
    return qz.printers.find();
  }
}

export const qzService = new QZService();
