import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type FileFilter } from 'electron';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_NAME } from '../shared/constants/app.js';
import type {
  AppInfo,
  ExportDocumentResult,
  GoogleBrowserLoginResult,
  GoogleBrowserLoginStart,
} from '../shared/types/electron-api.js';
import {
  NODE_API_TARGET,
  RENDERER_SERVER_PORT,
  startRendererServer,
  type GoogleLoginCompletion,
} from './rendererServer.js';

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
let rendererUrl: string | null = null;
let checkoutSessionActive = false;
const checkoutWindows = new Set<BrowserWindow>();
let closeCheckoutTimer: NodeJS.Timeout | null = null;

const isHttpUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const isRazorpayCheckoutUrl = (url: string) => {
  if (url === 'about:blank' || url.startsWith('about:blank')) {
    return true;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'razorpay.com' ||
      host.endsWith('.razorpay.com') ||
      host.endsWith('.razorpay.in') ||
      host.includes('razorpay')
    );
  } catch {
    return false;
  }
};

const closeCheckoutWindows = () => {
  for (const checkoutWindow of [...checkoutWindows]) {
    if (!checkoutWindow.isDestroyed()) {
      checkoutWindow.destroy();
    }
  }
  checkoutWindows.clear();
};

const scheduleCloseCheckoutWindows = () => {
  if (closeCheckoutTimer) {
    clearTimeout(closeCheckoutTimer);
  }

  // Give Razorpay time to post the success payload back to the opener.
  closeCheckoutTimer = setTimeout(() => {
    closeCheckoutTimer = null;
    if (!checkoutSessionActive) {
      closeCheckoutWindows();
    }
  }, 1800);
};

const allowCheckoutWindow = (parent?: BrowserWindow | null) => ({
  action: 'allow' as const,
  overrideBrowserWindowOptions: {
    parent: parent && !parent.isDestroyed() ? parent : mainWindow ?? undefined,
    modal: false,
    width: 520,
    height: 760,
    minWidth: 420,
    minHeight: 560,
    show: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      javascript: true,
    },
  },
});

const wireCheckoutWindow = (window: BrowserWindow) => {
  checkoutWindows.add(window);
  window.setMenuBarVisibility(false);

  window.webContents.setWindowOpenHandler(({ url }) => {
    // Bank OTP / 3DS / UPI flows open nested windows from the first checkout popup.
    if (checkoutSessionActive && (isRazorpayCheckoutUrl(url) || isHttpUrl(url))) {
      return allowCheckoutWindow(window);
    }

    if (isHttpUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  window.webContents.on('did-create-window', (childWindow) => {
    wireCheckoutWindow(childWindow);
  });

  window.on('closed', () => {
    checkoutWindows.delete(window);
  });
};

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

  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  }
};

const isAppUrl = (url: string) => {
  const appOrigin = isDev ? process.env.VITE_DEV_SERVER_URL : rendererUrl;
  try {
    return Boolean(appOrigin) && new URL(url).origin === new URL(appOrigin as string).origin;
  } catch {
    return false;
  }
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    icon: isDev
      ? join(app.getAppPath(), 'public/kukunotes-icon.png')
      : join(__dirname, '../../dist/kukunotes-icon.png'),
    backgroundColor: '#f7f8fb',
    show: false,
    webPreferences: {
      // Electron ignores package.json "type": "module" for preloads, so it must be CommonJS.
      preload: join(__dirname, '../preload/preload.cjs'),
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
    const isBlankCheckoutFrame = url === 'about:blank' || url.startsWith('about:blank');
    const isCheckoutPopup =
      checkoutSessionActive && (isBlankCheckoutFrame || isRazorpayCheckoutUrl(url) || isHttpUrl(url));

    if (isCheckoutPopup) {
      return allowCheckoutWindow(mainWindow);
    }

    if (isHttpUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    if (checkoutSessionActive) {
      wireCheckoutWindow(childWindow);
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) {
      return;
    }

    event.preventDefault();
    if (isHttpUrl(url) || url.startsWith('mailto:')) {
      void shell.openExternal(url);
    }
  });

  // Application menu is hidden, so wire common shortcuts manually.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    const key = input.key.toLowerCase();
    const hasReloadModifier = input.control || input.meta;

    if (hasReloadModifier && !input.alt && key === 'r') {
      event.preventDefault();
      if (input.shift) {
        mainWindow?.webContents.reloadIgnoringCache();
      } else {
        mainWindow?.webContents.reload();
      }
      return;
    }

    if (key === 'f5') {
      event.preventDefault();
      if (input.shift || input.control || input.meta) {
        mainWindow?.webContents.reloadIgnoringCache();
      } else {
        mainWindow?.webContents.reload();
      }
    }
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

ipcMain.handle('payments:checkout-session', (_event, active: unknown) => {
  const nextActive = active === true;
  checkoutSessionActive = nextActive;

  if (nextActive) {
    if (closeCheckoutTimer) {
      clearTimeout(closeCheckoutTimer);
      closeCheckoutTimer = null;
    }
    return;
  }

  scheduleCloseCheckoutWindows();
});

const MAX_EXPORT_HTML_LENGTH = 15 * 1024 * 1024;

const toExportFileName = (value: unknown, extension: string) => {
  const raw = typeof value === 'string' ? basename(value) : '';
  const cleaned =
    [...raw]
      .filter((char) => char.charCodeAt(0) >= 32)
      .join('')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'KukuNotes summary';

  return cleaned.toLowerCase().endsWith(`.${extension}`) ? cleaned : `${cleaned}.${extension}`;
};

const readExportRequest = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid export request.');
  }

  const { html, fileName } = payload as { html?: unknown; fileName?: unknown };
  if (typeof html !== 'string' || !html.trim() || html.length > MAX_EXPORT_HTML_LENGTH) {
    throw new Error('Export content is empty or too large.');
  }

  return { html, fileName };
};

