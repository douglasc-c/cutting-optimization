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

  // Gerar grade
  const gridSize = 50;
  const gridLines = [];
  
  if (showGrid) {
    // Linhas verticais
    for (let x = 0; x <= stockWidth; x += gridSize) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x * scale}
          y1={0}
          x2={x * scale}
          y2={scaledHeight}
          stroke="#e0e0e0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }
    
    // Linhas horizontais
    for (let y = 0; y <= stockHeight; y += gridSize) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y * scale}
          x2={scaledWidth}
          y2={y * scale}
          stroke="#e0e0e0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }
  }

  return (
    <div className="cutting-visualizer">
      <div className="visualizer-header">
        <h3>📐 Visualização do Corte</h3>
        <div className="visualizer-info">
          <span>Material: {stockWidth} × {stockHeight} mm</span>
          <span>Peças: {piecesPlaced.length}</span>
          <span>Escala: 1:{Math.round(1/scale)}</span>
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
          {gridLines}
          
          {/* Peças colocadas */}
          {piecesPlaced.map((piece, index) => {
            const colorIndex = index % colors.length;
            const isRotated = piece.id.includes('_rot');
            
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
                
                {/* Indicador de rotação */}
                {isRotated && (
                  <text
                    x={piece.x * scale + (piece.width * scale) / 2}
                    y={piece.y * scale + (piece.height * scale) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="16"
                    fill="#333"
                    fontWeight="bold"
                  >
                    🔄
                  </text>
                )}
                
                {/* Dimensões da peça */}
                {showDimensions && (
                  <>
                    <text
                      x={piece.x * scale + (piece.width * scale) / 2}
                      y={piece.y * scale - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#333"
                    >
                      {piece.width}×{piece.height}
                    </text>
                    {/* Fundo para a descrição */}
                    {(() => {
                      const description = piece.description || piece.id;
                      const textWidth = description.length * 6; // Aproximação do tamanho do texto
                      const bgWidth = Math.max(textWidth, 60);
                      
                      return (
                        <rect
                          x={piece.x * scale + (piece.width * scale) / 2 - bgWidth / 2}
                          y={piece.y * scale + (piece.height * scale) + 5}
                          width={bgWidth}
                          height="15"
                          fill="rgba(255, 255, 255, 0.9)"
                          stroke="rgba(0, 0, 0, 0.2)"
                          strokeWidth="0.5"
                          rx="3"
                        />
                      );
                    })()}
                    <text
                      x={piece.x * scale + (piece.width * scale) / 2}
                      y={piece.y * scale + (piece.height * scale) + 15}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#333"
                      fontWeight="bold"
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
            <span>Peças normais</span>
          </div>
          <div className="legend-item">
            <span>🔄</span>
            <span>Peças rotacionadas</span>
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
