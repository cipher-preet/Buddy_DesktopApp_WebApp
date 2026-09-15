import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_NAME } from '../shared/constants/app.js';
import type { AppInfo } from '../shared/types/electron-api.js';

/*
  Root cause on Windows Electron:
  Chromium's Fluent/Windows scrollbar personality ignores most
  ::-webkit-scrollbar-button rules, so thick OS scrollbars + arrows remain.

  Disable those features BEFORE app ready, then apply Blink scrollbar CSS.
*/
app.commandLine.appendSwitch(
  'disable-features',
  'WindowsScrollingPersonality,FluentScrollbar,FluentOverlayScrollbar',
);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

const SCROLLBAR_CSS = `
html, body, #root, * {
  scrollbar-width: thin !important;
  scrollbar-color: #c5cedb transparent !important;
}

*::-webkit-scrollbar {
  -webkit-appearance: none !important;
  appearance: none !important;
  width: 6px !important;
  height: 6px !important;
  background: transparent !important;
}

*::-webkit-scrollbar-button,
*::-webkit-scrollbar-button:horizontal,
*::-webkit-scrollbar-button:vertical,
*::-webkit-scrollbar-button:start,
*::-webkit-scrollbar-button:end,
*::-webkit-scrollbar-button:decrement,
*::-webkit-scrollbar-button:increment,
*::-webkit-scrollbar-button:start:decrement,
*::-webkit-scrollbar-button:end:increment,
*::-webkit-scrollbar-button:start:increment,
*::-webkit-scrollbar-button:end:decrement,
*::-webkit-scrollbar-button:vertical:start:decrement,
*::-webkit-scrollbar-button:vertical:end:increment,
*::-webkit-scrollbar-button:vertical:start:increment,
*::-webkit-scrollbar-button:vertical:end:decrement,
*::-webkit-scrollbar-button:horizontal:start:decrement,
*::-webkit-scrollbar-button:horizontal:end:increment,
*::-webkit-scrollbar-button:horizontal:start:increment,
*::-webkit-scrollbar-button:horizontal:end:decrement,
*::-webkit-scrollbar-button:single-button,
*::-webkit-scrollbar-button:double-button,
*::-webkit-scrollbar-button:vertical:single-button:start:decrement,
*::-webkit-scrollbar-button:vertical:single-button:end:increment,
*::-webkit-scrollbar-button:horizontal:single-button:start:decrement,
*::-webkit-scrollbar-button:horizontal:single-button:end:increment {
  -webkit-appearance: none !important;
  appearance: none !important;
  display: block !important;
  width: 0 !important;
  height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-image: none !important;
}

*::-webkit-scrollbar-track,
*::-webkit-scrollbar-track-piece {
  -webkit-appearance: none !important;
  background: transparent !important;
  border: 0 !important;
}

*::-webkit-scrollbar-thumb {
  -webkit-appearance: none !important;
  border: 0 !important;
  border-radius: 999px !important;
  background-color: #c5cedb !important;
  background-clip: padding-box !important;
  box-shadow: none !important;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: #a8b4c5 !important;
}

*::-webkit-scrollbar-thumb:active {
  background-color: #8f9db0 !important;
}

*::-webkit-scrollbar-corner {
  background: transparent !important;
}
`;

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

  const applyScrollbarStyles = () => {
    void mainWindow?.webContents.insertCSS(SCROLLBAR_CSS);
  };

  mainWindow.webContents.on('dom-ready', applyScrollbarStyles);
  mainWindow.webContents.on('did-finish-load', () => {
    applyScrollbarStyles();
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