const askExportPath = async (defaultName: string, filter: FileFilter) => {
  const options = {
    title: 'Export summary',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [filter],
  };
  const result =
    mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showSaveDialog(options);

  return result.canceled || !result.filePath ? null : result.filePath;
};

const renderHtmlToPdf = async (html: string) => {
  // Loading from a temp file avoids data-URL size limits for large summaries.
  const tempPath = join(tmpdir(), `kukunotes-export-${randomUUID()}.html`);
  await writeFile(tempPath, html, 'utf8');

  const renderWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      javascript: false,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await renderWindow.loadFile(tempPath);
    return await renderWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });
  } finally {
    renderWindow.destroy();
    await unlink(tempPath).catch(() => undefined);
  }
};

ipcMain.handle('export:pdf', async (_event, payload: unknown): Promise<ExportDocumentResult> => {
  const { html, fileName } = readExportRequest(payload);
  const filePath = await askExportPath(toExportFileName(fileName, 'pdf'), {
    name: 'PDF document',
    extensions: ['pdf'],
  });

  if (!filePath) {
    return { saved: false };
  }

  const pdf = await renderHtmlToPdf(html);
  await writeFile(filePath, pdf);
  return { saved: true, filePath };
});

ipcMain.handle('export:doc', async (_event, payload: unknown): Promise<ExportDocumentResult> => {
  const { html, fileName } = readExportRequest(payload);
  const filePath = await askExportPath(toExportFileName(fileName, 'doc'), {
    name: 'Word document',
    extensions: ['doc'],
  });

  if (!filePath) {
    return { saved: false };
  }

  // BOM lets Word detect UTF-8 in HTML-based .doc files.
  await writeFile(filePath, `\ufeff${html}`, 'utf8');
  return { saved: true, filePath };
});

ipcMain.handle('export:reveal', (_event, filePath: unknown) => {
  if (typeof filePath === 'string' && isAbsolute(filePath)) {
    shell.showItemInFolder(filePath);
  }
});

ipcMain.handle('shell:open-external', async (_event, url: unknown) => {
  if (typeof url !== 'string' || !isHttpUrl(url)) {
    throw new Error('Only http(s) links can be opened.');
  }
  await shell.openExternal(url);
});

/*
  Google sign-in through the system browser (see the backend's GoogleDesktopLogin controller). The verifier
  never leaves this process until the backend's handoff code arrives, so a code alone cannot be redeemed.
*/
const GOOGLE_LOGIN_TIMEOUT_MS = 10 * 60_000;
let pendingGoogleLogin: { verifier: string; startedAt: number } | null = null;

const focusMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
};

const completeGoogleBrowserLogin = ({ code, error }: GoogleLoginCompletion) => {
  const pending = pendingGoogleLogin;
  pendingGoogleLogin = null;
  if (!pending || Date.now() - pending.startedAt > GOOGLE_LOGIN_TIMEOUT_MS || !mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  const result: GoogleBrowserLoginResult = code
    ? { code, verifier: pending.verifier }
    : { error: error || 'Google sign-in failed. Please try again.' };
  mainWindow.webContents.send('auth:google-browser-result', result);
  focusMainWindow();
  return true;
};

ipcMain.handle('auth:google-browser-start', async (): Promise<GoogleBrowserLoginStart> => {
  // Only packaged builds run the loopback server the backend redirects back to; dev keeps in-app sign-in.
  if (!rendererUrl) {
    return { available: false };
  }

  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  pendingGoogleLogin = { verifier, startedAt: Date.now() };

  const startUrl = new URL('/api/v1/auth/google/desktop/start', NODE_API_TARGET);
  startUrl.searchParams.set('challenge', challenge);
  await shell.openExternal(startUrl.toString());
  return { available: true };
});

ipcMain.handle('auth:google-browser-cancel', () => {
  pendingGoogleLogin = null;
});

const startProductionRenderer = async () => {
  try {
    const { url } = await startRendererServer(join(__dirname, '../../dist'), {
      onGoogleLoginComplete: completeGoogleBrowserLogin,
    });
    rendererUrl = url;
    return true;
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
      ? `Port ${RENDERER_SERVER_PORT} is already in use by another program.`
      : String(error);
    dialog.showErrorBox(`${APP_NAME} could not start`, reason);
    return false;
  }
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    if (!isDev && !(await startProductionRenderer())) {
      app.quit();
      return;
    }

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  closeCheckoutWindows();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
