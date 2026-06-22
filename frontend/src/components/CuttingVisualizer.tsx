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
    const dimensionFontSize = clamp(minSide * 0.18, 2, 14);
    const nameFontSize = clamp(dimensionFontSize * 0.85, 1.8, 12);
    const padding = clamp(minSide * 0.06, 1, 6);
    const lineGap = clamp(dimensionFontSize * 1.2, 2, 16);

    return {
      dimensionFontSize,
      nameFontSize,
      padding,
      lineGap
    };
  };

  const isRotated = (piece: Piece): boolean => {
    return piece.id.endsWith('_rot');
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
    // No SVG exportado (escala 1:1 em mm), o fontSize em px seria minúsculo.
    // Calculamos diretamente em mm: ~5% do menor lado, com limites físicos legíveis.
    const getExportTextMetrics = (pw: number, ph: number) => {
      const minSide = Math.max(1, Math.min(pw, ph));
      const dimensionFontSize = clamp(minSide * 0.055, 3, 18);
      const nameFontSize = clamp(dimensionFontSize * 0.85, 2.5, 15);
      const padding = clamp(minSide * 0.04, 1.5, 8);
      const lineGap = clamp(dimensionFontSize * 1.3, 3, 22);
      return { dimensionFontSize, nameFontSize, padding, lineGap };
    };

    const piecesElements = piecesPlaced.map((piece, index) => {
      const colorIndex = index % colors.length;
      const pieceLabel = (piece.description || piece.id || '').trim();
      const textMetrics = getExportTextMetrics(piece.width, piece.height);
      
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
        const rotated = piece.id.endsWith('_rot');
        const px = piece.x * exportScale;
        const py = piece.y * exportScale;
        const pw = piece.width * exportScale;
        const ph = piece.height * exportScale;
        const textX = px + textMetrics.padding;
        const dimY = py + textMetrics.padding + textMetrics.dimensionFontSize;
        const nameY = dimY + textMetrics.lineGap;
        const rotTransform = rotated
          ? `transform="rotate(90, ${px + pw / 2}, ${py + ph / 2}) translate(${(ph - pw) / 2}, ${(pw - ph) / 2})"`
          : '';

        pieceContent += `
        <g ${rotTransform}>
          <text
            x="${textX}"
            y="${dimY}"
            text-anchor="start"
            font-size="${textMetrics.dimensionFontSize}"
            fill="#333"
            font-weight="bold"
            font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
          >
            ${mmToCm(piece.width).toFixed(1)}×${mmToCm(piece.height).toFixed(1)} cm
          </text>
          <text
            x="${textX}"
            y="${nameY}"
            text-anchor="start"
            font-size="${textMetrics.nameFontSize}"
            fill="#333"
            font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
          >
            ${pieceLabel}
          </text>
        </g>`;
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
            const rotated = isRotated(piece);
            const px = piece.x * scale;
            const py = piece.y * scale;
            const pw = piece.width * scale;
            const ph = piece.height * scale;
            const textX = px + textMetrics.padding;
            const dimY = py + textMetrics.padding + textMetrics.dimensionFontSize;
            const nameY = dimY + textMetrics.lineGap;
            const rotateTransform = rotated
              ? `rotate(90, ${px + pw / 2}, ${py + ph / 2}) translate(${(ph - pw) / 2}, ${(pw - ph) / 2})`
              : undefined;

            return (
              <g key={pieceKey}>
                <rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  fill={colors[colorIndex]}
                  stroke="#333"
                  strokeWidth="1"
                  opacity="0.8"
                />

                {/* Dimensão e nome no canto superior esquerdo, rotacionado se necessário */}
                {showDimensions && (
                  <g transform={rotateTransform}>
                    <text
                      x={textX}
                      y={dimY}
                      textAnchor="start"
                      fontSize={textMetrics.dimensionFontSize}
                      fill="#333"
                      fontWeight="bold"
                    >
                      {mmToCm(piece.width).toFixed(1)}×{mmToCm(piece.height).toFixed(1)} cm
                    </text>
                    <text
                      x={textX}
                      y={nameY}
                      textAnchor="start"
                      fontSize={textMetrics.nameFontSize}
                      fill="#333"
                    >
                      {pieceLabel}
                    </text>
                  </g>
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
