# Cutting: contas, senhas e versões em um Worker

O Worker **cutting-accounts** atende o portal, cadastro com senha, login, sessões, autorização e política de versões. Usa o D1 `cutting-accounts`. O backend Python continua executando a otimização no computador; projetos e exportações não mudam.

O login usa o e-mail como identificador, sem confirmação por e-mail. Não depende de Resend, `EMAIL_FROM`, `RESEND_API_KEY` ou `AUTH_SECRET`. Não é uma prova de propriedade do endereço de e-mail. Novas contas têm senhas protegidas com PBKDF2-HMAC-SHA256 (600.000 iterações, salt aleatório de 16 bytes, hash de 32 bytes). Senhas têm 15 a 128 caracteres, sem regras obrigatórias de símbolos ou letras. A comparação é feita em tempo constante.

## Desenvolvimento e testes

Requer Node.js 22 atualizado ou superior. Na raiz:

```bash
npm ci
cd cloudflare
npm ci
npm test
npm run check
npm run db:local
npm run dev
```

Para testar a ativação administrativa, defina uma senha escolhida por você em `accounts/.dev.vars` (arquivo ignorado pelo Git):

```dotenv
ADMIN_PASSWORD=SUA_SENHA_INICIAL_COM_PELO_MENOS_15_CARACTERES
```

Abra o endereço mostrado pelo Wrangler. O motor desktop pode usar o serviço local com `CUTTING_ACCOUNT_URL=http://localhost:8787 make start` na raiz. Aplicativos empacotados sempre exigem o serviço HTTPS configurado.

## Publicar pelo painel Cloudflare

1. Preserve o Worker **cutting-accounts** e o banco existente. Confira o `database_id` em `accounts/wrangler.jsonc` com o painel D1. Não crie outro banco para trocar a autenticação.
2. Em **Workers & Pages → cutting-accounts → Settings → Builds**, configure:

   | Campo          | Valor                       |
   | -------------- | --------------------------- |
   | Branch         | `master`                    |
   | Root directory | `/cloudflare`               |
   | Build command  | `npm ci`                    |
   | Deploy command | `npm run deploy:production` |

3. Publique após incorporar esta alteração. O comando aplica `0003_passwords.sql` antes do código. Ela adiciona o hash das senhas, os links de definição/recuperação e reserva `admin@cutting.com`. Usuários e sessões comuns são preservados. Apenas sessões anteriores da identidade reservada `admin@cutting.com` são removidas, e uma eventual senha anterior dessa identidade é invalidada para não conceder privilégio a uma conta pré-existente.
4. Em **Settings → Runtime variables and secrets → Add variable**, escolha **Secret**, nome **ADMIN_PASSWORD**, valor: uma senha inicial escolhida por você com 15 a 128 caracteres. Salve/aplique. Não cadastre essa senha nas variáveis de build nem no GitHub.
5. No portal, entre com **admin@cutting.com** e essa senha. A primeira entrada grava somente o hash no D1. Depois disso, o valor de `ADMIN_PASSWORD` não altera a senha existente; você pode remover o secret após ativar a conta. Para mudar a senha, use **Minha conta → Alterar senha**, informando a senha atual.
6. Clique em **Abrir administração** ou acesse `/admin/`. Confirme cadastro de usuário comum, login, bloqueio, revogação, alteração de versões e geração de link de senha.

O comando anterior `npm run db:remote && npm run deploy:accounts` também funciona. Pelo terminal, dentro de `cloudflare`, use `npm run deploy:production`. Não publique só com `npm run deploy` antes de aplicar a nova migração.

O Worker exige apenas os bindings `DB` e `ASSETS`; não precisa de `VERSIONS` nem de serviço de e-mail. Secrets antigos podem permanecer sem efeito e ser retirados após validar o novo fluxo. `ADMIN_EMAILS` continua opcional para administradores adicionais; esses endereços também são reservados no cadastro público. Nunca há senha administrativa padrão no código.

PBKDF2 foi verificado no runtime local do Worker. A derivação forte usa mais CPU que o login anterior: confira os limites de CPU e métricas do seu plano em produção. Workers Free tem orçamento de 10 ms por requisição; se houver erro de limite, use Workers Paid, sem reduzir a proteção das senhas para caber nesse orçamento.

