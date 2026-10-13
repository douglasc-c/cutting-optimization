import React, { useId } from 'react';
import './CuttingVisualizer.css';
import { PlacedPiece, generateCuttingSvg, labelLayout, pieceColor, pieceName, LABEL_FONT } from '../utils/cuttingSvg';

interface CuttingVisualizerProps {
  stockWidth: number;
  stockHeight: number;
  piecesPlaced: PlacedPiece[];
  showGrid?: boolean;
  showDimensions?: boolean;
}

const CuttingVisualizer: React.FC<CuttingVisualizerProps> = ({ stockWidth, stockHeight, piecesPlaced, showGrid = true, showDimensions = true }) => {
  const prefix = useId().replace(/:/g, '');
  const scale = 600 / Math.max(1, stockWidth, stockHeight);
  const exportSvg = async () => {
    const svgContent = generateCuttingSvg(stockWidth, stockHeight, piecesPlaced, showDimensions);
    if (window.electronAPI?.saveSvg) {
      const saved = await window.electronAPI.saveSvg(svgContent);
      if (!saved.success && !saved.canceled) alert(`Erro ao exportar SVG: ${saved.error}`);
      return;
    }
    const url = URL.createObjectURL(new Blob([svgContent], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cutting-pieces-${stockWidth}x${stockHeight}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="cutting-visualizer">
    <div className="visualizer-header"><h3>📐 Visualização do Corte</h3>
      <div className="visualizer-info">
        <span>Material: {(stockWidth/10).toFixed(1)} × {(stockHeight/10).toFixed(1)} cm</span>
        <span>Peças: {piecesPlaced.length}</span><span>Escala (SVG): 1:1</span>
        <button onClick={() => exportSvg().catch(err => alert(`Erro ao exportar SVG: ${err.message}`))} className="export-btn">📤 Exportar SVG</button>
      </div>
    </div>
    <div className="visualizer-container">
      <svg width={stockWidth*scale} height={stockHeight*scale} viewBox={`0 0 ${stockWidth} ${stockHeight}`} className="cutting-svg">
        <rect width={stockWidth} height={stockHeight} fill="#f8f9fa" stroke="#dee2e6" strokeWidth={1/scale}/>
        {showGrid && <>
          {Array.from({length: Math.min(2000, Math.ceil(stockWidth/50))}, (_,i) => <line key={`v${i}`} x1={i*50} x2={i*50} y2={stockHeight} stroke="#e0e0e0" strokeWidth={1/scale}/>)}
          {Array.from({length: Math.min(2000, Math.ceil(stockHeight/50))}, (_,i) => <line key={`h${i}`} y1={i*50} y2={i*50} x2={stockWidth} stroke="#e0e0e0" strokeWidth={1/scale}/>)}
        </>}
        {piecesPlaced.map((piece,i) => {
          const layout = labelLayout(piece);
          const clipId = `${prefix}-piece-${i}`;
          const p = layout.padding;
          return <g key={`${piece.id}-${i}`}>
            <title>{pieceName(piece)}</title>
            <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><rect x={piece.x+p} y={piece.y+p} width={Math.max(0,piece.width-2*p)} height={Math.max(0,piece.height-2*p)}/></clipPath></defs>
            <rect x={piece.x} y={piece.y} width={piece.width} height={piece.height} fill={pieceColor(piece)} fillOpacity={0.8} stroke="#333" strokeWidth={0.5}/>
            {showDimensions && <g clipPath={`url(#${clipId})`}><g transform={layout.textTransform}>
              {layout.lines.map((line,n) => <text key={n} x={layout.x} y={layout.startY+n*layout.lineHeight} textAnchor="middle" fontFamily={LABEL_FONT} fontSize={n<layout.nameLines ? layout.size : layout.size*0.85} fill="#222">{line}</text>)}
            </g></g>}
          </g>;
        })}
      </svg>
    </div>
    <div className="visualizer-legend"><span>Grade: 5 cm · Cores por tipo de peça · Passe o cursor para ver o nome completo</span></div>
  </div>;
};
export default CuttingVisualizer;
