import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import App from './App';
const response = {
  success: true,
  algorithm: 'fast',
  result: {
    pieces_placed: [
      {
        id: 'piece_0_0',
        x: 0,
        y: 0,
        width: 20,
        height: 30,
        area: 600,
        description: 'Porta',
      },
    ],
    stock_dimensions: { width: 100, height: 30 },
    stock_used: 1,
    waste_percentage: 80,
    execution_time: 0.01,
    is_optimal: false,
    total_area: 3000,
    used_area: 600,
  },
  efficiency_metrics: { area_efficiency: 20 },
};
let api: any;
beforeEach(() => {
  localStorage.clear();
  api = {
    optimizeCutting: jest.fn().mockResolvedValue(response),
    loadWorkspace: jest.fn().mockResolvedValue(null),
    saveWorkspace: jest.fn().mockResolvedValue({ success: true }),
    saveConfig: jest.fn().mockResolvedValue({ success: false, canceled: true }),
    loadConfig: jest.fn().mockResolvedValue({ success: false, canceled: true }),
    cancelOptimization: jest.fn(),
    getRecentProjects: jest.fn().mockResolvedValue([]),
    setDocumentState: jest.fn().mockResolvedValue(undefined),
  };
  window.electronAPI = api;
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({
      font: '',
      measureText: (text: string) => ({ width: text.length * 2 }),
    } as any);
});
afterEach(() => jest.restoreAllMocks());
const ready = async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Otimizar corte' })).toBeEnabled()
  );
};
const calculate = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Otimizar corte' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Selecionar Porta/ })
    ).toBeInTheDocument()
  );
};

test('renders editable table and duplicates/removes/undoes a piece', async () => {
  await ready();
  expect(screen.getByText('Peças a cortar')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nome da peça 1'), {
    target: { value: 'Lateral' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar peça 1' }));
  expect(screen.getAllByDisplayValue('Lateral')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Remover peça 1' }));
  expect(screen.getAllByDisplayValue('Lateral')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
  expect(screen.getAllByDisplayValue('Lateral')).toHaveLength(2);
});
test('validates individual fields before calling the backend', async () => {
  await ready();
  fireEvent.change(screen.getByLabelText('Largura da peça 1'), {
    target: { value: '0' },
  });
  expect(screen.getByLabelText('Largura da peça 1')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
  expect(screen.getByRole('button', { name: 'Otimizar corte' })).toBeDisabled();
  expect(api.optimizeCutting).not.toHaveBeenCalled();
});
test('backend failure is displayed without a missing-result crash', async () => {
  api.optimizeCutting.mockResolvedValue({
    success: false,
    error: 'Não foi encontrado encaixe',
  });
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Otimizar corte' }));
  expect(
    await screen.findByText('Não foi encontrado encaixe', { exact: false })
  ).toBeInTheDocument();
});
test('keeps computed dimensions and marks plan stale after editing input', async () => {
  await ready();
  await calculate();
  fireEvent.change(screen.getByLabelText('Largura (cm)'), {
    target: { value: '200' },
  });
  expect(screen.getByText('10.0 × 3.0 cm')).toBeInTheDocument();
  expect(screen.getByText('Precisa recalcular')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Selecionar Porta/ }));
  expect(
    screen.getByLabelText('Detalhes da peça selecionada')
  ).toHaveTextContent('Porta');
});
test('keeps previous plan while canceling a new computation', async () => {
  await ready();
  await calculate();
  let finish: (value: any) => void = () => undefined;
  api.optimizeCutting.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  api.cancelOptimization.mockImplementation(async () => {
    finish({ success: false, canceled: true });
    return { success: true };
  });
  fireEvent.click(screen.getByRole('button', { name: 'Otimizar corte' }));
  expect(
    screen.getByRole('button', { name: /Selecionar Porta/ })
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Otimizar corte' })).toBeEnabled()
  );
  expect(api.cancelOptimization).toHaveBeenCalledWith(expect.any(String));
  expect(
    screen.getByRole('button', { name: /Selecionar Porta/ })
  ).toBeInTheDocument();
});
test('opening a project with unsaved changes requires a decision and canceled save keeps current data', async () => {
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do projeto'), {
    target: { value: 'Meu corte' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));
  await waitFor(() => expect(api.saveConfig).toHaveBeenCalled());
  expect(api.loadConfig).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Nome do projeto')).toHaveValue('Meu corte');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('restores draft with stable rows and marks it unsaved', async () => {
  api.loadWorkspace.mockResolvedValue({
    version: 1,
    project: {
      name: 'Recuperado',
      width: '100',
      height: '',
      timeLimit: '60',
      mode: 'fast',
      pieces: [
        {
          id: 'a',
          name: 'Tampa',
          width: '10',
          height: '20',
          quantity: '2',
          rotation: false,
        },
      ],
    },
    result: null,
    calculatedSignature: '',
    savedSignature: 'old',
    filePath: '',
    panelWidth: 540,
  });
  await ready();
  expect(screen.getByLabelText('Nome do projeto')).toHaveValue('Recuperado');
  expect(screen.getByLabelText('Nome da peça 1')).toHaveValue('Tampa');
  expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
  await waitFor(() => expect(api.saveWorkspace).toHaveBeenCalled(), {
    timeout: 1200,
  });
});
test('canceled file dialog does not show an error', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  await waitFor(() => expect(api.loadConfig).toHaveBeenCalled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('menu listener is removed on unmount', async () => {
  const unsubscribe = jest.fn();
  api.onMenuAction = jest.fn(() => unsubscribe);
  const view = render(<App />);
  await waitFor(() => expect(api.loadWorkspace).toHaveBeenCalled());
  await act(async () => view.unmount());
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
