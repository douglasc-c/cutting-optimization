const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
async function fixture() {
  const handlers = new Map();
  const events = [];
  const app = new EventEmitter();
  Object.assign(app, {
    isPackaged: true,
    name: 'Cutting Optimization',
    whenReady: () => Promise.resolve(),
    getPath: () => '/tmp/test-workspace',
    addRecentDocument: () => {},
    quit: () => events.push('quit'),
  });
  let window;
  class FakeWindow extends EventEmitter {
    constructor() {
      super();
      window = this;
      this.webContents = new EventEmitter();
      this.webContents.send = (...args) => events.push(args);
    }
    isDestroyed() {
      return false;
    }
    getNormalBounds() {
      return { width: 1200, height: 800 };
    }
    isMaximized() {
      return false;
    }
    loadFile() {}
    show() {}
    setTitle() {}
    setDocumentEdited() {}
    setProgressBar() {}
    close() {
      const event = {
        preventDefault: () => {
          event.prevented = true;
        },
      };
      this.emit('close', event);
      if (!event.prevented) this.emit('closed');
      return event;
    }
    static getAllWindows() {
      return [window];
    }
  }
  const electron = {
    app,
    BrowserWindow: FakeWindow,
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    dialog: {
      showSaveDialog: async () => ({ canceled: true }),
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
    },
    Menu: { buildFromTemplate: items => items, setApplicationMenu: () => {} },
    shell: { showItemInFolder: () => {} },
    screen: {
      getPrimaryDisplay: () => ({ workArea: { width: 1200, height: 800 } }),
      getAllDisplays: () => [],
    },
  };
  const store = {
    read: () => null,
    write: async () => {},
    writeSync: () => {},
  };
  const runner = {
    cancelAll: () => events.push('cancelAll'),
    run: () => {},
    cancel: () => true,
  };
  const directory = path.resolve(__dirname, '../public');
  const requireMock = name =>
    name === 'electron'
      ? electron
      : name === './workspaceStore'
        ? { createWorkspaceStore: () => store }
        : name === './optimizationRunner'
          ? { createOptimizationRunner: () => runner }
          : name === './resultExport'
            ? require('../public/resultExport')
            : require(name);
  vm.runInNewContext(
    fs.readFileSync(path.join(directory, 'electron.js'), 'utf8'),
    { require: requireMock, __dirname: directory, process }
  );
  await new Promise(resolve => setImmediate(resolve));
  return { handlers, events, app, window };
}
test('dirty window cannot close before a renderer decision', async () => {
  const { handlers, events, window } = await fixture();
  handlers.get('set-document-state')(
    {},
    { dirty: true, busy: false, name: 'Projeto' }
  );
  assert.equal(window.close().prevented, true);
  assert.deepEqual(events.at(-1), ['menu-action', 'close']);
  assert.equal(events.includes('cancelAll'), false);
  handlers.get('close-window')();
  assert.equal(events.includes('cancelAll'), true);
});
test('quit waits for a user decision without prematurely canceling the computation', async () => {
  const { handlers, events, app } = await fixture();
  handlers.get('set-document-state')(
    {},
    { dirty: false, busy: true, name: 'Projeto' }
  );
  let prevented = false;
  app.emit('before-quit', {
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(events.includes('cancelAll'), false);
  handlers.get('close-window')();
  assert.equal(events.includes('quit'), true);
});
test('canceled native file dialogs are normal outcomes', async () => {
  const { handlers } = await fixture();
  assert.equal((await handlers.get('save-config')({}, {})).canceled, true);
  assert.equal((await handlers.get('load-config')({})).canceled, true);
});
