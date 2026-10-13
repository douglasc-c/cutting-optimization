import {
  fromConfig,
  newProject,
  toConfig,
  validate,
  validRecovery,
} from './workspace';
test('round trips cm UI to mm files and loads legacy tuples', () => {
  const p = newProject();
  p.width = '123.4';
  p.pieces[0].width = '12.3';
  const cfg = toConfig(p);
  expect(cfg.stock_width).toBe(1234);
  expect(cfg.pieces[0][0]).toBe(123);
  expect(fromConfig(cfg).width).toBe('123.4');
  const legacy = fromConfig({
    stock_width: 1000,
    pieces: [[200, 300, 2]],
    allow_rotation: false,
  });
  expect(legacy.pieces[0].rotation).toBe(false);
  expect(legacy.height).toBe('');
});
test('identifies fractional quantities and pieces wider than the material', () => {
  const p = newProject();
  p.pieces[0].quantity = '1.5';
  p.pieces[0].width = '200';
  p.pieces[0].height = '200';
  expect(validate(p)[`${p.pieces[0].id}.quantity`]).toBeDefined();
  expect(Object.keys(validate(p))).toHaveLength(2);
});
test('rejects malformed file and recovery schemas', () => {
  expect(() => fromConfig({ stock_width: 10, pieces: ['invalid'] })).toThrow();
  expect(validRecovery({ version: 1, project: { pieces: [] } })).toBe(false);
});
