const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const OFFLINE_MS = 7 * 86400000;
function validateServiceUrl(value, packaged) {
  if (!value) return '';
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Configure somente a origem do serviço de contas.');
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (
    url.protocol !== 'https:' &&
    (packaged || !local || url.protocol !== 'http:')
  )
    throw new Error('O serviço de contas deve usar HTTPS.');
  return url.origin;
}
function createCloudClient({
  url,
  packaged,
  version,
  platform,
  directory,
  safeStorage,
  fetchApi = fetch,
  now = Date.now,
}) {
  const base = validateServiceUrl(url, packaged);
  const enabled = packaged || !!base;
  const target = path.join(directory, 'account-session.enc');
  const canPersist = () =>
    safeStorage?.isEncryptionAvailable() &&
    safeStorage.getSelectedStorageBackend?.() !== 'basic_text';
  let credentials = null,
    generation = 0;
  try {
    if (canPersist())
      credentials = JSON.parse(
        safeStorage.decryptString(fs.readFileSync(target))
      );
  } catch {
    credentials = null;
  }
  if (credentials?.serviceUrl !== base) credentials = null;
  const persist = () => {
    if (!credentials) {
      fs.rmSync(target, { force: true });
      return;
    }
    if (!canPersist()) return; // Keep the token in memory; never write plaintext.
    fs.mkdirSync(directory, { recursive: true });
    const temp = `${target}.tmp`;
    fs.writeFileSync(
      temp,
      safeStorage.encryptString(JSON.stringify(credentials)),
      { mode: 0o600 }
    );
    fs.renameSync(temp, target);
  };
  const signedOut = error => ({
    enabled,
    configured: !!base,
    authenticated: false,
    allowed: !enabled,
    error,
  });
  async function request(route, data, authenticated = false) {
    if (!base)
      throw new Error(
        'Configure o endereço do serviço de contas antes de distribuir o aplicativo.'
      );
    const response = await fetchApi(`${base}${route}`, {
      method: data ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'X-App-Version': version(),
        'X-App-Platform': platform,
        ...(authenticated && credentials
          ? { Authorization: `Bearer ${credentials.token}` }
          : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || 'Serviço indisponível.');
      error.status = response.status;
      throw error;
    }
    return result;
  }
  async function getState() {
    if (!enabled) return signedOut();
    if (!base)
      return signedOut(
        'O serviço de contas ainda não foi configurado nesta instalação.'
      );
    if (!credentials) return signedOut();
    const currentGeneration = generation;
    try {
      const result = await request('/api/session', null, true);
      if (currentGeneration !== generation) return signedOut();
      credentials = {
        ...credentials,
        verifiedAt: now(),
        verifiedVersion: version(),
        session: result,
      };
      persist();
      return { enabled, configured: true, authenticated: true, ...result };
    } catch (error) {
      if (currentGeneration !== generation) return signedOut();
      if ([400, 401, 403].includes(error.status)) {
        credentials = null;
        generation++;
        persist();
        return signedOut(error.message);
      }
      const saved = credentials.session,
        time = now();
      if (
        (!error.status || error.status >= 500) &&
        credentials.verifiedVersion === version() &&
        saved?.allowed &&
        time >= credentials.verifiedAt &&
        time - credentials.verifiedAt < OFFLINE_MS &&
        time < saved.expiresAt
      )
        return {
          enabled,
          configured: true,
          authenticated: true,
          ...saved,
          offline: true,
          error:
            'Sem conexão com o serviço. Acesso temporário por até 7 dias desde a última validação.',
        };
      return {
        ...signedOut('Conecte-se à internet para validar sua conta.'),
        authenticated: !!credentials,
        allowed: false,
      };
    }
  }
  return {
    enabled,
    configured: !!base,
    getState,
    requestCode: (email, name) =>
      request('/api/auth/request-code', { email, name }),
    async verifyCode(challengeId, code) {
      const currentGeneration = generation;
      const deviceId = credentials?.deviceId || randomUUID();
      const result = await request('/api/auth/verify-code', {
        challengeId,
        code,
        client: 'desktop',
        deviceId,
      });
      if (currentGeneration !== generation)
        throw new Error('O acesso foi cancelado. Entre novamente.');
      credentials = { token: result.token, deviceId, serviceUrl: base };
      generation++;
      persist();
      return getState();
    },
    async logout() {
      // Begin revocation with the existing token, but clear local access even when offline.
      const revocation = credentials
        ? request('/api/auth/logout', {}, true).catch(() => {})
        : Promise.resolve();
      credentials = null;
      generation++;
      persist();
      await revocation;
      return signedOut();
    },
    async assertAllowed() {
      const state = await getState();
      if (!state.allowed)
        throw new Error(
          state.policy?.updateRequired
            ? `Atualize para a versão ${state.policy.minimumVersion} ou superior antes de otimizar.`
            : state.error || 'Entre na sua conta para otimizar os cortes.'
        );
      return state;
    },
  };
}
module.exports = { createCloudClient, validateServiceUrl };
