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
  // Escala para caber na tela (máximo 600px)
  const maxSize = 600;
  const scaleX = maxSize / stockWidth;
  const scaleY = maxSize / stockHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = stockWidth * scale;
  const scaledHeight = stockHeight * scale;

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
    const piecesElements = piecesPlaced.map((piece, index) => {
      const colorIndex = index % colors.length;
      
      let pieceContent = `
        <rect
          x="${piece.x * scale}"
          y="${piece.y * scale}"
          width="${piece.width * scale}"
          height="${piece.height * scale}"
          fill="${colors[colorIndex]}"
          stroke="#333"
          stroke-width="1"
          opacity="0.8"
        />`;
      
      if (showDimensions) {
        pieceContent += `
        <text
          x="${piece.x * scale + (piece.width * scale) / 2}"
          y="${piece.y * scale + (piece.height * scale) / 2 - 5}"
          text-anchor="middle"
          font-size="10"
          fill="#333"
          font-weight="bold"
          style="text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"
        >
          ${piece.width}×${piece.height}
        </text>
        <text
          x="${piece.x * scale + (piece.width * scale) / 2}"
          y="${piece.y * scale + (piece.height * scale) / 2 + 10}"
          text-anchor="middle"
          font-size="9"
          fill="#333"
          style="text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"
        >
          ${piece.description || piece.id}
        </text>`;
      }
      
      return `<g>${pieceContent}</g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  width="${scaledWidth}"
  height="${scaledHeight}"
  viewBox="0 0 ${scaledWidth} ${scaledHeight}"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Peças colocadas -->
  ${piecesElements}
  
  <!-- Dimensões do material -->
  ${showDimensions ? `
  <text
    x="${scaledWidth / 2}"
    y="-10"
    text-anchor="middle"
    font-size="12"
    fill="#666"
    font-weight="bold"
  >
    ${stockWidth} mm
  </text>
  <text
    x="-10"
    y="${scaledHeight / 2}"
    text-anchor="middle"
    font-size="12"
    fill="#666"
    font-weight="bold"
    transform="rotate(-90, -10, ${scaledHeight / 2})"
  >
    ${stockHeight} mm
  </text>` : ''}
</svg>`;
  };

  return (
    <div className="cutting-visualizer">
      <div className="visualizer-header">
        <h3>📐 Visualização do Corte</h3>
        <div className="visualizer-info">
          <span>Material: {stockWidth} × {stockHeight} mm</span>
          <span>Peças: {piecesPlaced.length}</span>
          <span>Escala: 1:{Math.round(1/scale)}</span>
          <button 
            onClick={exportPiecesOnly} 
            className="export-btn"
            title="Exportar apenas as peças em SVG (sem grade)"
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
            
            return (
              <g key={piece.id}>
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
                      y={piece.y * scale + (piece.height * scale) / 2 - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#333"
                      fontWeight="bold"
                    >
                      {piece.width}×{piece.height}
                    </text>
                    
                    {/* Descrição abaixo das dimensões */}
                    <text
                      x={piece.x * scale + (piece.width * scale) / 2}
                      y={piece.y * scale + (piece.height * scale) / 2 + 10}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#333"
                    >
                      {piece.description || piece.id}
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
                {stockWidth} mm
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
                {stockHeight} mm
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
            <span>Grade (50mm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CuttingVisualizer;
