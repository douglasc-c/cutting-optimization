export interface PlacedPiece {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  description?: string;
  rotated?: boolean;
}

export const PIECE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
export const LABEL_FONT = 'Arial, sans-serif';
export type MeasureText = (text: string, fontSize: number) => number;
let context: CanvasRenderingContext2D | null | undefined;
export const measureText: MeasureText = (text, size) => {
  if (context === undefined) context = document.createElement('canvas').getContext('2d');
  if (context) {
    context.font = `${size}px ${LABEL_FONT}`;
    return context.measureText(text).width;
  }
  return Array.from(text).length * size; // Conservative fallback; clipping still contains glyphs.
};

export const escapeXml = (value: string) => value.replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[ch] || ch));

export const pieceName = (piece: PlacedPiece) => piece.description?.trim() || piece.id;
export const pieceRotated = (piece: PlacedPiece) => piece.rotated ?? piece.id.endsWith('_rot');
export const pieceColor = (piece: PlacedPiece) => {
  const base = piece.id.match(/^piece_(\d+)/);
  return PIECE_COLORS[Number(base?.[1] || 0) % PIECE_COLORS.length];
};

function wrap(text: string, width: number, size: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    // Split long identifiers as well as words; never discard the full name.
    for (const char of Array.from(word)) {
      if (line && measure(line + char, size) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function labelLayout(piece: PlacedPiece, measure: MeasureText = measureText) {
  const rotated = pieceRotated(piece);
  const width = rotated ? piece.height : piece.width;
  const height = rotated ? piece.width : piece.height;
  const padding = Math.min(Math.min(width, height) * 0.06, 8);
  const availableWidth = Math.max(0.001, width - padding * 2);
  const availableHeight = Math.max(0.001, height - padding * 2);
  const name = pieceName(piece).replace(/\s+/g, ' ');
  const dimension = `${(piece.width / 10).toFixed(1)} × ${(piece.height / 10).toFixed(1)} cm`;
  const initialSize = Math.min(15, Math.min(width, height) * 0.16);
  const layoutAt = (size: number) => {
    const names = wrap(name, availableWidth, size, measure);
    const dimensions = wrap(dimension, availableWidth, size * 0.85, measure);
    const lineHeight = size * 1.3;
    return { lines: [...names, ...dimensions], nameLines: names.length, lineHeight };
  };
  let size = initialSize;
  let data = layoutAt(size);
  for (let i = 0; i < 120; i++) {
    const widest = Math.max(...data.lines.map((line, n) => measure(line, n < data.nameLines ? size : size * 0.85)));
    if (data.lines.length * data.lineHeight <= availableHeight && widest <= availableWidth) break;
    size *= 0.9;
    data = layoutAt(size);
  }
  const textTransform = rotated
    ? `translate(${piece.x + piece.width} ${piece.y}) rotate(90)`
    : `translate(${piece.x} ${piece.y})`;
  return { ...data, size, padding, width, height, textTransform,
    x: width / 2, startY: (height - data.lines.length * data.lineHeight) / 2 + size,
    fullName: pieceName(piece) };
}

export function generateCuttingSvg(stockWidth: number, stockHeight: number, pieces: PlacedPiece[], showLabels = true, measure: MeasureText = measureText) {
  const piecesSvg = pieces.map((piece, index) => {
    const layout = labelLayout(piece, measure);
    const clipId = `piece-clip-${index}`;
    const p = layout.padding;
    const labels = showLabels ? `<g clip-path="url(#${clipId})"><g transform="${layout.textTransform}">${layout.lines.map((line, n) =>
      `<text x="${layout.x}" y="${layout.startY + n * layout.lineHeight}" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${n < layout.nameLines ? layout.size : layout.size * 0.85}" fill="#222">${escapeXml(line)}</text>`
    ).join('')}</g></g>` : '';
    return `<g><title>${escapeXml(pieceName(piece))}</title><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${piece.x+p}" y="${piece.y+p}" width="${Math.max(0,piece.width-2*p)}" height="${Math.max(0,piece.height-2*p)}"/></clipPath></defs><rect x="${piece.x}" y="${piece.y}" width="${piece.width}" height="${piece.height}" fill="${pieceColor(piece)}" fill-opacity="0.8" stroke="#333" stroke-width="0.5"/>${labels}</g>`;
  }).join('');
  // Physical dimensions and viewBox stay exactly 1:1; no out-of-bounds annotations.
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${stockWidth}mm" height="${stockHeight}mm" viewBox="0 0 ${stockWidth} ${stockHeight}"><title>Plano de corte ${(stockWidth/10).toFixed(1)} × ${(stockHeight/10).toFixed(1)} cm</title>${piecesSvg}</svg>`;
}