## Contas existentes e recuperação de senha

Não é possível assumir uma conta antiga pelo cadastro público: e-mails existentes são recusados e seus dados nunca são substituídos.

- Se a pessoa ainda está conectada no portal, **Minha conta → Definir minha senha** permite criar a senha usando a sessão existente.
- Se está desconectada, um administrador localiza o usuário e usa **Gerar link de senha**. O link deve ser compartilhado diretamente com a pessoa; o sistema não envia e-mail automaticamente.
- Links valem uma hora, são de uso único e somente seu hash é salvo no banco. Gerar outro link invalida o anterior. O token fica no fragmento da URL e é retirado do endereço assim que a página abre; o envio ao servidor acontece pelo corpo do pedido de definição de senha.
- Definir ou alterar senha revoga as outras sessões. Bloqueio de conta não é removido por trocar a senha.
- A identidade `admin@cutting.com` não recebe link pelo painel. Para recuperar o administrador sem sessão/senha atual, o operador autorizado pode limpar somente seu hash e suas sessões no console D1, configurar um novo `ADMIN_PASSWORD` e repetir a primeira entrada:

  ```sql
  UPDATE users SET password_hash=NULL WHERE email='admin@cutting.com';
  DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email='admin@cutting.com');
  ```

## Administração e versões

O painel lista usuários com busca/paginação, status, sessões e último acesso. Administradores podem bloquear/desbloquear, revogar sessões e gerar links de senha. Contas administrativas não podem ser bloqueadas pelo painel; **Sair** encerra sua própria sessão.

O acesso exige uma sessão ativa de navegador e um e-mail reservado/permitido. Usuários comuns e tokens do desktop não acessam as APIs administrativas. A permissão é verificada em cada pedido. O histórico registra as ações sem incluir senhas, hashes, tokens ou códigos.

A política salva pelo painel no D1 prevalece sobre `LATEST_VERSION`, `MINIMUM_VERSION` e `RELEASE_URL` do Wrangler, inclusive depois de novos deploys. Antes do primeiro salvamento, as variáveis do arquivo são utilizadas. A versão mínima não pode superar a atual; downloads precisam de HTTPS sem credenciais. Salvar a política não publica instaladores no GitHub.

O Worker antigo `cutting-versions` pode ter seus builds desativados e ser retirado depois de confirmar que ninguém usa seu endereço diretamente. O endereço de contas, o D1 e o contrato de sessão são preservados.

## 4. Conectar e distribuir o Electron

Na raiz do projeto:

```bash
npm run configure:cloud --workspace=frontend -- https://cutting-accounts.SEU-SUBDOMINIO.workers.dev
```

Isso grava o endereço público em `frontend/public/cloud-service.json`. Ele será incluído no instalador. O endereço não é um segredo; nenhuma chave de Resend, Cloudflare ou banco vai para o aplicativo. A geração de instaladores falha se o serviço HTTPS não estiver configurado.

No GitHub, configure a variável de repositório **CUTTING_ACCOUNT_URL** com o mesmo endereço. O workflow `.github/workflows/release-desktop.yml` é a única publicação automática por tag; os workflows antigos de Windows permanecem disponíveis somente manualmente.

Para macOS, configure os secrets `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` e `APPLE_TEAM_ID`, com certificado Developer ID e dados para notarização. O workflow exige esses valores e gera DMG + ZIP para Intel e Apple Silicon. A assinatura temporária do runtime de desenvolvimento não substitui o certificado de distribuição. Para Windows, configure `WIN_CSC_LINK` e `WIN_CSC_KEY_PASSWORD` para distribuir versões assinadas; o fluxo usa NSIS x64. Linux usa pacotes x64 e AppImage; valide a atualização no formato efetivamente instalado.

Crie a tag `v0.2.1` somente depois de incorporar esta entrega e concluir a configuração. O workflow confere se a tag corresponde à versão do `frontend/package.json`, empacota também o motor Python para cada plataforma e produz uma **release em rascunho**. A etapa de publicação só ocorre se todos os pacotes terminarem; os metadados de macOS combinam as duas arquiteturas. Revise os instaladores e teste a atualização real antes de publicar a release.

