const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createOptimizationRunner } = require('../public/optimizationRunner');
const cwd = path.resolve(__dirname, '../../backend');
const resolveBackend = () => ({
  command: process.platform === 'win32' ? 'python' : 'python3',
  args: [path.join(cwd, 'main.py')],
  cwd,
});
const config = {
  stock_width: 100,
  stock_height: 0,
  time_limit: 1,
  pieces: [[20, 80, 1, true, 'Porta']],
  optimization_mode: 'fast',
};
test(
  'real Python subprocess returns a valid cut result through the desktop runner',
  { timeout: 15000 },
  async () => {
    const runner = createOptimizationRunner({ resolveBackend });
    const result = await runner.run(
      { id: 1, isDestroyed: () => false, send: () => {} },
      config,
      'real'
    );
    assert.equal(result.success, true, result.error);
    assert.equal(result.result.stock_dimensions.height, 20);
    assert.equal(result.result.pieces_placed.length, 1);
  }
);
test(
  'real Python subprocess is interrupted by cancellation',
  { timeout: 15000 },
  async () => {
    const runner = createOptimizationRunner({ resolveBackend });
    const sender = {
      id: 2,
      isDestroyed: () => false,
      send: (_channel, data) => {
        if (data.phase === 'Buscando um plano de corte')
          setTimeout(() => runner.cancel(2, 'cancel-real'), 50);
      },
    };
    const result = await runner.run(
      sender,
      { ...config, time_limit: 60, pieces: [[20, 80, 500, true, 'Porta']] },
      'cancel-real'
    );
    assert.equal(result.canceled, true);
  }
);
