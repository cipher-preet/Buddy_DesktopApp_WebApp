import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_NAME } from '../shared/constants/app.js';
import type { AppInfo } from '../shared/types/electron-api.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

const loadRenderer = (window: BrowserWindow) => {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  void window.loadFile(join(__dirname, '../../dist/index.html'));
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: '#f7f8fb',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (!mainWindow) {
      return;
    }

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        loadRenderer(mainWindow);
      }
    }, 500);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  loadRenderer(mainWindow);
};

ipcMain.handle('app:get-info', (): AppInfo => {
  return {
    name: APP_NAME,
    version: app.getVersion(),
    platform: process.platform,
  };
});

void app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
