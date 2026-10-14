const fs = require('node:fs');
const path = require('node:path');
const { validateServiceUrl } = require('../public/cloudClient');
const accountUrl = validateServiceUrl(
  process.argv[2] || process.env.CUTTING_ACCOUNT_URL,
  true
);
if (!accountUrl) throw new Error('Informe a URL HTTPS do Worker de contas.');
fs.writeFileSync(
  path.join(__dirname, '../public/cloud-service.json'),
  JSON.stringify({ accountUrl }, null, 2) + '\n'
);
console.log(
  'Serviço de contas configurado. Gere um novo instalador para aplicar o endereço.'
);
