const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  screen,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { resultsToCsv } = require('./resultExport');
const { createWorkspaceStore } = require('./workspaceStore');
const { createOptimizationRunner } = require('./optimizationRunner');
let mainWindow,
  store,
  allowClose = false,
  quitting = false;
let documentState = { dirty: false, busy: false, name: 'Projeto sem título' };
const exportedPaths = new Set();
const runner = createOptimizationRunner({
  resolveBackend: () => {
    const backend = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.resolve(__dirname, '..', '..', 'backend');
    const executable = path.join(
      backend,
      process.platform === 'win32'
        ? 'cutting-optimization-backend.exe'
        : 'cutting-optimization-backend'
    );
    if (fs.existsSync(executable))
      return { command: executable, args: [], cwd: backend };
    const script = path.join(backend, 'main.py');
    if (fs.existsSync(script))
      return {
        command: process.platform === 'win32' ? 'python' : 'python3',
        args: [script],
        cwd: backend,
      };
    throw new Error(
      'O motor de corte não foi encontrado. Reinstale o aplicativo.'
    );
  },
});
const sendAction = action => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('menu-action', action);
};
const recent = () => {
  const files = store.read('recent-projects');
  return Array.isArray(files)
    ? files.filter(p => typeof p === 'string').slice(0, 8)
    : [];
};
const addRecent = async file => {
  await store.write(
    'recent-projects',
    [file, ...recent().filter(p => p !== file)].slice(0, 8)
  );
  app.addRecentDocument(file);
};
const saveBounds = () => {
  if (mainWindow && !mainWindow.isDestroyed())
    store.writeSync('window-state', {
      ...mainWindow.getNormalBounds(),
      maximized: mainWindow.isMaximized(),
    });
};
function menu() {
  const fileItems = [
    {
      label: 'Novo projeto',
      accelerator: 'CmdOrCtrl+N',
      click: () => sendAction('new'),
      enabled: !documentState.busy,
    },
    {
      label: 'Abrir projeto…',
      accelerator: 'CmdOrCtrl+O',
      click: () => sendAction('open'),
      enabled: !documentState.busy,
    },
    {
      label: 'Salvar projeto',
      accelerator: 'CmdOrCtrl+S',
      click: () => sendAction('save'),
    },
    {
      label: 'Exportar…',
      accelerator: 'CmdOrCtrl+Shift+E',
      click: () => sendAction('export'),
    },
    { type: 'separator' },
    {
      label: 'Fechar',
      accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Alt+F4',
      click: () => mainWindow.close(),
    },
  ];
  const items = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'Sobre o Cutting Optimization' },
              { type: 'separator' },
              { label: 'Sair', accelerator: 'Cmd+Q', click: () => app.quit() },
            ],
          },
        ]
      : []),
    { label: 'Arquivo', submenu: fileItems },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar tudo' },
      ],
    },
    {
      label: 'Corte',
      submenu: [
        {
          label: 'Otimizar',
          accelerator: 'CmdOrCtrl+Enter',
          enabled: !documentState.busy,
          click: () => sendAction('optimize'),
        },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'togglefullscreen', label: 'Tela cheia' },
        ...(!app.isPackaged
          ? [
              {
                role: 'toggleDevTools',
                label: 'Ferramentas de desenvolvimento',
              },
            ]
          : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(items));
}
function createWindow() {
  allowClose = false;
  const state = store.read('window-state') || {};
  const display = screen.getPrimaryDisplay().workArea;
  const width = Math.max(
    900,
    Math.min(Number(state.width) || 1380, display.width)
  );
  const height = Math.max(
    620,
    Math.min(Number(state.height) || 900, display.height)
  );
  const visible =
    Number.isFinite(state.x) &&
    Number.isFinite(state.y) &&
    screen
      .getAllDisplays()
      .some(
        ({ workArea: b }) =>
          state.x + width > b.x + 50 &&
          state.x < b.x + b.width - 50 &&
          state.y + height > b.y + 50 &&
          state.y < b.y + b.height - 50
      );
  mainWindow = new BrowserWindow({
    width,
    height,
    ...(visible ? { x: state.x, y: state.y } : {}),
    minWidth: Math.min(900, display.width),
    minHeight: Math.min(620, display.height),
    show: false,
    backgroundColor: '#f2f5f7',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(
      app.isPackaged ? path.join(__dirname, '..', 'build') : __dirname,
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    ),
    title: 'Cutting Optimization',
  });
  mainWindow.once('ready-to-show', () => {
    if (state.maximized) mainWindow.maximize();
    mainWindow.show();
  });
  const devUrl = !app.isPackaged ? process.env.CUTTING_DEV_SERVER_URL : null;
  if (devUrl) {
    const url = new URL(devUrl);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) {
      throw new Error(
        'Endereço de desenvolvimento inválido. Use npm run electron-dev.'
      );
    }
    mainWindow.loadURL(url.href);
  } else {
    const index = path.join(__dirname, '..', 'build', 'index.html');
    if (!fs.existsSync(index))
      throw new Error(
        'Build local ausente. Execute make start ou npm run electron.'
      );
    mainWindow.loadFile(index);
  }
  menu();
  mainWindow.on('close', event => {
    saveBounds();
    if (!allowClose && (documentState.dirty || documentState.busy)) {
      event.preventDefault();
      sendAction('close');
      return;
    }
    runner.cancelAll();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.on('render-process-gone', async () => {
    const recovery = store.read('workspace');
    documentState = {
      dirty: !!recovery,
      busy: false,
      name: 'Projeto recuperado',
    };
    runner.cancelAll();
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'A interface foi interrompida.',
      detail:
        'Reabra a interface para recuperar o último cadastro salvo automaticamente.',
      buttons: ['Reabrir interface', 'Fechar aplicativo'],
      defaultId: 0,
    });
    if (response.response === 0) mainWindow.reload();
    else {
      allowClose = true;
      mainWindow.close();
    }
  });
}
app
  .whenReady()
  .then(() => {
    store = createWorkspaceStore(
      path.join(app.getPath('userData'), 'workspace')
    );
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(
        path.join(
          app.isPackaged ? path.join(__dirname, '..', 'build') : __dirname,
          'icon.png'
        )
      );
    }
    createWindow();
  })
  .catch(error => {
    dialog.showErrorBox(
      'Não foi possível iniciar o Cutting Optimization',
      error.message
    );
    app.quit();
  });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('before-quit', event => {
  if (
    !allowClose &&
    mainWindow &&
    (documentState.dirty || documentState.busy)
  ) {
    event.preventDefault();
    quitting = true;
    sendAction('close');
  } else runner.cancelAll();
});
ipcMain.handle('optimize-cutting', (event, config, jobId) =>
  runner.run(event.sender, config, jobId)
);
ipcMain.handle('cancel-optimization', (event, jobId) => ({
  success: runner.cancel(event.sender.id, jobId),
}));
ipcMain.handle('load-workspace', () => store.read('workspace'));
ipcMain.handle('save-workspace', async (_event, data) => {
  try {
    if (data?.version !== 1 || !data.project)
      throw new Error('Recuperação inválida');
    await store.write('workspace', data);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('get-recent-projects', () => recent());
ipcMain.handle('set-document-state', (_event, state) => {
  documentState = {
    dirty: !!state?.dirty,
    busy: !!state?.busy,
    name: String(state?.name || 'Projeto sem título'),
  };
  if (mainWindow) {
    mainWindow.setTitle(
      `${documentState.dirty ? '● ' : ''}${documentState.name} — Cutting Optimization`
    );
    mainWindow.setDocumentEdited(documentState.dirty);
    mainWindow.setProgressBar(documentState.busy ? 2 : -1);
    menu();
  }
});
ipcMain.handle('close-window', () => {
  allowClose = true;
  if (quitting) app.quit();
  else mainWindow?.close();
});
ipcMain.handle('save-config', async (_event, config, existingPath) => {
  try {
    let filePath =
      typeof existingPath === 'string' && recent().includes(existingPath)
        ? existingPath
        : null;
    if (!filePath) {
      const saved = await dialog.showSaveDialog(mainWindow, {
        title: 'Salvar projeto de corte',
        defaultPath: 'projeto_corte.json',
        filters: [{ name: 'Projeto de corte', extensions: ['json'] }],
      });
      if (saved.canceled || !saved.filePath)
        return { success: false, canceled: true };
      filePath = saved.filePath;
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    await addRecent(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('load-config', async (_event, requestedPath) => {
  try {
    let filePath =
      typeof requestedPath === 'string' && recent().includes(requestedPath)
        ? requestedPath
        : null;
    if (!filePath) {
      const opened = await dialog.showOpenDialog(mainWindow, {
        title: 'Abrir projeto de corte',
        filters: [{ name: 'Projeto de corte', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (opened.canceled || !opened.filePaths.length)
        return { success: false, canceled: true };
      filePath = opened.filePaths[0];
    }
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (
      !config ||
      !Array.isArray(config.pieces) ||
      !Number.isFinite(config.stock_width)
    )
      throw new Error('O arquivo não contém um projeto de corte válido.');
    await addRecent(filePath);
    return { success: true, config, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('export-results', async (_event, results, format = 'json') => {
  try {
    if (
      !['csv', 'json'].includes(format) ||
      !Array.isArray(results?.result?.pieces_placed)
    )
      throw new Error('Resultado inválido');
    const saved = await dialog.showSaveDialog(mainWindow, {
      title: `Exportar ${format.toUpperCase()}`,
      defaultPath: `resultado_corte.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    });
    if (saved.canceled || !saved.filePath)
      return { success: false, canceled: true };
    fs.writeFileSync(
      saved.filePath,
      format === 'csv'
        ? resultsToCsv(results)
        : JSON.stringify(results, null, 2),
      'utf8'
    );
    exportedPaths.add(saved.filePath);
    return { success: true, filePath: saved.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('save-svg', async (_event, svg) => {
  try {
    if (typeof svg !== 'string' || !svg.includes('<svg'))
      throw new Error('SVG inválido');
    const saved = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar plano SVG em escala 1:1',
      defaultPath: 'plano_corte.svg',
      filters: [{ name: 'SVG', extensions: ['svg'] }],
    });
    if (saved.canceled || !saved.filePath)
      return { success: false, canceled: true };
    fs.writeFileSync(saved.filePath, svg, 'utf8');
    exportedPaths.add(saved.filePath);
    return { success: true, filePath: saved.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('show-export-in-folder', (_event, file) => {
  if (exportedPaths.has(file)) shell.showItemInFolder(file);
});
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-name', () => app.getName());
