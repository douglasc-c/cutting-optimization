import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountAccess from './AccountAccess';
afterEach(() => {
  delete window.electronAPI;
});
test('email code signs in and enables access only after server validation', async () => {
  const allowed = jest.fn();
  const api: any = {
    getAccountState: jest
      .fn()
      .mockResolvedValue({ enabled: true, configured: true, allowed: false }),
    requestAccountCode: jest
      .fn()
      .mockResolvedValue({ challengeId: 'challenge' }),
    verifyAccountCode: jest
      .fn()
      .mockResolvedValue({
        enabled: true,
        configured: true,
        authenticated: true,
        allowed: true,
        user: { email: 'user@example.com' },
      }),
  };
  window.electronAPI = api;
  render(<AccountAccess onAccessChanged={allowed} busy={false} />);
  await screen.findByRole('button', { name: 'Receber código' });
  expect(allowed).toHaveBeenCalledWith(false);
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'user@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Receber código' }));
  const code = await screen.findByLabelText(
    'Código enviado para user@example.com'
  );
  fireEvent.change(code, { target: { value: '12345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }));
  await screen.findByText('user@example.com');
  expect(api.verifyAccountCode).toHaveBeenCalledWith('challenge', '12345678');
  expect(allowed).toHaveBeenLastCalledWith(true);
});
test('required update keeps access denied and offers explicit download', async () => {
  const allowed = jest.fn(),
    download = jest
      .fn()
      .mockResolvedValue({ enabled: true, phase: 'ready', version: '0.2.1' });
  const api: any = {
    getAccountState: jest
      .fn()
      .mockResolvedValue({
        enabled: true,
        configured: true,
        authenticated: true,
        allowed: false,
        user: { email: 'user@example.com' },
        policy: { updateRequired: true, minimumVersion: '0.2.1' },
      }),
    getUpdateState: jest
      .fn()
      .mockResolvedValue({ enabled: true, phase: 'idle' }),
    checkUpdates: jest
      .fn()
      .mockResolvedValue({
        enabled: true,
        phase: 'available',
        version: '0.2.1',
      }),
    downloadUpdate: download,
  };
  window.electronAPI = api;
  render(<AccountAccess onAccessChanged={allowed} busy={false} />);
  await screen.findByText('Atualização obrigatória: versão 0.2.1 ou superior.');
  expect(allowed).toHaveBeenLastCalledWith(false);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Baixar atualização' })
  );
  await screen.findByRole('button', { name: 'Reiniciar e atualizar' });
  expect(download).toHaveBeenCalledTimes(1);
});
test('logout denies further optimization without replacing the workspace', async () => {
  const allowed = jest.fn();
  window.electronAPI = {
    getAccountState: jest
      .fn()
      .mockResolvedValue({
        enabled: true,
        configured: true,
        authenticated: true,
        allowed: true,
        user: { email: 'user@example.com' },
      }),
    logoutAccount: jest
      .fn()
      .mockResolvedValue({
        enabled: true,
        configured: true,
        authenticated: false,
        allowed: false,
      }),
  } as any;
  render(<AccountAccess onAccessChanged={allowed} busy={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }));
  await waitFor(() => expect(allowed).toHaveBeenLastCalledWith(false));
  await screen.findByRole('button', { name: 'Receber código' });
});
