import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountAccess from './AccountAccess';
afterEach(() => {
  delete window.electronAPI;
});
test('password login enables access only after server validation', async () => {
  const allowed = jest.fn();
  const api: any = {
    getAccountState: jest
      .fn()
      .mockResolvedValue({ enabled: true, configured: true, allowed: false }),
    loginAccount: jest.fn().mockResolvedValue({
      enabled: true,
      configured: true,
      authenticated: true,
      allowed: true,
      user: { email: 'user@example.com' },
    }),
  };
  window.electronAPI = api;
  render(<AccountAccess onAccessChanged={allowed} busy={false} />);
  await screen.findByRole('button', { name: 'Entrar' });
  expect(allowed).toHaveBeenCalledWith(false);
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'uma senha longa de teste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('user@example.com');
  expect(api.loginAccount).toHaveBeenCalledWith(
    'user@example.com',
    'uma senha longa de teste'
  );
  expect(allowed).toHaveBeenLastCalledWith(true);
});
test('registration checks password confirmation before calling main process', async () => {
  const api: any = {
    getAccountState: jest
      .fn()
      .mockResolvedValue({ enabled: true, configured: true, allowed: false }),
    registerAccount: jest.fn().mockResolvedValue({
      authenticated: true,
      allowed: true,
      user: { email: 'user@example.com' },
    }),
  };
  window.electronAPI = api;
  render(<AccountAccess onAccessChanged={jest.fn()} busy={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Criar conta' }));
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'uma senha longa de teste' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), {
    target: { value: 'outra senha longa de teste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e entrar' }));
  await screen.findByText('As senhas não coincidem.');
  expect(api.registerAccount).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirmar senha'), {
    target: { value: 'uma senha longa de teste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e entrar' }));
  await screen.findByText('user@example.com');
  expect(api.registerAccount).toHaveBeenCalledWith(
    'user@example.com',
    'uma senha longa de teste',
    ''
  );
});
test('required update keeps access denied and offers explicit download', async () => {
  const allowed = jest.fn(),
    download = jest
      .fn()
      .mockResolvedValue({ enabled: true, phase: 'ready', version: '0.2.1' });
  const api: any = {
    getAccountState: jest.fn().mockResolvedValue({
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
    checkUpdates: jest.fn().mockResolvedValue({
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
    getAccountState: jest.fn().mockResolvedValue({
      enabled: true,
      configured: true,
      authenticated: true,
      allowed: true,
      user: { email: 'user@example.com' },
    }),
    logoutAccount: jest.fn().mockResolvedValue({
      enabled: true,
      configured: true,
      authenticated: false,
      allowed: false,
    }),
  } as any;
  render(<AccountAccess onAccessChanged={allowed} busy={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }));
  await waitFor(() => expect(allowed).toHaveBeenLastCalledWith(false));
  await screen.findByRole('button', { name: 'Entrar' });
});
