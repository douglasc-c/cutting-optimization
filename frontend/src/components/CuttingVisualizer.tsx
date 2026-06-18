import React from 'react';
import './CuttingVisualizer.css';

interface Piece {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  description?: string;
}

interface CuttingVisualizerProps {
  stockWidth: number;
  stockHeight: number;
  piecesPlaced: Piece[];
  showGrid?: boolean;
  showDimensions?: boolean;
}

const CuttingVisualizer: React.FC<CuttingVisualizerProps> = ({
  stockWidth,
  stockHeight,
  piecesPlaced,
  showGrid = true,
  showDimensions = true
}) => {
  // Escala de preview para caber na tela sem alterar a escala do SVG exportado.
  const maxSize = 600;
  const safeStockWidth = Math.max(1, stockWidth);
  const safeStockHeight = Math.max(1, stockHeight);
  const scaleX = maxSize / safeStockWidth;
  const scaleY = maxSize / safeStockHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = stockWidth * scale;
  const scaledHeight = stockHeight * scale;
  const mmToCm = (valueMm: number): number => valueMm / 10;
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

  const getTextMetrics = (pieceWidth: number, pieceHeight: number, localScale: number) => {
    const minSide = Math.max(1, Math.min(pieceWidth, pieceHeight) * localScale);
    const dimensionFontSize = clamp(minSide * 0.2, 2, 16);
    const nameFontSize = clamp(dimensionFontSize * 0.85, 1.8, 13);
    const topOffset = clamp(dimensionFontSize * 0.45, 1.2, 8);
    const bottomOffset = clamp(nameFontSize * 0.9, 1.5, 9);

    return {
      dimensionFontSize,
      nameFontSize,
      topOffset,
      bottomOffset
    };
  };

  // Cores para as peças
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  // Função para exportar SVG apenas com as peças
  const exportPiecesOnly = () => {
    const svgContent = generatePiecesOnlySVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cutting-pieces-${stockWidth}x${stockHeight}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Função para gerar SVG apenas com as peças
  const generatePiecesOnlySVG = () => {
    const exportScale = 1;
    const piecesElements = piecesPlaced.map((piece, index) => {
      const colorIndex = index % colors.length;
      const pieceLabel = (piece.description || piece.id || '').trim();
      const textMetrics = getTextMetrics(piece.width, piece.height, exportScale);
      
      let pieceContent = `
        <rect
          x="${piece.x * exportScale}"
          y="${piece.y * exportScale}"
          width="${piece.width * exportScale}"
          height="${piece.height * exportScale}"
          fill="${colors[colorIndex]}"
          stroke="#333"
          stroke-width="0.5"
          opacity="0.8"
        />`;
      
      if (showDimensions) {
        pieceContent += `
        <text
          x="${piece.x * exportScale + (piece.width * exportScale) / 2}"
          y="${piece.y * exportScale + (piece.height * exportScale) / 2 - textMetrics.topOffset}"
          text-anchor="middle"
          font-size="${textMetrics.dimensionFontSize}"
          fill="#333"
          font-weight="bold"
          style="text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"
        >
          ${mmToCm(piece.width).toFixed(1)}×${mmToCm(piece.height).toFixed(1)} cm
        </text>
        <text
          x="${piece.x * exportScale + (piece.width * exportScale) / 2}"
          y="${piece.y * exportScale + (piece.height * exportScale) / 2 + textMetrics.bottomOffset}"
          text-anchor="middle"
          font-size="${textMetrics.nameFontSize}"
          fill="#333"
          style="text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"
        >
          ${pieceLabel}
        </text>`;
      }
      
      return `<g>${pieceContent}</g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  width="${stockWidth}mm"
  height="${stockHeight}mm"
  viewBox="0 0 ${stockWidth} ${stockHeight}"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Peças colocadas -->
  ${piecesElements}
  
  <!-- Dimensões do material -->
  ${showDimensions ? `
  <text
    x="${stockWidth / 2}"
    y="-2"
    text-anchor="middle"
    font-size="3"
    fill="#666"
    font-weight="bold"
  >
    ${mmToCm(stockWidth).toFixed(1)} cm
  </text>
  <text
    x="-2"
    y="${stockHeight / 2}"
    text-anchor="middle"
    font-size="3"
    fill="#666"
    font-weight="bold"
    transform="rotate(-90, -2, ${stockHeight / 2})"
  >
    ${mmToCm(stockHeight).toFixed(1)} cm
  </text>` : ''}
</svg>`;
  };

  return (
    <div className="cutting-visualizer">
      <div className="visualizer-header">
        <h3>📐 Visualização do Corte</h3>
        <div className="visualizer-info">
          <span>Material: {mmToCm(stockWidth).toFixed(1)} × {mmToCm(stockHeight).toFixed(1)} cm</span>
          <span>Peças: {piecesPlaced.length}</span>
          <span>Escala (preview): 1:{Math.max(1, Math.round(1 / scale))}</span>
          <span>Escala (SVG): 1:1</span>
          <button 
            onClick={exportPiecesOnly} 
            className="export-btn"
            title="Exportar SVG em escala real 1:1"
          >
            📤 Exportar SVG
          </button>
        </div>
      </div>
      
      <div className="visualizer-container">
        <svg
          width={scaledWidth}
          height={scaledHeight}
          viewBox={`0 0 ${scaledWidth} ${scaledHeight}`}
          className="cutting-svg"
        >
          {/* Fundo do material */}
          <rect
            x="0"
            y="0"
            width={scaledWidth}
            height={scaledHeight}
            fill="#f8f9fa"
            stroke="#dee2e6"
            strokeWidth="2"
          />
          
          {/* Grade */}
          {showGrid && (
            <>
              {/* Linhas verticais */}
              {Array.from({ length: Math.ceil(stockWidth / 50) + 1 }).map((_, i) => (
                <line
                  key={`v-${i * 50}`}
                  x1={i * 50 * scale}
                  y1={0}
                  x2={i * 50 * scale}
                  y2={scaledHeight}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              ))}
              
              {/* Linhas horizontais */}
              {Array.from({ length: Math.ceil(stockHeight / 50) + 1 }).map((_, i) => (
                <line
                  key={`h-${i * 50}`}
                  x1={0}
                  y1={i * 50 * scale}
                  x2={scaledWidth}
                  y2={i * 50 * scale}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              ))}
            </>
          )}
          
          {/* Peças colocadas */}
          {piecesPlaced.map((piece, index) => {
            const colorIndex = index % colors.length;
            const pieceKey = `${piece.id}-${piece.x}-${piece.y}-${index}`;
            const pieceLabel = (piece.description || piece.id || '').trim();
            const textMetrics = getTextMetrics(piece.width, piece.height, scale);
            
            return (
              <g key={pieceKey}>
                <rect
                  x={piece.x * scale}
                  y={piece.y * scale}
                  width={piece.width * scale}
                  height={piece.height * scale}
                  fill={colors[colorIndex]}
                  stroke="#333"
                  strokeWidth="1"
                  opacity="0.8"
                />
                
                {/* Dimensões e descrição dentro da peça */}
                {showDimensions && (
                  <>
                    {/* Dimensões no centro da peça */}
                    <text
                      x={piece.x * scale + (piece.width * scale) / 2}
                      y={piece.y * scale + (piece.height * scale) / 2 - textMetrics.topOffset}
                      textAnchor="middle"
                      fontSize={textMetrics.dimensionFontSize}
                      fill="#333"
                      fontWeight="bold"
                    >
                      {mmToCm(piece.width).toFixed(1)}×{mmToCm(piece.height).toFixed(1)} cm
                    </text>
                    
                    {/* Descrição abaixo das dimensões */}
                    <text
                      x={piece.x * scale + (piece.width * scale) / 2}
                      y={piece.y * scale + (piece.height * scale) / 2 + textMetrics.bottomOffset}
                      textAnchor="middle"
                      fontSize={textMetrics.nameFontSize}
                      fill="#333"
                    >
                      {pieceLabel}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          
          {/* Dimensões do material */}
          {showDimensions && (
            <>
              <text
                x={scaledWidth / 2}
                y={-10}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
                fontWeight="bold"
              >
                {mmToCm(stockWidth).toFixed(1)} cm
              </text>
              <text
                x={-10}
                y={scaledHeight / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
                fontWeight="bold"
                transform={`rotate(-90, -10, ${scaledHeight / 2})`}
              >
                {mmToCm(stockHeight).toFixed(1)} cm
              </text>
            </>
          )}
        </svg>
      </div>
      
      {/* Legenda */}
      <div className="visualizer-legend">
        <h4>Legenda:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF6B6B' }}></div>
            <span>Peças</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#e0e0e0', border: '1px dashed #ccc' }}></div>
            <span>Grade (5cm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CuttingVisualizer;
