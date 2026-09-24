import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronApi } from '../shared/types/electron-api.js';

const electronApi: ElectronApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  setCheckoutSessionActive: (active) => ipcRenderer.invoke('payments:checkout-session', active),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
