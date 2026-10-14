# Cutting: contas e versões no Cloudflare

Contas e política de versões são atendidas por um único Worker JavaScript com compatibilidade Node.js: **cutting-accounts**. O backend Python continua executando o motor de corte localmente, sem alterações nas regras de otimização.

- **cutting-accounts**: portal web, confirmação de e-mail, sessões, dispositivos, autorização e política de versões (versão mais recente, mínima suportada e endereço dos instaladores). Usa o banco D1 `cutting-accounts` e avalia versões no próprio código, sem Service Binding.
- **Electron**: consulta a conta no processo principal antes de cada otimização. Login não impede salvar ou exportar projetos. Atualizações usam `electron-updater` e GitHub Releases.

A interface web criada aqui é um portal de contas e downloads. Não executa o otimizador no navegador. O painel administrativo fica em `/admin/`. Administradores podem listar e bloquear usuários, revogar sessões, alterar a política de versões e consultar o histórico de ações. O acesso usa o mesmo login por e-mail do portal e exige que o e-mail esteja configurado em `ADMIN_EMAILS`.

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

Os testes usam SQLite real para contas e validam a política de versões dentro do mesmo Worker, sem binding `VERSIONS`. O comando `check` empacota somente `cutting-accounts`, sem publicá-lo. Confira o `database_id` de `accounts/wrangler.jsonc` antes de executar migrações remotas.

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

O Wrangler inicia somente o Worker de contas e versões. Abra o endereço exibido no terminal. Em outro terminal, na raiz do projeto, use o endereço local do Worker de contas:

```bash
CUTTING_ACCOUNT_URL=http://localhost:8787 make start
```

Sem essa variável e com `accountUrl` vazio, `make start` continua funcionando para desenvolvimento local sem exigir conta. Aplicativos empacotados sempre exigem o serviço configurado. O endereço HTTP local é permitido apenas no desenvolvimento.

## 2. Conferir ou criar o banco na sua conta Cloudflare

Se já existe um banco `cutting-accounts`, preserve-o e confira o ID no painel D1. Não crie outro banco para esta unificação. Somente para uma instalação nova, dentro de `cloudflare`:

```bash
npx wrangler login
npx wrangler d1 create cutting-accounts
```

Copie o `database_id` retornado para `accounts/wrangler.jsonc`, substituindo o ID de outra instalação, se necessário. O nome e o binding `DB` devem permanecer iguais. Use uma conta e um banco de testes primeiro; para separar homologação e produção, duplique as configurações com nomes de Workers e bancos distintos, ajustando os comandos `--config`.

## 3. Configurar e publicar o Worker único

Em `accounts/wrangler.jsonc`, altere `EMAIL_FROM` para um remetente do seu domínio verificado no Resend. Cadastre os segredos sem colocá-los no repositório:

```bash
openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET -c accounts/wrangler.jsonc
npx wrangler secret put RESEND_API_KEY -c accounts/wrangler.jsonc
```

Use uma chave estável para `AUTH_SECRET`; sua troca invalida os códigos de acesso ainda pendentes. Os tokens de sessão são aleatórios e armazenados como hashes no banco, sem depender dessa chave.

Revise a política inicial em `accounts/wrangler.jsonc`, junto com `EMAIL_FROM`. Após salvar uma política pelo painel administrativo, os valores do D1 passam a prevalecer sobre as variáveis do Wrangler, inclusive depois de novos deploys. `MINIMUM_VERSION` deve ser menor ou igual a `LATEST_VERSION`. Os valores iniciais são `0.2.0`, correspondendo à primeira versão do aplicativo com contas. `RELEASE_URL` aponta para o GitHub Releases público; se o repositório de distribuição for privado, configure um feed apropriado antes de distribuir. Nunca incorpore um token do GitHub no Electron.

```bash
npm run deploy:production
```

O comando aplica as migrações pendentes e publica apenas `cutting-accounts`. Confirme o banco de destino antes de executar. `npm run deploy` publica sem migrar; `npm run deploy:accounts` permanece como alias para configurações existentes do painel. O portal fica no endereço `https://cutting-accounts.SEU-SUBDOMINIO.workers.dev`. É possível associar um domínio próprio posteriormente pelo Cloudflare.

