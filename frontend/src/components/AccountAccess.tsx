import React, { useCallback, useEffect, useState } from 'react';
import './AccountAccess.css';
export interface AccountState {
  enabled?: boolean;
  configured?: boolean;
  authenticated?: boolean;
  allowed?: boolean;
  offline?: boolean;
  user?: { id: string; email: string; name: string };
  policy?: {
    latestVersion: string;
    minimumVersion: string;
    updateAvailable: boolean;
    updateRequired: boolean;
  };
  error?: string;
}
export interface UpdateState {
  enabled: boolean;
  phase: string;
  version?: string;
  percent?: number;
  error?: string;
}
function required<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error('Reabra o aplicativo para carregar os serviços de conta.');
  return value;
}
export default function AccountAccess({
  onAccessChanged,
  busy,
}: {
  onAccessChanged: (allowed: boolean) => void;
  busy: boolean;
}) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(''),
    [working, setWorking] = useState(false),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.getAccountState) {
      onAccessChanged(true);
      return;
    }
    try {
      const state = await api.getAccountState();
      setAccount(state);
      onAccessChanged(state.enabled === false || state.allowed === true);
    } catch {
      onAccessChanged(false);
      setError('Não foi possível validar o acesso. Tente novamente.');
    }
  }, [onAccessChanged]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 300000);
    const api = window.electronAPI;
    const unsubscribe = api?.onUpdateState?.(setUpdate);
    if (api?.getUpdateState)
      void api
        .getUpdateState()
        .then(state => {
          setUpdate(state);
          if (state.enabled) void api.checkUpdates?.().then(setUpdate);
        })
        .catch(() => setError('Não foi possível consultar as atualizações.'));
    return () => {
      clearInterval(timer);
      unsubscribe?.();
    };
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };
  if (!window.electronAPI?.getAccountState) return null;
  if (!account)
    return (
      <section className="account-strip" role="status">
        Validando acesso… {error}
      </section>
    );
  if (account.enabled === false) return null;
  const authenticated = account.authenticated && !!account.user;
  return (
    <section className="account-strip" aria-label="Conta e atualizações">
      <div className="account-heading">
        <div>
          <strong>
            {authenticated
              ? account.user?.email
              : 'Entre ou crie sua conta para otimizar'}
          </strong>
          <p>
            {account.policy?.updateRequired
              ? `Atualização obrigatória: versão ${account.policy.minimumVersion} ou superior.`
              : authenticated
                ? account.offline
                  ? account.error
                  : 'Conta validada. Seus projetos permanecem neste computador.'
                : account.error ||
                  'Confirme seu e-mail com um código de acesso. Salvar e exportar projetos continua disponível.'}
          </p>
        </div>
        <div className="account-actions">
          <button disabled={working || busy} onClick={() => void run(refresh)}>
            Validar acesso
          </button>
          {authenticated && (
            <button
              disabled={working || busy}
              onClick={() =>
                void run(async () => {
                  const state = await required(
                    window.electronAPI?.logoutAccount
                  )();
                  setAccount(state);
                  onAccessChanged(false);
                  setChallenge('');
                })
              }
            >
              Sair da conta
            </button>
          )}
        </div>
      </div>
      {!authenticated && account.configured && (
        <form
          className="account-form"
          onSubmit={event => {
            event.preventDefault();
            void run(async () => {
              if (!challenge) {
                const result = await required(
                  window.electronAPI?.requestAccountCode
                )(email.trim(), name.trim());
                if (result.error || !result.challengeId)
                  throw new Error(
                    result.error || 'Não foi possível enviar o código.'
                  );
                setChallenge(result.challengeId);
                setCode('');
              } else {
                const state = await required(
                  window.electronAPI?.verifyAccountCode
                )(challenge, code.trim());
                if (!state.authenticated)
                  throw new Error(
                    state.error || 'Não foi possível confirmar o acesso.'
                  );
                setAccount(state);
                onAccessChanged(state.allowed === true);
                setChallenge('');
              }
            });
          }}
        >
          {!challenge ? (
            <>
              <label>
                Nome (opcional)
                <input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
            </>
          ) : (
            <label>
              Código enviado para {email}
              <input
                value={code}
                onChange={event => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                minLength={8}
                maxLength={8}
                required
              />
            </label>
          )}
          <button disabled={working}>
            {working
              ? 'Aguarde…'
              : challenge
                ? 'Confirmar código'
                : 'Receber código'}
          </button>
          {challenge && (
            <button
              type="button"
              disabled={working}
              onClick={() => {
                setChallenge('');
                setError('');
              }}
            >
              Alterar e-mail ou reenviar
            </button>
          )}
        </form>
      )}
      {update?.enabled && (
        <div className="update-row" role="status">
          <span>
            {update.phase === 'ready'
              ? `Versão ${update.version} pronta para instalar.`
              : update.phase === 'downloading'
                ? `Baixando atualização: ${update.percent || 0}%`
                : update.phase === 'available'
                  ? `Versão ${update.version} disponível.`
                  : update.phase === 'checking'
                    ? 'Consultando atualizações…'
                    : update.phase === 'current'
                      ? 'Aplicativo atualizado.'
                      : update.error || 'Atualizações do aplicativo'}
          </span>
          <button
            disabled={
              working ||
              busy ||
              ['checking', 'downloading'].includes(update.phase)
            }
            onClick={() =>
              void run(async () => {
                const api = required(window.electronAPI);
                if (update.phase === 'ready') {
                  const result = await required(api.installUpdate)();
                  if (result.error) throw new Error(result.error);
                } else
                  setUpdate(
                    await (update.phase === 'available'
                      ? required(api.downloadUpdate)()
                      : required(api.checkUpdates)())
                  );
              })
            }
          >
            {update.phase === 'ready'
              ? 'Reiniciar e atualizar'
              : update.phase === 'available'
                ? 'Baixar atualização'
                : 'Verificar atualizações'}
          </button>
        </div>
      )}
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
