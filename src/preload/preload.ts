import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronApi } from '../shared/types/electron-api.js';

const electronApi: ElectronApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  setCheckoutSessionActive: (active) => ipcRenderer.invoke('payments:checkout-session', active),
  exportPdf: (request) => ipcRenderer.invoke('export:pdf', request),
  exportDoc: (request) => ipcRenderer.invoke('export:doc', request),
  revealFile: (filePath) => ipcRenderer.invoke('export:reveal', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
