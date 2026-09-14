export type AppInfo = {
  name: string;
  version: string;
  platform: NodeJS.Platform;
};

export type ElectronApi = {
  getAppInfo: () => Promise<AppInfo>;
};
