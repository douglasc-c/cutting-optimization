const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const {
  createCloudClient,
  validateServiceUrl,
} = require('../public/cloudClient');
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cutting-account-'));
  let time = 10000000,
    mode = 'online',
    revoked = false;
  const calls = [];
  const safeStorage = {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'gnome_libsecret',
    encryptString: s => Buffer.from(s).map(c => c ^ 123),
    decryptString: b =>
      Buffer.from(b)
        .map(c => c ^ 123)
        .toString(),
  };
  const fetchApi = async (url, options) => {
    calls.push({ url, options });
    if (mode === 'offline') throw Error('offline');
    if (url.endsWith('/api/auth/verify-code'))
      return Response.json({ token: 'a'.repeat(64) });
    if (url.endsWith('/api/auth/logout')) {
      revoked = true;
      return Response.json({ success: true });
    }
    if (mode === 'blocked')
      return Response.json({ error: 'Conta bloqueada' }, { status: 403 });
    return Response.json({
      user: { id: '1', email: 'user@example.com', name: '' },
      expiresAt: time + 30 * 86400000,
      allowed: mode !== 'old',
      policy: {
        minimumVersion: '0.2.0',
        latestVersion: '0.2.1',
        updateRequired: mode === 'old',
      },
    });
  };
  const options = {
    url: 'https://accounts.example',
    packaged: true,
    version: () => '0.2.0',
    platform: 'win32',
    directory,
    safeStorage,
    fetchApi,
    now: () => time,
  };
  return {
    directory,
    options,
    calls,
    client: createCloudClient(options),
    setMode: v => (mode = v),
    setTime: v => (time = v),
    revoked: () => revoked,
    clean: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}
test('desktop stores encrypted token, never exposes it to the renderer and persists across restarts', async () => {
  const f = fixture();
  try {
    const state = await f.client.verifyCode('id', '12345678');
    assert.equal(state.allowed, true);
    assert.equal(state.token, undefined);
    const stored = fs.readFileSync(
      path.join(f.directory, 'account-session.enc')
    );
    assert.equal(stored.includes('a'.repeat(64)), false);
    assert.equal(
      (await createCloudClient(f.options).getState()).authenticated,
      true
    );
    assert.equal(
      f.calls.at(-1).options.headers.Authorization,
      `Bearer ${'a'.repeat(64)}`
    );
    assert.equal(f.calls.at(-1).options.redirect, 'error');
  } finally {
    f.clean();
  }
});
test('offline grace expires after seven days and clock rollback is denied', async () => {
  const f = fixture();
  try {
    await f.client.verifyCode('id', '12345678');
    f.setMode('offline');
    assert.equal((await f.client.getState()).offline, true);
    f.setTime(10000000 - 1);
    assert.equal((await f.client.getState()).allowed, false);
    f.setTime(10000000 + 7 * 86400000);
    assert.equal((await f.client.getState()).allowed, false);
  } finally {
    f.clean();
  }
});
test('blocked account and old version cannot use cached authorization', async () => {
  const f = fixture();
  try {
    await f.client.verifyCode('id', '12345678');
    f.setMode('old');
    await assert.rejects(() => f.client.assertAllowed(), /Atualize/);
    f.setMode('offline');
    assert.equal((await f.client.getState()).allowed, false);
    f.setMode('blocked');
    assert.equal((await f.client.getState()).authenticated, false);
    assert.equal(
      fs.existsSync(path.join(f.directory, 'account-session.enc')),
      false
    );
  } finally {
    f.clean();
  }
});
test('logout clears local credentials even offline and missing encryption never writes plaintext', async () => {
  const f = fixture();
  try {
    await f.client.verifyCode('id', '12345678');
    f.setMode('offline');
    await f.client.logout();
    assert.equal((await f.client.getState()).authenticated, false);
    assert.equal(
      fs.existsSync(path.join(f.directory, 'account-session.enc')),
      false
    );
    f.setMode('online');
    const client = createCloudClient({
      ...f.options,
      safeStorage: { isEncryptionAvailable: () => false },
    });
    await client.verifyCode('id', '12345678');
    assert.equal(
      fs.existsSync(path.join(f.directory, 'account-session.enc')),
      false
    );
  } finally {
    f.clean();
  }
});
test('packaged app requires configured HTTPS account service; local development can run without it', async () => {
  const f = fixture();
  try {
    const app = createCloudClient({ ...f.options, url: '' });
    assert.equal((await app.getState()).allowed, false);
    await assert.rejects(() => app.assertAllowed(), /configurado/);
    const dev = createCloudClient({ ...f.options, url: '', packaged: false });
    assert.equal((await dev.getState()).allowed, true);
    assert.throws(
      () => validateServiceUrl('http://localhost:8787', true),
      /HTTPS/
    );
    assert.equal(
      validateServiceUrl('http://localhost:8787', false),
      'http://localhost:8787'
    );
    assert.throws(() =>
      validateServiceUrl('https://user:password@accounts.example', true)
    );
  } finally {
    f.clean();
  }
});

test('cached access is bound to the service origin and app version', async () => {
  const f = fixture();
  try {
    await f.client.verifyCode('id', '12345678');
    f.setMode('offline');
    const changed = createCloudClient({
      ...f.options,
      url: 'https://other.example',
    });
    assert.equal((await changed.getState()).authenticated, false);
    const old = createCloudClient({ ...f.options, version: () => '0.1.0' });
    assert.equal((await old.getState()).allowed, false);
  } finally {
    f.clean();
  }
});
