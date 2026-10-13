const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const { createOptimizationRunner } = require('../public/optimizationRunner');
const config = {
  stock_width: 100,
  stock_height: 0,
  time_limit: 1,
  pieces: [[20, 80, 1, true, 'Porta']],
  optimization_mode: 'fast',
};
function fixture() {
  const children = [];
  const sender = { id: 12, isDestroyed: () => false, send: () => {} };
  const runner = createOptimizationRunner({
    resolveBackend: () => ({ command: 'python', args: [], cwd: '.' }),
    spawnProcess: (_command, args) => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.directory = path.dirname(args[args.indexOf('--config') + 1]);
      child.kill = () => {
        queueMicrotask(() => child.emit('close', null));
        return true;
      };
      children.push(child);
      return child;
    },
  });
  return { runner, children, sender };
}
test('cancel kills only the matching sender/job and removes its temporary files', async () => {
  const { runner, children, sender } = fixture();
  const result = runner.run(sender, config, 'job-1');
  assert.equal(runner.cancel(sender.id, 'other-job'), false);
  assert.equal(runner.cancel(99, 'job-1'), false);
  assert.equal(runner.cancel(sender.id, 'job-1'), true);
  assert.deepEqual(await result, { success: false, canceled: true });
  assert.equal(fs.existsSync(children[0].directory), false);
});
test('rejects a second run and can start a new one after completion', async () => {
  const { runner, children, sender } = fixture();
  const first = runner.run(sender, config, 'one');
  assert.equal((await runner.run(sender, config, 'two')).success, false);
  children[0].stdout.write(
    JSON.stringify({ success: true, result: { pieces_placed: [] } })
  );
  children[0].emit('close', 0);
  assert.equal((await first).success, true);
  const next = runner.run(sender, config, 'two');
  runner.cancel(sender.id, 'two');
  assert.equal((await next).canceled, true);
});
test('startup failure returns an error and cleans the job', async () => {
  const { runner, children, sender } = fixture();
  const first = runner.run(sender, config, 'one');
  children[0].emit('error', new Error('python unavailable'));
  assert.match((await first).error, /python unavailable/);
  assert.equal(fs.existsSync(children[0].directory), false);
});
