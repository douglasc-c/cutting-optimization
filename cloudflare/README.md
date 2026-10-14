# Cutting: contas e versões no Cloudflare

Esta entrega cria dois microserviços em JavaScript com compatibilidade Node.js, implantados como Workers independentes. O backend Python continua executando o motor de corte localmente, sem alterações nas regras de otimização.

- **cutting-accounts**: portal web, criação de conta por confirmação de e-mail, sessões, dispositivos e autorização. Possui o banco D1 `cutting-accounts`.
- **cutting-versions**: versão mais recente, versão mínima suportada e endereço dos instaladores. Contas consulta versões por um Service Binding interno, sem tokens de infraestrutura no aplicativo.
- **Electron**: consulta a conta no processo principal antes de cada otimização. Login não impede salvar ou exportar projetos. Atualizações usam `electron-updater` e GitHub Releases.

A interface web criada aqui é um portal de contas e downloads. Não executa o otimizador no navegador. Não há painel administrativo nesta entrega: o bloqueio de usuários é feito pelo administrador no D1, e a política de versões fica na configuração do serviço de versões.

## 1. Instalação e testes locais

Requer Node.js 22 atualizado ou superior. A partir da raiz do repositório:

```bash
npm ci
cd cloudflare
npm ci
npm test
npm run check
npm run db:local
```

Os testes usam SQLite real para as consultas de contas e um serviço de versões integrado. O comando `check` empacota os dois Workers sem publicá-los. O UUID zerado em `accounts/wrangler.jsonc` é somente um marcador para desenvolvimento local: substitua-o antes de publicar.

Para testar o envio real de códigos, crie `cloudflare/accounts/.dev.vars`, que é ignorado pelo Git:

```dotenv
AUTH_SECRET=UMA_CHAVE_ALEATORIA_DE_PELO_MENOS_32_CARACTERES
RESEND_API_KEY=SUA_CHAVE_RESEND
EMAIL_FROM=Cutting Optimization <acesso@seu-dominio.com>
```

O remetente precisa ter domínio verificado no Resend. Não há código de acesso fixo, retorno de código pela API nem modo que ignore autenticação em produção. Os testes automatizados simulam somente a entrega do e-mail.

```bash
npm run dev
```

O Wrangler inicia os dois serviços e conecta o Service Binding. Abra o endereço do primeiro Worker exibido no terminal. Em outro terminal, na raiz do projeto, use o endereço local do Worker de contas:

```bash
CUTTING_ACCOUNT_URL=http://localhost:8787 make start
```

Sem essa variável e com `accountUrl` vazio, `make start` continua funcionando para desenvolvimento local sem exigir conta. Aplicativos empacotados sempre exigem o serviço configurado. O endereço HTTP local é permitido apenas no desenvolvimento.

## 2. Criar o banco na sua conta Cloudflare

Dentro de `cloudflare`:

```bash
npx wrangler login
npx wrangler d1 create cutting-accounts
```

Copie o `database_id` retornado para `accounts/wrangler.jsonc`, substituindo o UUID zerado. O nome e o binding `DB` devem permanecer iguais. Use uma conta e um banco de testes primeiro; para separar homologação e produção, duplique as configurações com nomes de Workers e bancos distintos, ajustando também o Service Binding e os comandos `--config`.

## 3. Configurar e publicar os serviços

Em `accounts/wrangler.jsonc`, altere `EMAIL_FROM` para um remetente do seu domínio verificado no Resend. Cadastre os segredos sem colocá-los no repositório:

```bash
openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET -c accounts/wrangler.jsonc
npx wrangler secret put RESEND_API_KEY -c accounts/wrangler.jsonc
```

Use uma chave estável para `AUTH_SECRET`; sua troca invalida os códigos de acesso ainda pendentes. Os tokens de sessão são aleatórios e armazenados como hashes no banco, sem depender dessa chave.

Revise a política em `versions/wrangler.jsonc`. `MINIMUM_VERSION` deve ser menor ou igual a `LATEST_VERSION`. Os valores iniciais são `0.2.0`, correspondendo à primeira versão do aplicativo com contas. `RELEASE_URL` aponta para o GitHub Releases público; se o repositório de distribuição for privado, configure um feed apropriado antes de distribuir. Nunca incorpore um token do GitHub no Electron.

```bash
npm run db:remote
npm run deploy:versions
npm run deploy:accounts
```

Confirme o banco de destino no comando de migrações. Publique versões antes de contas, porque contas depende desse Worker. O portal fica no endereço `https://cutting-accounts.SEU-SUBDOMINIO.workers.dev`. É possível associar um domínio próprio posteriormente pelo Cloudflare.

Antes de distribuir: teste criação de conta, recebimento de código, login, `/api/session`, saída e download pelo portal. E-mail e implantação online não foram executados durante o desenvolvimento deste código.

