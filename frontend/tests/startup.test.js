const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const {
  freePort,
  checkServer,
  waitForServer,
} = require('../scripts/start-electron');
const listen = server =>
  new Promise(resolve =>
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${server.address().port}`)
    )
  );
const close = server => new Promise(resolve => server.close(resolve));
test('server readiness rejects another app and recognizes this project', async () => {
  const other = http.createServer((_req, res) =>
    res.end('<title>EnvironTools</title>')
  );
  const own = http.createServer((_req, res) =>
    res.end('<meta name="application-name" content="cutting-optimization" />')
  );
  try {
    assert.equal(await checkServer(await listen(other)), false);
    const url = await listen(own);
    assert.equal(await checkServer(url), true);
    await waitForServer(url, () => true, 1000);
  } finally {
    await close(other);
    await close(own);
  }
});
test('an unrelated server is never considered ready', async () => {
  const other = http.createServer((_req, res) =>
    res.end('Another application')
  );
  try {
    const url = await listen(other);
    await assert.rejects(
      waitForServer(url, () => true, 1),
      /não ficou pronto/
    );
  } finally {
    await close(other);
  }
});
test('launcher reserves a free port and fails if its own process exits', async () => {
  const port = await freePort();
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await close(server);
  await assert.rejects(
    waitForServer(`http://127.0.0.1:${port}`, () => false, 100),
    /encerrou/
  );
});
