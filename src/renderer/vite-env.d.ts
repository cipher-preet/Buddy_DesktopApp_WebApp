/// <reference types="vite/client" />

import type { ElectronApi } from '../shared/types/electron-api';

declare module '*.png' {
  const src: string;
  export default src;
}

declare global {
  interface Window {
    electronApi?: ElectronApi;
  }
}
