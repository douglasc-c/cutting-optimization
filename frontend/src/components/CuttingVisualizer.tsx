import React, { useEffect, useId, useRef, useState } from 'react';
import './CuttingVisualizer.css';
import Icon from './Icon';
import {
  PlacedPiece,
  labelLayout,
  pieceColor,
  pieceName,
  LABEL_FONT,
} from '../utils/cuttingSvg';
interface Props {
  stockWidth: number;
  stockHeight: number;
  piecesPlaced: PlacedPiece[];
  showGrid?: boolean;
  showDimensions?: boolean;
}
export default function CuttingVisualizer({
  stockWidth,
  stockHeight,
  piecesPlaced,
  showGrid = true,
  showDimensions = true,
}: Props) {
  const prefix = useId().replace(/:/g, '');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [grid, setGrid] = useState(showGrid);
  const [labels, setLabels] = useState(showDimensions);
  const [dragging, setDragging] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const [size, setSize] = useState({ width: 640, height: 460 });
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const resize = () =>
      setSize({
        width: Math.max(100, node.clientWidth),
        height: Math.max(100, node.clientHeight),
      });
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelected(null);
  }, [stockWidth, stockHeight, piecesPlaced]);
  const scale = Math.min(
    (size.width - 48) / stockWidth,
    (size.height - 48) / stockHeight
  );
  const origin = {
    x: (size.width - stockWidth * scale * zoom) / 2 + pan.x,
    y: (size.height - stockHeight * scale * zoom) / 2 + pan.y,
  };
  const fit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const changeZoom = (factor: number) =>
    setZoom(prev => Math.max(0.25, Math.min(12, prev * factor)));
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev =>
        Math.max(0.25, Math.min(12, prev * (e.deltaY > 0 ? 0.9 : 1.1)))
      );
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  const selectedPiece = selected === null ? null : piecesPlaced[selected];
  const spacing = Math.max(
    50,
    Math.ceil(Math.max(stockWidth, stockHeight) / 200 / 50) * 50
  );
  return (
    <div className="cutting-visualizer">
      <div className="canvas-toolbar">
        <div className="canvas-toggles">
          <label>
            <input
              type="checkbox"
              checked={grid}
              onChange={e => setGrid(e.target.checked)}
            />
            Grade
          </label>
          <label>
            <input
              type="checkbox"
              checked={labels}
              onChange={e => setLabels(e.target.checked)}
            />
            Nomes e medidas
          </label>
        </div>
        <div className="zoom-actions">
          <button
            aria-label="Diminuir zoom"
            onClick={() => changeZoom(1 / 1.25)}
          >
            <Icon name="minus" size={15} />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button aria-label="Aumentar zoom" onClick={() => changeZoom(1.25)}>
            <Icon name="plus" size={15} />
          </button>
          <button
            title="Ajustar à tela"
            aria-label="Ajustar à tela"
            onClick={fit}
          >
            <Icon name="fit" size={16} />
          </button>
        </div>
      </div>
      <div
        ref={container}
        className={`canvas-viewport ${dragging ? 'dragging' : ''}`}
        tabIndex={0}
        aria-label="Área interativa do plano: use mais e menos para zoom, setas para deslocar e zero para ajustar"
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            changeZoom(1.25);
          }
          if (e.key === '-') {
            e.preventDefault();
            changeZoom(1 / 1.25);
          }
          if (e.key === '0') {
            e.preventDefault();
            fit();
          }
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            setPan(p => ({
              x:
                p.x +
                (e.key === 'ArrowLeft' ? 30 : e.key === 'ArrowRight' ? -30 : 0),
              y:
                p.y +
                (e.key === 'ArrowUp' ? 30 : e.key === 'ArrowDown' ? -30 : 0),
            }));
          }
        }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
            moved: false,
          };
        }}
        onPointerMove={e => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
          if (d.moved) {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            setPan({ x: d.panX + dx, y: d.panY + dy });
          }
        }}
        onPointerUp={() => {
          setDragging(false);
          setTimeout(() => {
            drag.current = null;
          }, 0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        <svg
          className="cutting-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-label="Desenho do plano de corte"
        >
          <g
            transform={`translate(${origin.x} ${origin.y}) scale(${scale * zoom})`}
          >
            <rect
              width={stockWidth}
              height={stockHeight}
              fill="#fff"
              stroke="#82949e"
              strokeWidth={1 / (scale * zoom)}
            />
            {grid && (
              <g aria-hidden="true">
                {Array.from(
                  { length: Math.ceil(stockWidth / spacing) },
                  (_, i) => (
                    <line
                      key={`v${i}`}
                      x1={i * spacing}
                      x2={i * spacing}
                      y2={stockHeight}
                      stroke="#e6edf0"
                      strokeWidth={1 / (scale * zoom)}
                    />
                  )
                )}
                {Array.from(
                  { length: Math.ceil(stockHeight / spacing) },
                  (_, i) => (
                    <line
                      key={`h${i}`}
                      y1={i * spacing}
                      y2={i * spacing}
                      x2={stockWidth}
                      stroke="#e6edf0"
                      strokeWidth={1 / (scale * zoom)}
                    />
                  )
                )}
              </g>
            )}
            {piecesPlaced.map((piece, i) => {
              const layout = labelLayout(piece),
                p = layout.padding,
                clip = `${prefix}-piece-${i}`;
              return (
                <g
                  key={`${piece.id}-${i}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Selecionar ${pieceName(piece)}, ${(piece.width / 10).toFixed(1)} por ${(piece.height / 10).toFixed(1)} centímetros`}
                  aria-pressed={selected === i}
                  onClick={() => {
                    if (!drag.current?.moved) setSelected(i);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(i);
                    }
                  }}
                  className="selectable-piece"
                >
                  <title>{pieceName(piece)}</title>
                  <defs>
                    <clipPath id={clip} clipPathUnits="userSpaceOnUse">
                      <rect
                        x={piece.x + p}
                        y={piece.y + p}
                        width={Math.max(0, piece.width - 2 * p)}
                        height={Math.max(0, piece.height - 2 * p)}
                      />
                    </clipPath>
                  </defs>
                  <rect
                    x={piece.x}
                    y={piece.y}
                    width={piece.width}
                    height={piece.height}
                    fill={pieceColor(piece)}
                    fillOpacity={
                      selected === null || selected === i ? 0.8 : 0.4
                    }
                    stroke={selected === i ? '#13443d' : '#53666b'}
                    strokeWidth={(selected === i ? 2.5 : 1) / (scale * zoom)}
                  />
                  {labels && (
                    <g pointerEvents="none" clipPath={`url(#${clip})`}>
                      <g transform={layout.textTransform}>
                        {layout.lines.map((line, n) => (
                          <text
                            key={n}
                            x={layout.x}
                            y={layout.startY + n * layout.lineHeight}
                            textAnchor="middle"
                            fontFamily={LABEL_FONT}
                            fontSize={
                              n < layout.nameLines
                                ? layout.size
                                : layout.size * 0.85
                            }
                            fill="#222"
                          >
                            {line}
                          </text>
                        ))}
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="canvas-caption">
        <span>
          {(stockWidth / 10).toFixed(1)} × {(stockHeight / 10).toFixed(1)} cm
        </span>
        <span>Role para ampliar · Arraste para deslocar</span>
      </div>
      {selectedPiece ? (
        <aside
          className="piece-inspector"
          aria-label="Detalhes da peça selecionada"
        >
          <div>
            <span
              className="piece-dot"
              style={{ background: pieceColor(selectedPiece) }}
            />
            <strong>{pieceName(selectedPiece)}</strong>
            <button
              aria-label="Limpar seleção"
              onClick={() => setSelected(null)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <dl>
            <div>
              <dt>Medidas</dt>
              <dd>
                {(selectedPiece.width / 10).toFixed(1)} ×{' '}
                {(selectedPiece.height / 10).toFixed(1)} cm
              </dd>
            </div>
            <div>
              <dt>Posição</dt>
              <dd>
                X {(selectedPiece.x / 10).toFixed(1)} · Y{' '}
                {(selectedPiece.y / 10).toFixed(1)} cm
              </dd>
            </div>
            <div>
              <dt>Rotação</dt>
              <dd>{selectedPiece.rotated ? '90°' : 'Original'}</dd>
            </div>
          </dl>
        </aside>
      ) : (
        <p className="selection-hint">
          Selecione uma peça no desenho para conferir medidas e posição.
        </p>
      )}
      <details className="placed-pieces">
        <summary>Lista de peças posicionadas ({piecesPlaced.length})</summary>
        <div className="placed-list">
          {piecesPlaced.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <span
                className="piece-dot"
                style={{ background: pieceColor(p) }}
              />
              {pieceName(p)}
              <small>
                {(p.width / 10).toFixed(1)} × {(p.height / 10).toFixed(1)} cm
              </small>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
