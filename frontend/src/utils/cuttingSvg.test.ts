import { generateCuttingSvg, labelLayout, PlacedPiece } from './cuttingSvg';
const measure = (text: string, size: number) => Array.from(text).length * size * 0.7;
const piece: PlacedPiece = { id: 'piece_0_0', x: 37, y: 19, width: 20, height: 80, area: 1600, description: 'Porta & lateral <A> "especial"' };

test.each([
  [20,80,false], [80,20,true], [5,5,false], [1,100,false], [100,1,true], [20,80,true]
])('fits complete labels in %s x %s rotated=%s', (w,h,rotated) => {
  const p = {...piece, width: w as number, height: h as number, rotated: rotated as boolean};
  const l = labelLayout(p,measure);
  expect(l.lines.length*l.lineHeight).toBeLessThanOrEqual(l.height-2*l.padding);
  l.lines.forEach((line,n) => expect(measure(line,n<l.nameLines ? l.size : l.size*0.85)).toBeLessThanOrEqual(l.width-2*l.padding));
  expect(l.lines.slice(0,l.nameLines).join('').replace(/\s/g,'')).toBe(piece.description!.replace(/\s/g,''));
});

test('SVG is valid XML, retains scale and protects every piece', () => {
  const svg = generateCuttingSvg(100,120,[piece,{...piece,id:'piece_1_0_rot',rotated:true}],true,measure);
  const xml = new DOMParser().parseFromString(svg,'image/svg+xml');
  expect(xml.querySelector('parsererror')).toBeNull();
  expect(xml.documentElement.getAttribute('width')).toBe('100mm');
  expect(xml.documentElement.getAttribute('height')).toBe('120mm');
  expect(xml.documentElement.getAttribute('viewBox')).toBe('0 0 100 120');
  expect(xml.querySelectorAll('clipPath')).toHaveLength(2);
  expect(new Set(Array.from(xml.querySelectorAll('clipPath')).map(e=>e.id)).size).toBe(2);
  expect(xml.querySelector('g > title')?.textContent).toBe(piece.description);
  expect(svg).toContain('rotate(90)');
});

test.each([
  [80, 20, false], [80, 20, true],
  [20, 80, false], [20, 80, true],
  [20, 20, false], [20, 20, true],
])('aligns text with the longest placed side in %s x %s rotated=%s', (width, height, rotated) => {
  const p = {...piece, width, height, rotated};
  const layout = labelLayout(p, measure);
  expect(layout.textTransform.includes('rotate(90)')).toBe(height >= width);
  expect(layout.width).toBe(Math.max(width, height));
  expect(layout.height).toBe(Math.min(width, height));
  const xml = new DOMParser().parseFromString(generateCuttingSvg(100, 120, [p], true, measure), 'image/svg+xml');
  expect(xml.querySelector('g[transform]')?.getAttribute('transform')).toBe(layout.textTransform);
});

test('legacy rotation suffix does not override the placed dimensions', () => {
  expect(labelLayout({...piece, id:'piece_0_rot', width:80, height:20}, measure).textTransform).not.toContain('rotate');
  expect(labelLayout({...piece, rotated:false}, measure).textTransform).toContain('rotate(90)');
});
