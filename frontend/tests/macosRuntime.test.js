const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareMacRuntime } = require('../scripts/macos-runtime');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cutting-mac-runtime-'));
  const project = path.join(root, 'project');
  const bundle = path.join(root, 'Electron.app');
  const executable = path.join(bundle, 'Contents/MacOS/Electron');
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(executable, 'original runtime');
  const info = path.join(bundle, 'Contents/Info.plist');
  fs.writeFileSync(info, 'original metadata');
  fs.mkdirSync(path.join(bundle, 'Contents/Resources/en.lproj'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(bundle, 'Contents/Resources/en.lproj/InfoPlist.strings'),
    'localized Electron name'
  );
  fs.mkdirSync(
    path.join(bundle, 'Contents/Frameworks/Example.framework/Versions/A'),
    { recursive: true }
  );
  fs.symlinkSync(
    'A',
    path.join(bundle, 'Contents/Frameworks/Example.framework/Versions/Current')
  );
  fs.writeFileSync(
    path.join(bundle, 'Contents/Resources/electron.icns'),
    'stock Electron icon'
  );
  fs.mkdirSync(path.join(project, 'public'), { recursive: true });
  fs.writeFileSync(path.join(project, 'public/icon.icns'), 'approved icon');
  const commands = [];
  const execute = (command, args) => commands.push({ command, args });
  return { root, project, bundle, executable, info, commands, execute };
}
test('macOS runtime has its own named bundle, icon and relative framework links', () => {
  const f = fixture();
  try {
    const result = prepareMacRuntime(f.executable, f.project, {
      platform: 'darwin',
      execute: f.execute,
    });
    const copy = path.dirname(path.dirname(path.dirname(result)));
    assert.equal(path.basename(copy), 'Cutting Optimization.app');
    assert.equal(fs.readFileSync(f.info, 'utf8'), 'original metadata');
    assert.equal(
      fs.readFileSync(
        path.join(copy, 'Contents/Resources/cutting-optimization.icns'),
        'utf8'
      ),
      'approved icon'
    );
    assert.equal(
      fs.readlinkSync(
        path.join(
          copy,
          'Contents/Frameworks/Example.framework/Versions/Current'
        )
      ),
      'A'
    );
    assert.ok(
      f.commands.some(
        c => c.args[1] === 'Set :CFBundleDisplayName Cutting Optimization'
      )
    );
    assert.ok(
      f.commands.some(
        c =>
          c.args[1] === 'Set :CFBundleName Cutting Optimization' &&
          c.args[2].endsWith('InfoPlist.strings')
      )
    );
    assert.deepEqual(
      f.commands
        .filter(c => c.command === '/usr/bin/codesign')
        .map(c => c.args[0]),
      ['--force', '--verify']
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
test('cached runtime is reused and regenerated when the approved icon changes', () => {
  const f = fixture();
  try {
    const options = { platform: 'darwin', execute: f.execute };
    const first = prepareMacRuntime(f.executable, f.project, options);
    const count = f.commands.length;
    assert.equal(prepareMacRuntime(f.executable, f.project, options), first);
    assert.equal(f.commands.length, count);
    fs.writeFileSync(path.join(f.project, 'public/icon.icns'), 'updated icon');
    prepareMacRuntime(f.executable, f.project, options);
    assert.ok(f.commands.length > count);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
test('failed local signing does not mark an unusable runtime as ready', () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        prepareMacRuntime(f.executable, f.project, {
          platform: 'darwin',
          execute: command => {
            if (command === '/usr/bin/codesign')
              throw new Error('signing failed');
          },
        }),
      /signing failed/
    );
    assert.equal(
      fs.existsSync(
        path.join(f.project, 'node_modules/.cache/cutting-runtime/stamp.json')
      ),
      false
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
test('other platforms keep the installed Electron runtime', () => {
  assert.equal(
    prepareMacRuntime('/runtime/electron', '/project', { platform: 'linux' }),
    '/runtime/electron'
  );
});

test('startup and shutdown fallback icon is branded before launching the runtime', () => {
  const f = fixture();
  try {
    const executable = prepareMacRuntime(f.executable, f.project, {
      platform: 'darwin',
      execute: f.execute,
    });
    const copiedBundle = path.dirname(path.dirname(path.dirname(executable)));
    assert.equal(
      fs.readFileSync(
        path.join(copiedBundle, 'Contents/Resources/electron.icns'),
        'utf8'
      ),
      'approved icon'
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.bundle, 'Contents/Resources/electron.icns'),
        'utf8'
      ),
      'stock Electron icon'
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
