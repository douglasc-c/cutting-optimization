declare global {
  interface Window {
    electronAPI: {
      optimizeCutting: (config: any) => Promise<any>;
      saveConfig: (config: any) => Promise<any>;
      loadConfig: () => Promise<any>;
      exportResults: (results: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      getAppName: () => Promise<string>;
      onOptimizationProgress: (callback: (event: any, data: any) => void) => void;
      onOptimizationComplete: (callback: (event: any, data: any) => void) => void;
      onError: (callback: (event: any, data: any) => void) => void;
    };
  }
}

export {};
