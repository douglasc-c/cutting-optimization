const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const appName = 'Cutting Optimization';

function prepareMacRuntime(
  electronExecutable,
  project,
  { platform = process.platform, execute = execFileSync } = {}
) {
  if (platform !== 'darwin') return electronExecutable;
  const original = path.dirname(path.dirname(path.dirname(electronExecutable)));
  if (!original.endsWith('.app'))
    throw new Error('Bundle de desenvolvimento do Electron não encontrado.');
  const sourceInfo = path.join(original, 'Contents', 'Info.plist');
  const icon = path.join(project, 'public', 'icon.icns');
  const digest = crypto
    .createHash('sha256')
    .update('cutting-runtime-v1')
    .update(original)
    .update(fs.readFileSync(sourceInfo))
    .update(fs.readFileSync(icon))
    .digest('hex');
  const cache = path.join(project, 'node_modules', '.cache', 'cutting-runtime');
  const bundle = path.join(cache, `${appName}.app`);
  const executable = path.join(
    bundle,
    'Contents',
    'MacOS',
    path.basename(electronExecutable)
  );
  const stamp = path.join(cache, 'stamp.json');
  try {
    if (
      JSON.parse(fs.readFileSync(stamp, 'utf8')).digest === digest &&
      fs.existsSync(executable)
    )
      return executable;
  } catch {}
  fs.mkdirSync(cache, { recursive: true });
  // Only the private cache is replaced. The installed Electron dependency stays intact.
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.cpSync(original, bundle, {
    recursive: true,
    verbatimSymlinks: true,
    mode: fs.constants.COPYFILE_FICLONE,
  });
  const set = (plist, key, value) => {
    try {
      execute(
        '/usr/libexec/PlistBuddy',
        ['-c', `Set :${key} ${value}`, plist],
        { stdio: 'pipe' }
      );
    } catch {
      execute(
        '/usr/libexec/PlistBuddy',
        ['-c', `Add :${key} string ${value}`, plist],
        { stdio: 'pipe' }
      );
    }
  };
  const info = path.join(bundle, 'Contents', 'Info.plist');
  set(info, 'CFBundleName', appName);
  set(info, 'CFBundleDisplayName', appName);
  set(info, 'CFBundleIdentifier', 'com.cuttingoptimization.development');
  set(info, 'CFBundleIconFile', 'cutting-optimization.icns');
  const resources = path.join(bundle, 'Contents', 'Resources');
  fs.copyFileSync(icon, path.join(resources, 'cutting-optimization.icns'));
  for (const entry of fs.readdirSync(resources, { withFileTypes: true })) {
    const localized = path.join(resources, entry.name, 'InfoPlist.strings');
    if (
      entry.isDirectory() &&
      entry.name.endsWith('.lproj') &&
      fs.existsSync(localized)
    ) {
      set(localized, 'CFBundleName', appName);
      set(localized, 'CFBundleDisplayName', appName);
    }
  }
  // Metadata/icon changes invalidate the original signature. Sign only this local copy.
  execute(
    '/usr/bin/codesign',
    [
      '--force',
      '--deep',
      '--sign',
      '-',
      '--preserve-metadata=entitlements',
      bundle,
    ],
    { stdio: 'pipe' }
  );
  execute('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle], {
    stdio: 'pipe',
  });
  fs.writeFileSync(stamp, JSON.stringify({ digest }), 'utf8');
  return executable;
}
module.exports = { prepareMacRuntime };