Antes de distribuir: teste criação de conta, recebimento de código, login, `/api/session`, saída e download pelo portal. E-mail e implantação online não foram executados durante o desenvolvimento deste código.

## Migração pelo painel: de dois Workers para um

1. Incorpore a mudança na branch de produção (`master`). Em **Workers & Pages → cutting-accounts → Settings → Builds**, mantenha o mesmo repositório e use:

   | Campo             | Valor                       |
   | ----------------- | --------------------------- |
   | Production branch | `master`                    |
   | Root directory    | `/cloudflare`               |
   | Build command     | `npm ci`                    |
   | Deploy command    | `npm run deploy:production` |

   O comando anterior `npm run db:remote && npm run deploy:accounts` também continua funcionando.

2. Preserve os secrets de runtime `AUTH_SECRET` e `RESEND_API_KEY` no Worker de contas. Confira no arquivo Wrangler `EMAIL_FROM`, `LATEST_VERSION`, `MINIMUM_VERSION` e `RELEASE_URL`: a política antes definida em `cutting-versions` deve agora estar neste arquivo. Se você já tinha elevado a versão mínima ou alterado o download, copie esses valores antes de publicar.
3. Confira o `database_id` e execute/aguarde o build de produção. O token do build precisa poder publicar o Worker e aplicar migrações D1. A unificação não exige alterar as tabelas de contas. O painel administrativo requer a migração `0002_admin.sql`, aplicada por `deploy:production`.
4. Após a publicação, confira `DB → cutting-accounts`, os assets do portal e a ausência do Service Binding `VERSIONS`. O deploy aplica essa configuração pelo Wrangler; não crie um novo binding `VERSIONS`.
5. Teste `/api/health`, `/api/version?version=0.2.0&platform=win32`, recebimento de código, login no portal e `/api/session` pelo desktop. Health confirma apenas que o handler responde; os testes de login e sessão verificam banco, e-mail e autorização.
6. Somente depois de validar contas, desative o build automático do antigo `cutting-versions` em **Settings → Builds → Disable builds**. O script `deploy:versions` foi removido porque não há mais um Worker separado no código.
7. O Worker antigo pode ser excluído posteriormente se nenhum cliente externo usar seu endereço diretamente. Os clientes Electron e o portal que usam o endereço de contas não precisam mudar de URL. Não exclua o D1 nem o Worker `cutting-accounts`.

O nome, o endereço público, o banco e o formato das respostas de contas são preservados. Sessões existentes continuam válidas. Mantenha o `AUTH_SECRET` atual para também preservar os códigos de e-mail pendentes. Se for necessário reverter, publique o código anterior de contas enquanto o Worker antigo de versões ainda estiver disponível.

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
5. Abra `/admin/` e salve a versão atual, a versão mínima e o endereço dos instaladores. A política salva no D1 passa a valer nas próximas consultas, sem novo deploy. Antes do primeiro salvamento pelo painel, os valores de `accounts/wrangler.jsonc` são utilizados. Eleve a versão mínima somente quando for necessário exigir atualização.

O aplicativo consulta atualizações ao abrir, oferece download explícito e mostra “Reiniciar e atualizar” quando pronto. Não instala silenciosamente ao fechar. O reinício é recusado enquanto houver cálculo ou projeto sem salvar.

A sessão dura até 30 dias. Após validar online, há tolerância offline de até sete dias, limitada também à expiração da sessão e vinculada ao mesmo serviço e à mesma versão do aplicativo. Após atualização, é necessária nova validação online, mas não necessariamente novo login. Respostas de conta bloqueada, sessão expirada ou versão inválida removem a autorização local. Uma versão que o servidor já marcou como obrigatoriamente desatualizada não ganha acesso offline.

O token fica no processo principal; o renderer recebe apenas estado da conta e política de versão. A persistência usa `safeStorage`; sem criptografia disponível (ou backend Linux `basic_text`), a sessão fica apenas em memória e exige novo login ao reabrir. Logout apaga o acesso local mesmo offline; nesse caso a revogação remota não pode ser confirmada até haver conexão. Bloqueios feitos enquanto o computador está offline passam a valer na reconexão ou no término da tolerância. Como o motor é local, um cliente modificado pode contornar controles locais; esta estrutura não promete proteção absoluta contra adulteração.

