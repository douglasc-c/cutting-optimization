import React, { useState, useEffect } from 'react';
import './App.css';
import CuttingVisualizer from './components/CuttingVisualizer';

// Verificação de segurança para a API do Electron
const isElectron = window.electronAPI !== undefined;
const MM_PER_CM = 10;

interface CuttingConfig {
  stock_width: number;
  stock_height: number;
  pieces: Array<[number, number, number, boolean, string]>; // [width, height, quantity, allow_rotation, description]
  time_limit: number;
  optimization_mode: 'fast' | 'refined';
}

interface PiecePlaced {
  id: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

interface StockUsed {
  width: number;
  height: number;
}

interface EfficiencyMetrics {
  area_efficiency: number;
  waste_percentage: number;
}

interface OptimizationResult {
  success: boolean;
  algorithm: string;
  result: {
    pieces_placed: PiecePlaced[];
    stock_used: StockUsed;
    waste_percentage: number;
    execution_time: number;
    is_optimal: boolean;
    total_area: number;
    used_area: number;
  };
  efficiency_metrics: EfficiencyMetrics;
  layout_metrics?: {
    used_width: number;
    used_height: number;
    suggested_stock_height: number;
    effective_stock_height?: number;
    length_utilization_percentage: number;
    bbox_area_efficiency: number;
  };
  error?: string;
}

const cmToMm = (valueCm: number): number => Math.max(0, Math.round((Number(valueCm) || 0) * MM_PER_CM));
const mmToCm = (valueMm: number): number => (Number(valueMm) || 0) / MM_PER_CM;
const mm2ToCm2 = (valueMm2: number): number => (Number(valueMm2) || 0) / (MM_PER_CM * MM_PER_CM);

function App() {
  const [config, setConfig] = useState<CuttingConfig>({
    stock_width: 100,
    stock_height: 0,
    pieces: [[20, 30, 2, true, "Prancha Grande"], [15, 20, 3, true, "Prancha Média"]], // [width, height, quantity, allow_rotation, description]
    time_limit: 60,
    optimization_mode: 'refined'
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Teste da API do Electron na inicialização
  useEffect(() => {
    // Verificação silenciosa da API do Electron
    if (process.env.NODE_ENV === 'development' && window.electronAPI) {
      // eslint-disable-next-line no-console
      console.log('API do Electron disponível');
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

      const payloadConfig: CuttingConfig = {
        ...config,
        stock_width: cmToMm(config.stock_width),
        stock_height: config.stock_height > 0 ? cmToMm(config.stock_height) : 0,
        pieces: config.pieces.map(([w, h, q, rot, desc]) => [
          cmToMm(w),
          cmToMm(h),
          Math.max(0, Math.floor(q || 0)),
          rot,
          desc
        ])
      };

      const optimizationResult = await window.electronAPI.optimizeCutting(payloadConfig);
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

      const configToSaveMm: CuttingConfig = {
        ...config,
        stock_width: cmToMm(config.stock_width),
        stock_height: config.stock_height > 0 ? cmToMm(config.stock_height) : 0,
        pieces: config.pieces.map(([w, h, q, rot, desc]) => [
          cmToMm(w),
          cmToMm(h),
          Math.max(0, Math.floor(q || 0)),
          rot,
          desc
        ])
      };

      const saveResult = await window.electronAPI.saveConfig(configToSaveMm);
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
        const loaded = loadResult.config as CuttingConfig;
        setConfig({
          ...loaded,
          stock_width: mmToCm(loaded.stock_width),
          stock_height: loaded.stock_height > 0 ? mmToCm(loaded.stock_height) : 0,
          pieces: loaded.pieces.map(([w, h, q, rot, desc]) => [
            mmToCm(w),
            mmToCm(h),
            q,
            rot,
            desc
          ])
        });
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
                Largura (cm):
                <input
                  type="number"
                  value={config.stock_width}
                  onChange={(e) => setConfig(prev => ({ ...prev, stock_width: parseFloat(e.target.value) || 0 }))}
                />
              </label>
            </div>
            <small>A altura do material será definida automaticamente após posicionar as peças.</small>
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
                  onChange={(e) => updatePiece(index, 0, parseFloat(e.target.value) || 0)}
                />
                <span>x</span>
                <input
                  type="number"
                  placeholder="Altura"
                  value={piece[1]}
                  onChange={(e) => updatePiece(index, 1, parseFloat(e.target.value) || 0)}
                />
                <span>cm</span>
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
              Modo de otimização:
              <select
                value={config.optimization_mode}
                onChange={(e) => setConfig(prev => ({ ...prev, optimization_mode: e.target.value as 'fast' | 'refined' }))}
              >
                <option value="fast">Rápido</option>
                <option value="refined">Refinado</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={true}
                disabled
              />
              Rotação por peça (ver configuração individual)
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
                <strong>Área utilizada:</strong> {mm2ToCm2(result.result.used_area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm²
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
              {result.layout_metrics && (
                <div className="result-item">
                  <strong>Comprimento usado:</strong> {mmToCm(result.layout_metrics.used_height).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm
                </div>
              )}
              {result.layout_metrics && (
                <div className="result-item">
                  <strong>Altura sugerida do material:</strong> {mmToCm(result.layout_metrics.suggested_stock_height).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm
                </div>
              )}
              {result.layout_metrics && (
                <div className="result-item">
                  <strong>Aproveitamento no comprimento:</strong> {result.layout_metrics.length_utilization_percentage.toFixed(1)}%
                </div>
              )}
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
                  stockWidth={cmToMm(config.stock_width)}
                  stockHeight={result.layout_metrics?.effective_stock_height || result.layout_metrics?.suggested_stock_height || result.layout_metrics?.used_height || cmToMm(config.stock_height)}
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
                        <strong>{piece.description || piece.id}</strong>
                        <div>Posição: ({mmToCm(piece.x).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}, {mmToCm(piece.y).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}) cm</div>
                        <div>Tamanho: {mmToCm(piece.width).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} x {mmToCm(piece.height).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm</div>
                        <div>Área: {mm2ToCm2(piece.area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm²</div>
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
