const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { prepareMacRuntime } = require('./macos-runtime');
const project = path.resolve(__dirname, '..');
const marker = '<meta name="application-name" content="cutting-optimization"';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(err => (err ? reject(err) : resolve(port)));
    });
  });
}
function checkServer(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      let html = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        html += chunk;
        if (html.length > 200000) request.destroy();
      });
      response.on('end', () =>
        resolve(response.statusCode === 200 && html.includes(marker))
      );
      response.on('error', () => resolve(false));
    });
    request.setTimeout(1000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}
async function waitForServer(url, alive, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!alive())
      throw new Error(
        'O servidor do Cutting Optimization encerrou antes de iniciar.'
      );
    if (await checkServer(url)) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(
    'O servidor do Cutting Optimization não ficou pronto no tempo esperado.'
  );
}
function runNodeScript(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: project,
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', code =>
      code === 0
        ? resolve()
        : reject(
            new Error('Não foi possível gerar o build do Cutting Optimization.')
          )
    );
    const stop = () => child.kill();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('close', () => {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
    });
  });
}
async function main(dev = process.argv.includes('--dev')) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CUTTING_DEV_SERVER_URL;
  let server,
    electron,
    serverAlive = false;
  const stop = () => {
    electron?.kill();
    server?.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    if (dev) {
      const port = await freePort();
      const url = `http://127.0.0.1:${port}`;
      console.log(
        `Iniciando o servidor próprio do Cutting Optimization: ${url}`
      );
      server = spawn(
        process.execPath,
        [require.resolve('react-scripts/scripts/start')],
        {
          cwd: project,
          env: {
            ...env,
            PORT: String(port),
            HOST: '127.0.0.1',
            BROWSER: 'none',
            CI: 'true',
          },
          stdio: 'inherit',
        }
      );
      serverAlive = true;
      let serverError;
      server.on('error', err => {
        serverError = err;
        serverAlive = false;
      });
      server.on('exit', () => {
        serverAlive = false;
        electron?.kill();
      });
      await waitForServer(url, () => serverAlive);
      if (serverError) throw serverError;
      env.CUTTING_DEV_SERVER_URL = url;
    } else {
      console.log('Gerando a interface local do Cutting Optimization…');
      await runNodeScript(require.resolve('react-scripts/scripts/build'), env);
    }
    const executable = prepareMacRuntime(require('electron'), project);
    electron = spawn(executable, [project], {
      cwd: project,
      env,
      stdio: 'inherit',
    });
    await new Promise((resolve, reject) => {
      electron.once('error', reject);
      electron.once('close', code => {
        process.exitCode = code || 0;
        resolve();
      });
    });
  } finally {
    stop();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}
if (require.main === module)
  main().catch(err => {
    console.error(`Falha ao iniciar: ${err.message}`);
    process.exitCode = 1;
  });
module.exports = { freePort, checkServer, waitForServer };
