const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: () => true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printHTML: (html, printerName) => ipcRenderer.invoke('print-html', { html, printerName })
});
