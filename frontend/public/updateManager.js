function createUpdateManager({
  updater,
  enabled,
  documentState,
  onChange = () => {},
}) {
  let state = { enabled, phase: enabled ? 'idle' : 'disabled' },
    pending = false;
  const set = data => {
    state = { ...state, ...data };
    onChange(state);
  };
  if (enabled) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.on('checking-for-update', () =>
      set({ phase: 'checking', error: undefined })
    );
    updater.on('update-available', info =>
      set({ phase: 'available', version: info.version })
    );
    updater.on('update-not-available', () =>
      set({ phase: 'current', error: undefined })
    );
    updater.on('download-progress', progress =>
      set({ phase: 'downloading', percent: Math.round(progress.percent) })
    );
    updater.on('update-downloaded', info =>
      set({ phase: 'ready', version: info.version })
    );
    updater.on('error', () =>
      set({
        phase: 'error',
        error:
          'Não foi possível atualizar. Verifique a conexão e tente novamente.',
      })
    );
  }
  return {
    getState: () => state,
    async check() {
      if (!enabled || pending || ['downloading', 'ready'].includes(state.phase))
        return state;
      pending = true;
      try {
        await updater.checkForUpdates();
      } catch {
        set({
          phase: 'error',
          error: 'Não foi possível consultar as atualizações.',
        });
      } finally {
        pending = false;
      }
      return state;
    },
    async download() {
      if (!enabled || pending || state.phase !== 'available') return state;
      pending = true;
      set({ phase: 'downloading', percent: 0, error: undefined });
      try {
        await updater.downloadUpdate();
      } catch {
        set({
          phase: 'error',
          error:
            'O download falhou. Verifique a conexão e consulte as atualizações novamente.',
        });
      } finally {
        pending = false;
      }
      return state;
    },
    install() {
      if (!enabled || state.phase !== 'ready')
        throw new Error('Baixe a atualização antes de instalar.');
      const doc = documentState();
      if (doc.busy || doc.dirty)
        throw new Error(
          'Conclua o cálculo e salve o projeto antes de reiniciar e atualizar.'
        );
      updater.quitAndInstall(false, true);
      return { success: true };
    },
  };
}
module.exports = { createUpdateManager };
