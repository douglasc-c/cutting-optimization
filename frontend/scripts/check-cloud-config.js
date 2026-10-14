const { validateServiceUrl } = require('../public/cloudClient');
module.exports = async () => {
  const config = require('../public/cloud-service.json');
  if (!validateServiceUrl(config.accountUrl, true))
    throw new Error(
      'Execute npm run configure:cloud --workspace=frontend -- https://SEU-WORKER.workers.dev antes de gerar o instalador.'
    );
};
