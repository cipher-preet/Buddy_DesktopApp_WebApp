export type AppInfo = {
  name: string;
  version: string;
  platform: NodeJS.Platform;
};

export type ElectronApi = {
  getAppInfo: () => Promise<AppInfo>;
  /** Keeps bank and Razorpay popups inside the app while checkout is open. */
  setCheckoutSessionActive: (active: boolean) => Promise<void>;
};
