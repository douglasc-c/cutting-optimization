const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWorkspaceStore } = require('../public/workspaceStore');
test('serial recovery writes preserve the newest snapshot and survive restart', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
  try {
    const store = createWorkspaceStore(directory);
    await Promise.all([
      store.write('workspace', { version: 1, name: 'first' }),
      store.write('workspace', { version: 1, name: 'last' }),
    ]);
    assert.equal(
      createWorkspaceStore(directory).read('workspace').name,
      'last'
    );
    assert.equal(
      fs.existsSync(path.join(directory, 'workspace.json.tmp')),
      false
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('missing or corrupt recovery can be read safely', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
  try {
    const store = createWorkspaceStore(directory);
    assert.equal(store.read('workspace'), null);
    fs.writeFileSync(path.join(directory, 'workspace.json'), '{broken');
    assert.equal(store.read('workspace'), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
