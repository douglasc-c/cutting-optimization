const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function createOptimizationRunner({ spawnProcess = spawn, resolveBackend }) {
  const jobs = new Map();
  const cancel = (senderId, jobId) => {
    const job = jobs.get(senderId);
    if (!job || job.jobId !== jobId) return false;
    job.canceled = true;
    job.process.kill();
    return true;
  };
  const run = (sender, config, jobId) => {
    if (jobs.has(sender.id))
      return Promise.resolve({
        success: false,
        error: 'Já existe um cálculo em andamento.',
      });
    if (
      !config ||
      !Number.isFinite(config.stock_width) ||
      config.stock_width <= 0 ||
      !Number.isFinite(config.stock_height) ||
      config.stock_height < 0 ||
      !Number.isFinite(config.time_limit) ||
      config.time_limit < 1 ||
      config.time_limit > 600 ||
      !Array.isArray(config.pieces) ||
      !config.pieces.length ||
      config.pieces.some(
        p =>
          !Array.isArray(p) ||
          p.length < 5 ||
          p.slice(0, 3).some(n => !Number.isInteger(n) || n <= 0) ||
          typeof p[3] !== 'boolean' ||
          typeof p[4] !== 'string'
      )
    )
      return Promise.resolve({
        success: false,
        error: 'Configuração de corte inválida.',
      });
    let directory;
    try {
      const backend = resolveBackend();
      directory = fs.mkdtempSync(
        path.join(os.tmpdir(), 'cutting-optimization-')
      );
      const configuration = path.join(directory, 'config.json');
      fs.writeFileSync(configuration, JSON.stringify(config), 'utf8');
      const progress = phase => {
        if (!sender.isDestroyed())
          sender.send('optimization-progress', { jobId, phase });
      };
      progress('Preparando o motor de corte');
      const process = spawnProcess(
        backend.command,
        [
          ...backend.args,
          '--config',
          configuration,
          '--output-dir',
          directory,
          '--json-output',
        ],
        { cwd: backend.cwd, windowsHide: true }
      );
      const job = { process, jobId, canceled: false };
      jobs.set(sender.id, job);
      return new Promise(resolve => {
        let output = '',
          error = '',
          finished = false;
        const cleanup = () => {
          if (jobs.get(sender.id) === job) jobs.delete(sender.id);
          try {
            fs.rmSync(directory, { recursive: true, force: true });
          } catch {}
        };
        const finish = result => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          cleanup();
          resolve(result);
        };
        const timeout = setTimeout(
          () => {
            job.process.kill();
            finish({
              success: false,
              error:
                'O motor de corte excedeu o tempo de resposta. Tente reduzir a quantidade de peças ou executar novamente.',
            });
          },
          Math.max((config.time_limit + 30) * 1000, 45000)
        );
        process.stdout.setEncoding('utf8');
        process.stderr.setEncoding('utf8');
        process.stdout.on('data', data => {
          output += data;
        });
        process.stderr.on('data', data => {
          error += data;
        });
        process.on('spawn', () => progress('Buscando um plano de corte'));
        process.on('error', err =>
          finish({
            success: false,
            error: `Não foi possível iniciar o motor de corte: ${err.message}`,
          })
        );
        process.on('close', code => {
          if (job.canceled) {
            finish({ success: false, canceled: true });
            return;
          }
          if (code !== 0) {
            finish({
              success: false,
              error: (error || output || 'O cálculo foi interrompido.')
                .trim()
                .slice(0, 2000),
            });
            return;
          }
          try {
            const result = JSON.parse(output.trim());
            finish(result);
          } catch {
            finish({
              success: false,
              error: 'O motor de corte retornou uma resposta inválida.',
            });
          }
        });
      });
    } catch (err) {
      if (directory)
        try {
          fs.rmSync(directory, { recursive: true, force: true });
        } catch {}
      return Promise.resolve({ success: false, error: err.message });
    }
  };
  const cancelAll = () => {
    for (const [id, job] of jobs) cancel(id, job.jobId);
  };
  return { run, cancel, cancelAll };
}
module.exports = { createOptimizationRunner };
