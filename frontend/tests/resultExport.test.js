const test = require('node:test');
const assert = require('node:assert/strict');
const {resultsToCsv} = require('../public/resultExport');

test('CSV contains quoted descriptions, units and actual tabular data', () => {
  const csv=resultsToCsv({result:{pieces_placed:[{id:'piece_0_0_rot',description:'Porta, "A"\nlateral',x:0,y:10,width:20,height:30,area:600,rotated:true}]}});
  assert.ok(csv.startsWith('\uFEFF"ID","Descrição"'));
  assert.ok(csv.includes('"Porta, ""A""\nlateral"'));
  assert.ok(csv.includes('"Largura (mm)"'));
  assert.ok(csv.endsWith('"600","true"\r\n'));
});
