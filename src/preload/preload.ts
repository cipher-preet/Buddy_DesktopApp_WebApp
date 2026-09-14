import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronApi } from '../shared/types/electron-api.js';

const electronApi: ElectronApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
