import { AccountState, UpdateState } from './components/AccountAccess';
declare global {
  interface Window {
    electronAPI?: {
      optimizeCutting: (config: any, jobId?: string) => Promise<any>;
      cancelOptimization?: (jobId: string) => Promise<{ success: boolean }>;
      saveConfig: (config: any, existingPath?: string) => Promise<any>;
      loadConfig: (path?: string) => Promise<any>;
      saveSvg: (svg: string) => Promise<{
        success: boolean;
        canceled?: boolean;
        error?: string;
        filePath?: string;
      }>;
      exportResults: (results: any, format?: 'csv' | 'json') => Promise<any>;
      loadWorkspace?: () => Promise<any>;
      saveWorkspace?: (
        data: any
      ) => Promise<{ success: boolean; error?: string }>;
      getRecentProjects?: () => Promise<string[]>;
      setDocumentState?: (state: {
        dirty: boolean;
        busy: boolean;
        name: string;
      }) => Promise<void>;
      closeWindow?: () => Promise<void>;
      showExportInFolder?: (path: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
      getAppName: () => Promise<string>;
      getAccountState?: () => Promise<AccountState>;
      loginAccount?: (email: string, password: string) => Promise<AccountState>;
      registerAccount?: (
        email: string,
        password: string,
        name: string
      ) => Promise<AccountState>;
      logoutAccount?: () => Promise<AccountState>;
      getUpdateState?: () => Promise<UpdateState>;
      checkUpdates?: () => Promise<UpdateState>;
      downloadUpdate?: () => Promise<UpdateState>;
      installUpdate?: () => Promise<{ success?: boolean; error?: string }>;
      onUpdateState?: (callback: (state: UpdateState) => void) => () => void;
      onMenuAction?: (callback: (action: string) => void) => () => void;
      onOptimizationProgress?: (callback: (data: any) => void) => () => void;
    };
  }
}
export {};
