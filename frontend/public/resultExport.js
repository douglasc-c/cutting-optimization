function resultsToCsv(results) {
  const csv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const result = results.result;
  const rows = [['ID', 'Descrição', 'X (mm)', 'Y (mm)', 'Largura (mm)', 'Altura (mm)', 'Área (mm²)', 'Rotacionada']];
  for (const p of result.pieces_placed) rows.push([p.id, p.description || p.id, p.x, p.y, p.width, p.height, p.area, p.rotated ?? p.id.endsWith('_rot')]);
  return '\uFEFF' + rows.map(row => row.map(csv).join(',')).join('\r\n') + '\r\n';
}
module.exports = { resultsToCsv };
