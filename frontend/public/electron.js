const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Cutting Optimization'
  });

  // Carregar a aplicação React
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Para produção, carregar do diretório build
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Carregando index.html de:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Abrir DevTools em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Adicionar logs para debug
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Página carregada com sucesso');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Erro ao carregar página:', errorCode, errorDescription, validatedURL);
  });

  // Abrir DevTools em caso de erro
  mainWindow.webContents.on('crashed', () => {
    console.error('Aplicação travou');
    mainWindow.webContents.openDevTools();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers para comunicação com o frontend

ipcMain.handle('optimize-cutting', async (event, config) => {
  try {
    // Determinar o caminho do backend baseado se está empacotado ou não
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const backendPath = isDev 
      ? path.resolve(__dirname, '..', '..', 'backend')
      : path.resolve(process.resourcesPath, 'backend');
    
    const pythonScript = path.join(backendPath, 'main.py');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(pythonScript)) {
      throw new Error(`Script Python não encontrado: ${pythonScript}`);
    }
    
    // Criar um arquivo temporário com a configuração no diretório temporário do sistema
    const os = require('os');
    const tempDir = os.tmpdir();
    const tempConfigPath = path.join(tempDir, 'cutting_optimization_config.json');
    
    // Criar diretório temporário para saída
    const tempOutputDir = path.join(tempDir, 'cutting_optimization_output');
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }
    
    console.log('Backend path:', backendPath);
    console.log('Python script:', pythonScript);
    console.log('Temp config path:', tempConfigPath);
    console.log('Temp output dir:', tempOutputDir);
    
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
    
    // Verificar se python3 está disponível
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    const pythonProcess = spawn(pythonCommand, [
      pythonScript, 
      '--config', tempConfigPath, 
      '--output-dir', tempOutputDir,
      '--json-output'
    ], {
      cwd: backendPath
    });
    
    return new Promise((resolve, reject) => {
      // Adicionar timeout
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Timeout: Python process demorou muito para responder'));
      }, 30000); // 30 segundos
      let result = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
              pythonProcess.on('close', (code) => {
          clearTimeout(timeout); // Limpar timeout
          
          // Limpar arquivos temporários
          try {
            if (fs.existsSync(tempConfigPath)) {
              fs.unlinkSync(tempConfigPath);
            }
            // Limpar diretório de saída temporário
            if (fs.existsSync(tempOutputDir)) {
              fs.rmSync(tempOutputDir, { recursive: true, force: true });
            }
          } catch (e) {
            console.log('Erro ao remover arquivos temporários:', e);
          }
          
          if (code === 0) {
                      try {
              // Tentar parsear o resultado JSON do Python
              const lines = result.trim().split('\n');
              let jsonResult = null;
              
              // Tentar parsear o resultado completo primeiro
              try {
                jsonResult = JSON.parse(result.trim());
              } catch (e) {
                // Se não funcionar, tentar linha por linha
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();
                  
                  if (line.startsWith('{') || line.startsWith('[')) {
                    try {
                      jsonResult = JSON.parse(line);
                      break;
                    } catch (e) {
                      continue;
                    }
                  }
                }
              }
              
              if (jsonResult) {
                resolve(jsonResult);
              } else {
                // Se não conseguir parsear JSON, retornar erro
                reject(new Error('Não foi possível processar o resultado do Python'));
              }
          } catch (e) {
            console.error('Erro ao processar resultado:', e);
            reject(new Error('Erro ao processar resultado do Python'));
          }
        } else {
          console.error('Erro no Python:', error);
          reject(new Error(`Erro no Python: ${error}`));
        }
      });
    });
  } catch (error) {
    console.error('Erro geral:', error);
    throw new Error(`Erro ao executar otimização: ${error.message}`);
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Configuração',
      defaultPath: 'config.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });
    
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      return { success: true, filePath };
    }
    
    return { success: false, error: 'Nenhum arquivo selecionado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-config', async (event) => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Carregar Configuração',
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ],
      properties: ['openFile']
    });
    
    if (filePaths && filePaths.length > 0) {
      const configData = fs.readFileSync(filePaths[0], 'utf8');
      const config = JSON.parse(configData);
      return { success: true, config, filePath: filePaths[0] };
    }
    
    return { success: false, error: 'Nenhum arquivo selecionado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-results', async (event, results) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar Resultados',
      defaultPath: 'resultados_corte.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });
    
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
      return { success: true, filePath };
    }
    
    return { success: false, error: 'Nenhum arquivo selecionado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});
