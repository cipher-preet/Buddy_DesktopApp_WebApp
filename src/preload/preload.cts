import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type { ElectronApi, GoogleBrowserLoginResult } from '../shared/types/electron-api.js';

const electronApi: ElectronApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  setCheckoutSessionActive: (active) => ipcRenderer.invoke('payments:checkout-session', active),
  exportPdf: (request) => ipcRenderer.invoke('export:pdf', request),
  exportDoc: (request) => ipcRenderer.invoke('export:doc', request),
  revealFile: (filePath) => ipcRenderer.invoke('export:reveal', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  startGoogleBrowserLogin: () => ipcRenderer.invoke('auth:google-browser-start'),
  cancelGoogleBrowserLogin: () => ipcRenderer.invoke('auth:google-browser-cancel'),
  onGoogleBrowserLoginResult: (callback) => {
    const listener = (_event: IpcRendererEvent, result: GoogleBrowserLoginResult) => callback(result);
    ipcRenderer.on('auth:google-browser-result', listener);
    return () => {
      ipcRenderer.removeListener('auth:google-browser-result', listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
