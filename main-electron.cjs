const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Momoka POS",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Hide default menu bar
  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    // Đọc URL cấu hình từ tệp pos-config.json trong thư mục AppData
    let hostedUrl = 'https://mokapos.claro.vn';
    const configPath = path.join(app.getPath('userData'), 'pos-config.json');
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.hostedUrl && config.hostedUrl.trim() !== '') {
          hostedUrl = config.hostedUrl.trim();
        }
      } else {
        // Tạo file cấu hình mặc định nếu chưa có
        fs.writeFileSync(configPath, JSON.stringify({ hostedUrl }, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error("Không thể đọc tệp cấu hình pos-config.json:", e);
    }

    console.log(`Đang tải Web App từ máy chủ: ${hostedUrl}`);
    mainWindow.loadURL(hostedUrl).catch((err) => {
      console.warn("Lỗi kết nối mạng, đang chuyển sang chế độ Local Offline:", err);
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    });

    // Lắng nghe sự kiện tải trang thất bại để tự động fallback
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL.startsWith(hostedUrl)) {
        console.warn(`Tải trang web thất bại (${errorCode}: ${errorDescription}), đang chuyển sang chế độ Local Offline...`);
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Get available printers from OS
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (error) {
    console.error("Failed to fetch printers:", error);
    return [];
  }
});

// IPC Handler: Invisible offscreen silent printing
ipcMain.handle('print-html', async (event, { html, printerName, widthMm, heightMm }) => {
  return new Promise((resolve, reject) => {
    // Create an invisible offscreen window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Đọc tất cả các tệp CSS biên dịch từ dist/assets/
    const assetsDir = path.join(__dirname, 'dist', 'assets');
    let cssContent = '';
    try {
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const cssFiles = files.filter(f => f.endsWith('.css'));
        cssFiles.forEach(f => {
          cssContent += fs.readFileSync(path.join(assetsDir, f), 'utf-8');
        });
      }
    } catch (e) {
      console.error('Failed to read CSS assets for silent printing:', e);
    }

    // Nhúng trực tiếp CSS nội dung vào thẻ head của HTML
    const inlinedHtml = html.replace('</head>', `<style>${cssContent}</style></head>`);

    // Load the HTML inside the invisible window via data URL
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(inlinedHtml)}`)
      .then(() => {
        const printOptions = {
          silent: true,
          margins: {
            marginType: 'none'
          }
        };

        if (printerName && printerName.trim() !== "") {
          printOptions.deviceName = printerName.trim();
        }

        // Thiết lập kích thước khổ giấy theo micron (1mm = 1000 microns)
        if (widthMm && heightMm) {
          printOptions.pageSize = {
            width: Math.round(Number(widthMm) * 1000),
            height: Math.round(Number(heightMm) * 1000)
          };
        }

        // Send print command silently to specific device
        printWindow.webContents.print(printOptions, (success, errorType) => {
          printWindow.destroy(); // Always destroy offscreen window to prevent memory leaks
          if (success) {
            resolve({ success: true });
          } else {
            console.error(`Printing failed on ${printerName}:`, errorType);
            reject(new Error(errorType || "Print failed"));
          }
        });
      })
      .catch((err) => {
        printWindow.destroy();
        console.error("Failed to load offscreen HTML content:", err);
        reject(err);
      });
  });
});
