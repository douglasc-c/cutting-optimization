const test = require('node:test'),
  assert = require('node:assert/strict'),
  { EventEmitter } = require('node:events');
const { createUpdateManager } = require('../public/updateManager');
test('updates require explicit download and refuse restart while dirty or computing', async () => {
  const updater = new EventEmitter();
  let downloaded = 0,
    installed = 0,
    doc = { dirty: true, busy: false };
  updater.checkForUpdates = async () =>
    updater.emit('update-available', { version: '0.2.1' });
  updater.downloadUpdate = async () => {
    downloaded++;
    updater.emit('update-downloaded', { version: '0.2.1' });
  };
  updater.quitAndInstall = () => installed++;
  const manager = createUpdateManager({
    updater,
    enabled: true,
    documentState: () => doc,
  });
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.autoDownload, false);
  await manager.check();
  assert.equal(manager.getState().phase, 'available');
  assert.equal(downloaded, 0);
  await manager.download();
  assert.equal(manager.getState().phase, 'ready');
  assert.throws(() => manager.install(), /salve/);
  doc = { dirty: false, busy: true };
  assert.throws(() => manager.install(), /Conclua/);
  doc = { dirty: false, busy: false };
  manager.install();
  assert.equal(installed, 1);
});
test('disabled updater does not call runtime and download failure allows retry', async () => {
  const disabled = createUpdateManager({
    enabled: false,
    updater: null,
    documentState: () => ({}),
  });
  assert.equal((await disabled.check()).phase, 'disabled');
  const updater = new EventEmitter();
  updater.checkForUpdates = async () =>
    updater.emit('update-available', { version: '0.2.1' });
  updater.downloadUpdate = async () => {
    throw Error('network');
  };
  const manager = createUpdateManager({
    enabled: true,
    updater,
    documentState: () => ({}),
  });
  await manager.check();
  await manager.download();
  assert.equal(manager.getState().phase, 'error');
  await manager.check();
  assert.equal(manager.getState().phase, 'available');
});
