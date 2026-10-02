export type AppInfo = {
  name: string;
  version: string;
  platform: NodeJS.Platform;
};

export type ExportDocumentRequest = {
  /** Self-contained HTML document to render or save. */
  html: string;
  /** Suggested file name shown in the save dialog (extension optional). */
  fileName: string;
};

export type ExportDocumentResult = {
  saved: boolean;
  filePath?: string;
};

export type ElectronApi = {
  getAppInfo: () => Promise<AppInfo>;
  /** Keeps bank and Razorpay popups inside the app while checkout is open. */
  setCheckoutSessionActive: (active: boolean) => Promise<void>;
  exportPdf: (request: ExportDocumentRequest) => Promise<ExportDocumentResult>;
  exportDoc: (request: ExportDocumentRequest) => Promise<ExportDocumentResult>;
  revealFile: (filePath: string) => Promise<void>;
  /** Opens an http(s) URL in the user's default browser. */
  openExternal: (url: string) => Promise<void>;
};