## Ativar o painel administrativo

1. Publique usando `npm run deploy:production` (ou `npm run db:remote && npm run deploy:accounts`). A migração `0002_admin.sql` adiciona a política de versões e o histórico administrativo; preserva usuários, sessões e códigos existentes. Não use apenas `npm run deploy` antes de aplicar esta migração: as consultas de versão precisam da nova tabela.
2. No painel Cloudflare, abra **Workers & Pages → cutting-accounts → Settings → Runtime variables and secrets → Add variable**. Escolha **Secret**, nome **ADMIN_EMAILS** e valor igual ao seu e-mail completo. Para mais de um administrador, separe os endereços por vírgula. Salve/aplique a alteração. Este valor deve ficar na configuração de execução do Worker, não nas variáveis de build. Alternativa pelo terminal, dentro de `cloudflare`:

   ```bash
   npx wrangler secret put ADMIN_EMAILS -c accounts/wrangler.jsonc
   ```

   Para desenvolvimento local, adicione `ADMIN_EMAILS=seu-email@seu-dominio.com` a `accounts/.dev.vars`.

3. Entre no portal com esse mesmo e-mail e confirme o código recebido. O link **Abrir administração** aparecerá na área da conta. Você também pode abrir `/admin/` diretamente depois do login.
4. Use **Buscar** para localizar usuários, **Ver sessões** para consultar dispositivos e **Bloquear / Desbloquear** ou **Revogar sessões** para gerenciar acesso. Contas administrativas não podem ser bloqueadas pelo painel; use **Sair** para encerrar sua própria sessão.
5. Em **Política de versões**, informe `major.minor.patch` (ex.: `0.2.1`) e um endereço HTTPS sem credenciais. A versão mínima não pode ser maior que a atual. O painel pede confirmação antes de salvar; consulte `/api/version` para verificar o resultado. Salvar a política não cria uma release nem publica instaladores no GitHub.
6. Confira **Últimas alterações**: o histórico registra o administrador, a ação, o usuário ou política alterada e a data. Não armazena códigos de login nem tokens. As alterações e seus registros são gravados na mesma transação.

Sem `ADMIN_EMAILS`, ninguém recebe permissão administrativa. A lista é validada a cada requisição e somente sessões de navegador podem acessar as APIs administrativas. Usuários comuns e tokens do desktop não ganham acesso ao painel. Para remover um administrador, retire seu endereço do secret; a próxima requisição já será negada. Se todos perderem acesso, corrija a lista pelo painel Cloudflare. Nenhum e-mail de administrador foi escolhido automaticamente no código.

Rotas administrativas: `GET /api/admin/me`, `GET /api/admin/users?q=...&page=1` (25 por página), `GET /api/admin/users/:id/sessions` (até 100 sessões ativas), `POST /api/admin/users/:id/status` com `{ "status": "active" | "blocked" }`, `POST /api/admin/users/:id/sessions` com `{}` para revogar todas as sessões, `GET/PUT /api/admin/version` e `GET /api/admin/audit` (50 últimas ações).

## Operação inicial

Consultar usuários e versões dos dispositivos:

```bash
npx wrangler d1 execute cutting-accounts --remote -c accounts/wrangler.jsonc --command "SELECT u.email,u.status,s.device_id,s.app_version,s.platform,s.last_seen_at FROM users u LEFT JOIN sessions s ON s.user_id=u.id;"
```

O status de `users` pode ser alterado entre `active` e `blocked` pelo painel administrativo. Bloquear um usuário revoga suas sessões; desbloquear permite novo login e não restaura sessões antigas. Computadores offline continuam sujeitos à tolerância já descrita acima. O job diário remove códigos, sessões e contadores expirados.

Rotas de contas: `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/session`, `POST /api/auth/logout`, `GET /api/version` (política local) e `GET /api/health`. Use `GET /api/version?version=0.2.0&platform=win32` no mesmo endereço de contas. Portal utiliza cookie HttpOnly; desktop utiliza Bearer token sem redirects. APIs do portal não aceitam origens de navegador diferentes. Códigos valem dez minutos, são de uso único, têm cinco tentativas e limites de envio por e-mail e IP.