## 4. Conectar e distribuir o Electron

Na raiz do projeto:

```bash
npm run configure:cloud --workspace=frontend -- https://cutting-accounts.SEU-SUBDOMINIO.workers.dev
```

Isso grava o endereço público em `frontend/public/cloud-service.json`. Ele será incluído no instalador. O endereço não é um segredo; nenhuma chave de Resend, Cloudflare ou banco vai para o aplicativo. A geração de instaladores falha se o serviço HTTPS não estiver configurado.

No GitHub, configure a variável de repositório **CUTTING_ACCOUNT_URL** com o mesmo endereço. O workflow `.github/workflows/release-desktop.yml` é a única publicação automática por tag; os workflows antigos de Windows permanecem disponíveis somente manualmente.

Para macOS, configure os secrets `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` e `APPLE_TEAM_ID`, com certificado Developer ID e dados para notarização. O workflow exige esses valores e gera DMG + ZIP para Intel e Apple Silicon. A assinatura temporária do runtime de desenvolvimento não substitui o certificado de distribuição. Para Windows, configure `WIN_CSC_LINK` e `WIN_CSC_KEY_PASSWORD` para distribuir versões assinadas; o fluxo usa NSIS x64. Linux usa pacotes x64 e AppImage; valide a atualização no formato efetivamente instalado.

Crie a tag `v0.2.0` somente depois de incorporar esta entrega e concluir a configuração. O workflow confere se a tag corresponde à versão do `frontend/package.json`, empacota também o motor Python para cada plataforma e produz uma **release em rascunho**. A etapa de publicação só ocorre se todos os pacotes terminarem; os metadados de macOS combinam as duas arquiteturas. Revise os instaladores e teste a atualização real antes de publicar a release.

Os três computadores receberão essa primeira instalação manualmente. Versões antigas sem login/atualizador continuam funcionando localmente; não é possível impor retroativamente essas regras a elas.

## 5. Próximas versões

1. Aumente `frontend/package.json` e atualize o lockfile com `npm install --package-lock-only --ignore-scripts`.
2. Teste e crie uma tag com o mesmo número, como `v0.2.1`.
3. Aguarde o workflow e teste os pacotes do rascunho, preservação de projetos e atualização a partir da versão anterior em cada sistema.
4. Publique a release revisada no GitHub. Ela precisa conter instaladores, ZIPs macOS, `latest*.yml` e arquivos auxiliares gerados.
5. Atualize `LATEST_VERSION` no serviço de versões e publique-o. Eleve `MINIMUM_VERSION` somente quando for necessário exigir atualização.

O aplicativo consulta atualizações ao abrir, oferece download explícito e mostra “Reiniciar e atualizar” quando pronto. Não instala silenciosamente ao fechar. O reinício é recusado enquanto houver cálculo ou projeto sem salvar.

A sessão dura até 30 dias. Após validar online, há tolerância offline de até sete dias, limitada também à expiração da sessão e vinculada ao mesmo serviço e à mesma versão do aplicativo. Após atualização, é necessária nova validação online, mas não necessariamente novo login. Respostas de conta bloqueada, sessão expirada ou versão inválida removem a autorização local. Uma versão que o servidor já marcou como obrigatoriamente desatualizada não ganha acesso offline.

O token fica no processo principal; o renderer recebe apenas estado da conta e política de versão. A persistência usa `safeStorage`; sem criptografia disponível (ou backend Linux `basic_text`), a sessão fica apenas em memória e exige novo login ao reabrir. Logout apaga o acesso local mesmo offline; nesse caso a revogação remota não pode ser confirmada até haver conexão. Bloqueios feitos enquanto o computador está offline passam a valer na reconexão ou no término da tolerância. Como o motor é local, um cliente modificado pode contornar controles locais; esta estrutura não promete proteção absoluta contra adulteração.

## Operação inicial

Consultar usuários e versões dos dispositivos:

```bash
npx wrangler d1 execute cutting-accounts --remote -c accounts/wrangler.jsonc --command "SELECT u.email,u.status,s.device_id,s.app_version,s.platform,s.last_seen_at FROM users u LEFT JOIN sessions s ON s.user_id=u.id;"
```

O status de `users` pode ser alterado entre `active` e `blocked` pelo administrador no D1. Não exponha endpoints administrativos públicos sem autenticação e autorização próprias. O job diário remove códigos, sessões e contadores expirados.

Rotas de contas: `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/session`, `POST /api/auth/logout`, `GET /api/version` (proxy interno) e `GET /api/health`. O serviço de versões também oferece `GET /api/version?version=0.2.0&platform=win32` diretamente. Portal utiliza cookie HttpOnly; desktop utiliza Bearer token sem redirects. APIs do portal não aceitam origens de navegador diferentes. Códigos valem dez minutos, são de uso único, têm cinco tentativas e limites de envio por e-mail e IP.
