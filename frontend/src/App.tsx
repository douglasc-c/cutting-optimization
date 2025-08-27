import React, { useState, useEffect } from 'react';
import './App.css';
import CuttingVisualizer from './components/CuttingVisualizer';

// Verificação de segurança para a API do Electron
const isElectron = window.electronAPI !== undefined;

interface CuttingConfig {
  stock_width: number;
  stock_height: number;
  pieces: Array<[number, number, number, boolean, string]>; // [width, height, quantity, allow_rotation, description]
  time_limit: number;
}

interface OptimizationResult {
  success: boolean;
  algorithm: string;
  result: {
    pieces_placed: any[];
    stock_used: any;
    waste_percentage: number;
    execution_time: number;
    is_optimal: boolean;
    total_area: number;
    used_area: number;
  };
  efficiency_metrics: any;
  error?: string;
}

function App() {
  const [config, setConfig] = useState<CuttingConfig>({
    stock_width: 1000,
    stock_height: 800,
    pieces: [[200, 300, 2, true, "Prancha Grande"], [150, 200, 3, true, "Prancha Média"]], // [width, height, quantity, allow_rotation, description]
    time_limit: 60
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Teste da API do Electron na inicialização
  useEffect(() => {
    console.log('Testando API do Electron...');
    if (window.electronAPI) {
      console.log('✅ API do Electron disponível');
      console.log('Métodos disponíveis:', Object.keys(window.electronAPI));
    } else {
      console.log('❌ API do Electron não disponível');
      console.log('Isso é normal se executado no navegador');
    }
  }, []);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!isElectron) {
        throw new Error('Esta aplicação deve ser executada no Electron');
      }
      
      const optimizationResult = await window.electronAPI.optimizeCutting(config);
      setResult(optimizationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (!isElectron) {
        alert('Esta aplicação deve ser executada no Electron');
        return;
      }
      
      const saveResult = await window.electronAPI.saveConfig(config);
      if (saveResult.success) {
        alert(`Configuração salva em: ${saveResult.filePath}`);
      } else {
        alert(`Erro ao salvar: ${saveResult.error}`);
      }
    } catch (err) {
      alert(`Erro ao salvar configuração: ${err}`);
    }
  };

  const handleLoadConfig = async () => {
    try {
      if (!isElectron) {
        alert('Esta aplicação deve ser executada no Electron');
        return;
      }
      
      const loadResult = await window.electronAPI.loadConfig();
      if (loadResult.success) {
        setConfig(loadResult.config);
        alert(`Configuração carregada de: ${loadResult.filePath}`);
      } else {
        alert(`Erro ao carregar: ${loadResult.error}`);
      }
    } catch (err) {
      alert(`Erro ao carregar configuração: ${err}`);
    }
  };

  const handleExportResults = async () => {
    if (!result) {
      alert('Nenhum resultado para exportar');
      return;
    }

    try {
      if (!isElectron) {
        alert('Esta aplicação deve ser executada no Electron');
        return;
      }
      
      const exportResult = await window.electronAPI.exportResults(result);
      if (exportResult.success) {
        alert(`Resultados exportados para: ${exportResult.filePath}`);
      } else {
        alert(`Erro ao exportar: ${exportResult.error}`);
      }
    } catch (err) {
      alert(`Erro ao exportar resultados: ${err}`);
    }
  };

  const addPiece = () => {
    setConfig(prev => ({
      ...prev,
      pieces: [...prev.pieces, [100, 100, 1, true, "Nova Peça"]] // [width, height, quantity, allow_rotation, description]
    }));
  };

  const removePiece = (index: number) => {
    setConfig(prev => ({
      ...prev,
      pieces: prev.pieces.filter((_, i) => i !== index)
    }));
  };

  const updatePiece = (index: number, field: number, value: number | boolean | string) => {
    setConfig(prev => ({
      ...prev,
      pieces: prev.pieces.map((piece, i) => 
        i === index ? [
          field === 0 ? value as number : piece[0],
          field === 1 ? value as number : piece[1],
          field === 2 ? value as number : piece[2],
          field === 3 ? value as boolean : piece[3],
          field === 4 ? value as string : piece[4]
        ] as [number, number, number, boolean, string] : piece
      )
    }));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔧 Otimização de Corte Bidimensional</h1>
        <p>Sistema de otimização de corte para minimizar desperdício</p>
      </header>

      <main className="App-main">
        <div className="config-section">
          <h2>📋 Configuração do Problema</h2>
          
          <div className="stock-config">
            <h3>Material Base</h3>
            <div className="input-group">
              <label>
                Largura (mm):
                <input
                  type="number"
                  value={config.stock_width}
                  onChange={(e) => setConfig(prev => ({ ...prev, stock_width: parseInt(e.target.value) || 0 }))}
                />
              </label>
              <label>
                Altura (mm):
                <input
                  type="number"
                  value={config.stock_height}
                  onChange={(e) => setConfig(prev => ({ ...prev, stock_height: parseInt(e.target.value) || 0 }))}
                />
              </label>
            </div>
          </div>

          <div className="pieces-config">
            <h3>Peças a Cortar</h3>
            {config.pieces.map((piece, index) => (
              <div key={index} className="piece-input">
                <span>Peça {index + 1}:</span>
                <input
                  type="number"
                  placeholder="Largura"
                  value={piece[0]}
                  onChange={(e) => updatePiece(index, 0, parseInt(e.target.value) || 0)}
                />
                <span>x</span>
                <input
                  type="number"
                  placeholder="Altura"
                  value={piece[1]}
                  onChange={(e) => updatePiece(index, 1, parseInt(e.target.value) || 0)}
                />
                <span>mm</span>
                <input
                  type="number"
                  placeholder="Qtd"
                  value={piece[2]}
                  onChange={(e) => updatePiece(index, 2, parseInt(e.target.value) || 0)}
                />
                <span>unidades</span>
                <label className="rotation-checkbox">
                  <input
                    type="checkbox"
                    checked={piece[3]}
                    onChange={(e) => updatePiece(index, 3, e.target.checked)}
                  />
                  🔄 Rotação
                </label>
                <input
                  type="text"
                  placeholder="Descrição"
                  value={piece[4]}
                  onChange={(e) => updatePiece(index, 4, e.target.value)}
                  className="description-input"
                />
                <button onClick={() => removePiece(index)} className="remove-btn">❌</button>
              </div>
            ))}
            <button onClick={addPiece} className="add-btn">➕ Adicionar Peça</button>
          </div>

          <div className="options-config">
            <h3>Opções</h3>
            <label>
              <input
                type="checkbox"
                checked={true}
                disabled
              />
              Rotação por peça (ver configuração individual)
            </label>
            <label>
              Limite de tempo (segundos):
              <input
                type="number"
                value={config.time_limit}
                onChange={(e) => setConfig(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 60 }))}
              />
            </label>
          </div>

          <div className="actions">
            <button onClick={handleSaveConfig} className="btn-secondary">💾 Salvar Config</button>
            <button onClick={handleLoadConfig} className="btn-secondary">📂 Carregar Config</button>
            <button onClick={handleOptimize} disabled={loading} className="btn-primary">
              {loading ? '🔄 Otimizando...' : '🚀 Otimizar Corte'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-section">
            <h3>❌ Erro</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="result-section">
            <h2>✅ Resultados da Otimização</h2>
            
            <div className="result-summary">
              <div className="result-item">
                <strong>Algoritmo:</strong> {result.algorithm}
              </div>
              <div className="result-item">
                <strong>Peças cortadas:</strong> {result.result.pieces_placed.length}
              </div>
              <div className="result-item">
                <strong>Área utilizada:</strong> {result.result.used_area.toLocaleString()} mm²
              </div>
              <div className="result-item">
                <strong>Desperdício:</strong> {result.result.waste_percentage.toFixed(2)}%
              </div>
              <div className="result-item">
                <strong>Tempo de execução:</strong> {result.result.execution_time.toFixed(2)}s
              </div>
              <div className="result-item">
                <strong>Solução ótima:</strong> {result.result.is_optimal ? 'Sim' : 'Não'}
              </div>
              <div className="result-item">
                <strong>Eficiência de área:</strong> {result.efficiency_metrics?.area_efficiency?.toFixed(1)}%
              </div>
            </div>

            <div className="result-actions">
              <button onClick={handleExportResults} className="btn-secondary">
                📤 Exportar Resultados
              </button>
            </div>

            {result.result.pieces_placed.length > 0 && (
              <>
                {/* Visualização do Corte */}
                <CuttingVisualizer
                  stockWidth={config.stock_width}
                  stockHeight={config.stock_height}
                  piecesPlaced={result.result.pieces_placed}
                  showGrid={true}
                  showDimensions={true}
                />
                
                {/* Lista de Peças Colocadas */}
                <div className="pieces-placed">
                  <h3>🧩 Peças Colocadas</h3>
                  <div className="pieces-grid">
                    {result.result.pieces_placed.map((piece, index) => (
                      <div key={index} className="piece-item">
                        <strong>{piece.id}</strong>
                        <div>Posição: ({piece.x}, {piece.y})</div>
                        <div>Tamanho: {piece.width} x {piece.height} mm</div>
                        <div>Área: {piece.area} mm²</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