Distribua o instalador 0.2.1 com o novo formulário de senha. Aplicativos antigos que usam códigos de e-mail precisam ser atualizados para entrar novamente. Versões antigas sem login/atualizador continuam funcionando localmente; não é possível impor retroativamente essas regras a elas.

## 5. Próximas versões

1. Aumente `frontend/package.json` e atualize o lockfile com `npm install --package-lock-only --ignore-scripts`.
2. Teste e crie uma tag com o mesmo número, como `v0.2.1`.
3. Aguarde o workflow e teste os pacotes do rascunho, preservação de projetos e atualização a partir da versão anterior em cada sistema.
4. Publique a release revisada no GitHub. Ela precisa conter instaladores, ZIPs macOS, `latest*.yml` e arquivos auxiliares gerados.
5. Abra `/admin/` e salve a versão atual, a versão mínima e o endereço dos instaladores. A política salva no D1 passa a valer nas próximas consultas, sem novo deploy. Antes do primeiro salvamento pelo painel, os valores de `accounts/wrangler.jsonc` são utilizados. Eleve a versão mínima somente quando for necessário exigir atualização.

O aplicativo consulta atualizações ao abrir, oferece download explícito e mostra “Reiniciar e atualizar” quando pronto. Não instala silenciosamente ao fechar. O reinício é recusado enquanto houver cálculo ou projeto sem salvar.

A sessão dura até 30 dias. Após validar online, há tolerância offline de até sete dias, limitada também à expiração da sessão e vinculada ao mesmo serviço e à mesma versão do aplicativo. Após atualização, é necessária nova validação online, mas não necessariamente novo login. Respostas de conta bloqueada, sessão expirada ou versão inválida removem a autorização local. Uma versão que o servidor já marcou como obrigatoriamente desatualizada não ganha acesso offline.

O token fica no processo principal; o renderer recebe apenas estado da conta e política de versão. A persistência usa `safeStorage`; sem criptografia disponível (ou backend Linux `basic_text`), a sessão fica apenas em memória e exige novo login ao reabrir. Logout apaga o acesso local mesmo offline; nesse caso a revogação remota não pode ser confirmada até haver conexão. Bloqueios feitos enquanto o computador está offline passam a valer na reconexão ou no término da tolerância. Como o motor é local, um cliente modificado pode contornar controles locais; esta estrutura não promete proteção absoluta contra adulteração.

## Rotas e validação de produção

- `POST /api/auth/register`: `{email,password,name?,client?,deviceId?}`.
- `POST /api/auth/login`: `{email,password,client?,deviceId?}`.
- `POST /api/auth/password`: `{currentPassword?,password}` com sessão ativa.
- `POST /api/auth/reset-password`: `{token,password}`.
- `GET /api/session`, `POST /api/auth/logout`, `GET /api/version` e `GET /api/health`.
- As rotas antigas `request-code` e `verify-code` retornam `410`, orientando atualizar o aplicativo.
- Administração: `GET /api/admin/me`, `GET /api/admin/users`, `GET /api/admin/users/:id/sessions`, `POST /api/admin/users/:id/status`, `POST /api/admin/users/:id/sessions`, `POST /api/admin/users/:id/password-reset`, `GET/PUT /api/admin/version`, `GET /api/admin/audit`.

Portal usa cookie HttpOnly/Secure/SameSite; desktop usa Bearer no processo principal. Somente o token de sessão é persistido com `safeStorage`, nunca a senha. Cadastro/login e troca/recuperação de senha têm limites de tentativas. As tabelas antigas de desafios são mantidas para uma migração sem exclusão de dados, mas não autorizam novos acessos.

Teste em produção a primeira entrada administrativa, cadastro comum, login incorreto/correto, logout, troca de senha, link de recuperação, bloqueio e política de versões. `/api/health` confirma apenas que o handler responde. Não houve envio de e-mail nem publicação em produção durante esta alteração.
