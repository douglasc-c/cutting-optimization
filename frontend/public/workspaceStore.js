const fs = require('node:fs');
const path = require('node:path');

function createWorkspaceStore(directory) {
  let writes = Promise.resolve();
  const read = name => {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(directory, `${name}.json`), 'utf8')
      );
    } catch {
      return null;
    }
  };
  const write = (name, data) => {
    const operation = writes
      .catch(() => {})
      .then(async () => {
        await fs.promises.mkdir(directory, { recursive: true });
        const target = path.join(directory, `${name}.json`);
        const temporary = `${target}.tmp`;
        await fs.promises.writeFile(temporary, JSON.stringify(data), 'utf8');
        await fs.promises.rename(temporary, target);
      });
    writes = operation;
    return operation;
  };
  const writeSync = (name, data) => {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, `${name}.json`),
      JSON.stringify(data),
      'utf8'
    );
  };
  return { read, write, writeSync };
}
module.exports = { createWorkspaceStore };
