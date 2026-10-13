import { PlacedPiece } from './cuttingSvg';
export interface PieceRow {
  id: string;
  name: string;
  width: string;
  height: string;
  quantity: string;
  rotation: boolean;
}
export interface Project {
  name: string;
  width: string;
  height: string;
  timeLimit: string;
  mode: 'fast' | 'refined';
  pieces: PieceRow[];
}
export interface CutResult {
  success: boolean;
  error?: string;
  canceled?: boolean;
  algorithm: string;
  result: {
    pieces_placed: PlacedPiece[];
    stock_dimensions: { width: number; height: number };
    used_area: number;
    waste_percentage: number;
    execution_time: number;
    is_optimal: boolean;
  };
  efficiency_metrics?: { area_efficiency: number };
  layout_metrics?: {
    used_height: number;
    consumed_area_efficiency: number;
    consumed_waste_percentage: number;
    lower_bound_height: number;
  };
}
export interface Recovery {
  version: 1;
  project: Project;
  result: CutResult | null;
  calculatedSignature: string;
  savedSignature: string;
  filePath: string;
  panelWidth: number;
}
export const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
export const newPiece = (name = 'Nova peça'): PieceRow => ({
  id: newId(),
  name,
  width: '20',
  height: '30',
  quantity: '1',
  rotation: true,
});
export const newProject = (): Project => ({
  name: 'Projeto sem título',
  width: '100',
  height: '',
  timeLimit: '60',
  mode: 'refined',
  pieces: [
    newPiece('Prancha grande'),
    { ...newPiece('Prancha média'), width: '15', height: '20', quantity: '3' },
  ],
});
export const signature = (project: Project) => JSON.stringify(project);
export const cutSignature = (project: Project) =>
  JSON.stringify({
    ...project,
    name: '',
    pieces: project.pieces.map(p => ({
      name: p.name,
      width: p.width,
      height: p.height,
      quantity: p.quantity,
      rotation: p.rotation,
    })),
  });
export function validate(project: Project) {
  const errors: Record<string, string> = {};
  if (
    !Number.isFinite(Number(project.width)) ||
    Math.round(Number(project.width) * 10) <= 0
  )
    errors.width = 'Informe uma largura maior que zero.';
  if (
    project.height &&
    (!Number.isFinite(Number(project.height)) || Number(project.height) < 0)
  )
    errors.height = 'Use uma altura positiva ou deixe automática.';
  if (
    !Number.isFinite(Number(project.timeLimit)) ||
    Number(project.timeLimit) < 1 ||
    Number(project.timeLimit) > 600
  )
    errors.timeLimit = 'Use entre 1 e 600 segundos.';
  if (!project.pieces.length) errors.pieces = 'Adicione pelo menos uma peça.';
  for (const p of project.pieces) {
    if (!p.name.trim()) errors[`${p.id}.name`] = 'Informe um nome.';
    for (const key of ['width', 'height'] as const) {
      if (
        !Number.isFinite(Number(p[key])) ||
        Math.round(Number(p[key]) * 10) <= 0
      )
        errors[`${p.id}.${key}`] = 'Medida deve ser maior que zero.';
    }
    if (!Number.isInteger(Number(p.quantity)) || Number(p.quantity) < 1)
      errors[`${p.id}.quantity`] = 'Quantidade deve ser um inteiro positivo.';
    if (
      !errors.width &&
      !errors[`${p.id}.width`] &&
      !errors[`${p.id}.height`] &&
      Number(p.width) > Number(project.width) &&
      (!p.rotation || Number(p.height) > Number(project.width))
    )
      errors[`${p.id}.width`] = 'Peça não cabe na largura do material.';
  }
  return errors;
}
export function toConfig(p: Project) {
  return {
    name: p.name,
    stock_width: Math.round(Number(p.width) * 10),
    stock_height: Math.round(Number(p.height) * 10),
    time_limit: Number(p.timeLimit),
    optimization_mode: p.mode,
    pieces: p.pieces.map(row => [
      Math.round(Number(row.width) * 10),
      Math.round(Number(row.height) * 10),
      Number(row.quantity),
      row.rotation,
      row.name,
    ]),
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
export function fromConfig(value: unknown): Project {
  if (
    !record(value) ||
    typeof value.stock_width !== 'number' ||
    !Number.isFinite(value.stock_width) ||
    !Array.isArray(value.pieces)
  )
    throw new Error('O arquivo não contém um projeto de corte válido.');
  const defaultRotation =
    typeof value.allow_rotation === 'boolean' ? value.allow_rotation : true;
  return {
    name: typeof value.name === 'string' ? value.name : 'Projeto importado',
    width: String(value.stock_width / 10),
    height:
      Number(value.stock_height) > 0
        ? String(Number(value.stock_height) / 10)
        : '',
    timeLimit: String(value.time_limit || 60),
    mode: value.optimization_mode === 'fast' ? 'fast' : 'refined',
    pieces: value.pieces.map((p: unknown, i: number) => {
      if (
        !Array.isArray(p) ||
        p.length < 3 ||
        p
          .slice(0, 3)
          .some((n: unknown) => typeof n !== 'number' || !Number.isFinite(n))
      )
        throw new Error('O arquivo contém uma peça inválida.');
      return {
        id: newId(),
        width: String(Number(p[0]) / 10),
        height: String(Number(p[1]) / 10),
        quantity: String(p[2]),
        rotation: typeof p[3] === 'boolean' ? p[3] : defaultRotation,
        name: typeof p[4] === 'string' ? p[4] : `Peça ${i + 1}`,
      };
    }),
  };
}
function validPiece(value: unknown): value is PieceRow {
  return (
    record(value) &&
    ['id', 'name', 'width', 'height', 'quantity'].every(
      k => typeof value[k] === 'string'
    ) &&
    typeof value.rotation === 'boolean'
  );
}
function validResult(value: unknown): boolean {
  if (!record(value) || !value.success || !record(value.result)) return false;
  const r = value.result;
  return (
    record(r.stock_dimensions) &&
    Number(r.stock_dimensions.width) > 0 &&
    Number(r.stock_dimensions.height) > 0 &&
    Array.isArray(r.pieces_placed) &&
    r.pieces_placed.every(
      (p: unknown) =>
        record(p) &&
        typeof p.id === 'string' &&
        ['x', 'y', 'width', 'height', 'area'].every(
          k => typeof p[k] === 'number' && Number.isFinite(p[k])
        )
    ) &&
    ['used_area', 'waste_percentage', 'execution_time'].every(
      k => typeof r[k] === 'number' && Number.isFinite(r[k])
    )
  );
}
export function validRecovery(value: unknown): value is Recovery {
  if (!record(value) || !record(value.project)) return false;
  const p = value.project;
  return (
    value.version === 1 &&
    ['name', 'width', 'height', 'timeLimit'].every(
      k => typeof p[k] === 'string'
    ) &&
    (p.mode === 'fast' || p.mode === 'refined') &&
    Array.isArray(p.pieces) &&
    p.pieces.every(validPiece) &&
    new Set(p.pieces.map(row => row.id)).size === p.pieces.length &&
    typeof value.calculatedSignature === 'string' &&
    typeof value.savedSignature === 'string' &&
    typeof value.filePath === 'string' &&
    typeof value.panelWidth === 'number' &&
    Number.isFinite(value.panelWidth) &&
    (value.result === null || validResult(value.result))
  );
}
