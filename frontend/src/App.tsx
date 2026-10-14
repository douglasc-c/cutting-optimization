import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import CuttingVisualizer from './components/CuttingVisualizer';
import Icon from './components/Icon';
import AccountAccess from './components/AccountAccess';
import {
  CutResult,
  Project,
  Recovery,
  newId,
  newPiece,
  newProject,
  signature,
  cutSignature,
  validate,
  toConfig,
  fromConfig,
  validRecovery,
} from './utils/workspace';
import { generateCuttingSvg } from './utils/cuttingSvg';

const recoveryKey = 'cutting-workspace-v1';
const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);
const format = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export default function App() {
  const [project, setProject] = useState<Project>(newProject);
  const [result, setResult] = useState<CutResult | null>(null);
  const [calculatedSignature, setCalculatedSignature] = useState('');
  const [savedSignature, setSavedSignature] = useState('');
  const [filePath, setFilePath] = useState('');
  const [panelWidth, setPanelWidth] = useState(540);
  const [hydrated, setHydrated] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runLimit, setRunLimit] = useState('60');
  const [phase, setPhase] = useState('Preparando o motor de corte');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastExport, setLastExport] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, setPending] = useState<null | 'new' | 'open' | 'close'>(null);
  const [pendingPath, setPendingPath] = useState<string | undefined>();
  const [removed, setRemoved] = useState<{
    row: Project['pieces'][0];
    index: number;
  } | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [accountAllowed, setAccountAllowed] = useState(true);
  const activeJob = useRef('');
  const live = useRef<{
    project: Project;
    recovery: Recovery;
    command: (action: string) => void;
  }>({
    project,
    recovery: {
      version: 1,
      project,
      result: null,
      calculatedSignature: '',
      savedSignature: '',
      filePath: '',
      panelWidth: 540,
    },
    command: () => undefined,
  });
  const workspace = useRef<HTMLElement>(null);
  const errors = validate(project);
  const invalid = Object.keys(errors).length > 0;
  const dirty = hydrated && signature(project) !== savedSignature;
  const stale = !!result && cutSignature(project) !== calculatedSignature;
  const recovery: Recovery = {
    version: 1,
    project,
    result,
    calculatedSignature,
    savedSignature,
    filePath,
    panelWidth,
  };

  const writeRecovery = async (data: Recovery) => {
    if (window.electronAPI?.saveWorkspace) {
      const saved = await window.electronAPI.saveWorkspace(data);
      if (!saved.success)
        throw new Error(saved.error || 'Falha ao salvar recuperação');
    } else localStorage.setItem(recoveryKey, JSON.stringify(data));
  };
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const data = window.electronAPI?.loadWorkspace
          ? await window.electronAPI.loadWorkspace()
          : JSON.parse(localStorage.getItem(recoveryKey) || 'null');
        if (disposed) return;
        if (validRecovery(data)) {
          setProject(data.project);
          setResult(data.result);
          setCalculatedSignature(data.calculatedSignature);
          setSavedSignature(data.savedSignature);
          setFilePath(data.filePath);
          setPanelWidth(Math.max(460, Math.min(800, data.panelWidth)));
          setNotice('Seu último trabalho foi recuperado.');
        } else {
          setSavedSignature(signature(live.current.project));
          if (data)
            setNotice(
              'A recuperação anterior não pôde ser carregada. Seus arquivos salvos continuam disponíveis.'
            );
        }
      } catch (err) {
        if (!disposed) {
          setSavedSignature(signature(live.current.project));
          setNotice(`Recuperação indisponível: ${message(err)}`);
        }
      }
      if (!disposed) setHydrated(true);
    })();
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const timer = setTimeout(() => {
      writeRecovery(recovery)
        .then(() => {
          if (active) setRecoveryStatus('Recuperação automática atualizada');
        })
        .catch(() => {
          if (active)
            setRecoveryStatus('Não foi possível atualizar a recuperação');
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // The recovery snapshot changes with every relevant workspace state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    project,
    result,
    calculatedSignature,
    savedSignature,
    filePath,
    panelWidth,
  ]);
  useEffect(() => {
    window.electronAPI?.setDocumentState?.({
      dirty,
      busy: loading,
      name: project.name,
    });
  }, [dirty, loading, project.name]);
  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(
      () => setElapsed((Date.now() - start) / 1000),
      250
    );
    return () => clearInterval(timer);
  }, [loading]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    window.electronAPI
      ?.getRecentProjects?.()
      .then(setRecent)
      .catch(() => setRecent([]));
    const offAction = window.electronAPI?.onMenuAction?.((action: string) =>
      live.current.command(action)
    );
    const offProgress = window.electronAPI?.onOptimizationProgress?.(
      (data: { jobId: string; phase: string }) => {
        if (data.jobId === activeJob.current) setPhase(data.phase);
      }
    );
    const key = (e: KeyboardEvent) => {
      if (!window.electronAPI?.onMenuAction && (e.ctrlKey || e.metaKey)) {
        const actions: Record<string, string> = {
          s: 'save',
          o: 'open',
          n: 'new',
          Enter: 'optimize',
        };
        if (actions[e.key]) {
          e.preventDefault();
          live.current.command(actions[e.key]);
        }
      }
      if (e.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('keydown', key);
    return () => {
      offAction?.();
      offProgress?.();
      document.removeEventListener('keydown', key);
    };
  }, []);
  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.confirm-dialog');
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPending(null);
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, [pending]);
  const save = async () => {
    if (fileBusy || !hydrated) return false;
    if (invalid) {
      setError('Corrija os campos destacados antes de salvar.');
      return false;
    }
    if (!window.electronAPI) {
      setError('Abra o aplicativo desktop para salvar um arquivo.');
      return false;
    }
    setFileBusy(true);
    try {
      const savingProject = project;
      const saved = await window.electronAPI.saveConfig(
        toConfig(savingProject),
        filePath || undefined
      );
      if (saved.canceled) return false;
      if (!saved.success) throw new Error(saved.error);
      live.current.recovery = {
        ...live.current.recovery,
        filePath: saved.filePath,
        savedSignature: signature(savingProject),
      };
      setFilePath(saved.filePath);
      setSavedSignature(signature(savingProject));
      setNotice('Projeto salvo.');
      setError('');
      window.electronAPI
        .getRecentProjects?.()
        .then(setRecent)
        .catch(() => setRecent([]));
      return true;
    } catch (err) {
      setError(`Não foi possível salvar: ${message(err)}`);
      return false;
    } finally {
      setFileBusy(false);
    }
  };
  const load = async (path?: string) => {
    if (!window.electronAPI) return;
    setFileBusy(true);
    try {
      const loaded = await window.electronAPI.loadConfig(path);
      if (loaded.canceled) return;
      if (!loaded.success) throw new Error(loaded.error);
      const next = fromConfig(loaded.config);
      setProject(next);
      setSavedSignature(signature(next));
      setFilePath(loaded.filePath);
      setResult(null);
      setCalculatedSignature('');
      setRemoved(null);
      setError('');
      setNotice('Projeto aberto.');
      window.electronAPI
        .getRecentProjects?.()
        .then(setRecent)
        .catch(() => setRecent([]));
    } catch (err) {
      setError(`Não foi possível abrir: ${message(err)}`);
    } finally {
      setFileBusy(false);
    }
  };
  const cancel = async () => {
    if (!activeJob.current) return;
    if (!window.electronAPI?.cancelOptimization) {
      setError('O cancelamento não está disponível nesta versão.');
      return;
    }
    setCanceling(true);
    try {
      const stopped = await window.electronAPI.cancelOptimization(
        activeJob.current
      );
      if (!stopped.success) setCanceling(false);
    } catch (err) {
      setCanceling(false);
      setError(`Não foi possível cancelar: ${message(err)}`);
    }
  };
  const optimize = async () => {
    if (loading || fileBusy) return;
    if (invalid) {
      setError('Corrija os campos destacados antes de otimizar.');
      return;
    }
    if (!window.electronAPI) {
      setError('Execute o aplicativo desktop para calcular o corte.');
      return;
    }
    if (!accountAllowed) {
      setError(
        'Valide sua conta e atualize o aplicativo, se solicitado, antes de otimizar.'
      );
      return;
    }
    const snapshot = project;
    const jobId = newId();
    activeJob.current = jobId;
    setLoading(true);
    setCanceling(false);
    setPhase('Preparando o motor de corte');
    setRunLimit(snapshot.timeLimit);
    setError('');
    try {
      const next: CutResult = await window.electronAPI.optimizeCutting(
        toConfig(snapshot),
        jobId
      );
      if (next.canceled) {
        setNotice('Cálculo cancelado. O plano anterior foi mantido.');
        return;
      }
      if (!next.success || !next.result?.pieces_placed?.length)
        throw new Error(
          next.error || 'Não foi encontrado um encaixe para as peças.'
        );
      setResult(next);
      setCalculatedSignature(cutSignature(snapshot));
      setNotice('Plano de corte atualizado.');
    } catch (err) {
      setError(message(err));
    } finally {
      activeJob.current = '';
      setLoading(false);
      setCanceling(false);
    }
  };
  const perform = async (action: 'new' | 'open' | 'close', path?: string) => {
    if (action === 'new') {
      const next = newProject();
      setProject(next);
      setSavedSignature(signature(next));
      setFilePath('');
      setResult(null);
      setCalculatedSignature('');
      setRemoved(null);
      setError('');
    }
    if (action === 'open') await load(path);
    if (action === 'close') {
      if (loading) await cancel();
      try {
        await writeRecovery(live.current.recovery);
        await window.electronAPI?.closeWindow?.();
      } catch (err) {
        setError(`Não foi possível salvar a recuperação: ${message(err)}`);
      }
    }
  };
  const request = (action: 'new' | 'open' | 'close', path?: string) => {
    if (fileBusy || !hydrated || (loading && action !== 'close')) return;
    if (dirty || (loading && action === 'close')) {
      setPending(action);
      setPendingPath(path);
    } else void perform(action, path);
  };
  const command = (action: string) => {
    if (pending) return;
    if (action === 'save') void save();
    else if (action === 'optimize') void optimize();
    else if (action === 'export') {
      if (result) setExportOpen(true);
    } else if (action === 'new' || action === 'open' || action === 'close')
      request(action);
  };
  live.current = { project, recovery, command };
  const exportFile = async (format: 'svg' | 'csv' | 'json') => {
    setExportOpen(false);
    if (!result || !window.electronAPI) return;
    try {
      const saved =
        format === 'svg'
          ? await window.electronAPI.saveSvg(
              generateCuttingSvg(
                result.result.stock_dimensions.width,
                result.result.stock_dimensions.height,
                result.result.pieces_placed
              )
            )
          : await window.electronAPI.exportResults(result, format);
      if (saved.canceled) return;
      if (!saved.success) throw new Error(saved.error);
      setLastExport(saved.filePath || '');
      setNotice(`Arquivo ${format.toUpperCase()} exportado.`);
    } catch (err) {
      setError(`Não foi possível exportar: ${message(err)}`);
    }
  };
  const field = (
    key: 'width' | 'height' | 'timeLimit',
    label: string,
    placeholder?: string
  ) => (
    <label className="field">
      {label}
      <input
        aria-label={label}
        aria-invalid={!!errors[key]}
        type="number"
        step={key === 'timeLimit' ? '1' : '0.1'}
        min={key === 'timeLimit' ? 1 : 0}
        placeholder={placeholder}
        value={project[key]}
        onChange={e => setProject({ ...project, [key]: e.target.value })}
      />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  );
  const pieceCount = project.pieces.reduce(
    (total, p) => total + (Number(p.quantity) || 0),
    0
  );
  const resultCount = result?.result.pieces_placed.length || 0;
  const consumedEfficiency =
    result?.layout_metrics?.consumed_area_efficiency ??
    result?.efficiency_metrics?.area_efficiency ??
    0;
  const resize = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) =>
      setPanelWidth(
        Math.max(
          460,
          Math.min(
            800,
            (workspace.current?.clientWidth || 1200) - 440,
            event.clientX -
              (workspace.current?.getBoundingClientRect().left || 0)
          )
        )
      );
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  };
  return (
    <div className="App">
      <header className="app-toolbar">
        <div className="app-brand">
          <img
            className="brand-logo"
            src={`${process.env.PUBLIC_URL}/branding/logo.png`}
            alt="cutting-optimization"
          />
          <span>Planejamento de corte</span>
        </div>
        <div className="toolbar-actions">
          <button
            disabled={loading || fileBusy || !hydrated}
            onClick={() => request('new')}
          >
            <Icon name="plus" />
            Novo
          </button>
          <button
            disabled={loading || fileBusy || !hydrated}
            onClick={() => request('open')}
          >
            <Icon name="folder" />
            Abrir
          </button>
          <button disabled={fileBusy || !hydrated} onClick={() => void save()}>
            <Icon name="save" />
            Salvar
          </button>
          <div className="export-menu">
            <button
              disabled={!result || fileBusy}
              aria-expanded={exportOpen}
              onClick={() => setExportOpen(!exportOpen)}
            >
              <Icon name="export" />
              Exportar
              <Icon name="chevron" size={14} />
            </button>
            {exportOpen && (
              <div
                className="dropdown"
                role="group"
                aria-label="Formatos de exportação"
              >
                {(['svg', 'csv', 'json'] as const).map(f => (
                  <button key={f} onClick={() => void exportFile(f)}>
                    {f.toUpperCase()}
                    <small>
                      {f === 'svg'
                        ? 'Plano em escala real'
                        : f === 'csv'
                          ? 'Tabela de peças'
                          : 'Dados completos'}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <AccountAccess
        onAccessChanged={setAccountAllowed}
        busy={loading || fileBusy}
      />
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" />
          {notice}
          {lastExport && notice.includes('exportado') && (
            <button
              onClick={() =>
                window.electronAPI?.showExportInFolder?.(lastExport)
              }
            >
              Abrir pasta
            </button>
          )}
          <button aria-label="Fechar aviso" onClick={() => setNotice('')}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <strong>Não foi possível concluir.</strong> {error}
          <button aria-label="Fechar erro" onClick={() => setError('')}>
            <Icon name="close" />
          </button>
        </div>
      )}
      <main
        ref={workspace}
        className="workspace"
        style={{ '--panel-width': `${panelWidth}px` } as React.CSSProperties}
      >
        <section className="config-panel" aria-label="Configuração do corte">
          <div className="panel-heading">
            <span className="eyebrow">PROJETO</span>
            <input
              aria-label="Nome do projeto"
              className="project-name"
              value={project.name}
              onChange={e => setProject({ ...project, name: e.target.value })}
            />
            <span className="file-state">
              {dirty
                ? 'Alterações não salvas'
                : filePath
                  ? 'Arquivo salvo'
                  : 'Novo projeto'}
            </span>
          </div>
          <div className="material-section">
            <h2>Material</h2>
            <div className="material-fields">
              {field('width', 'Largura (cm)')}
              {field('height', 'Altura (cm)', 'Automática')}
            </div>
            <p className="hint">
              Deixe a altura vazia para calcular o comprimento do rolo.
            </p>
          </div>
          <div className="section-heading">
            <div>
              <h2>Peças a cortar</h2>
              <span>
                {project.pieces.length} tipos · {pieceCount} unidades
              </span>
            </div>
            <button
              onClick={() =>
                setProject({
                  ...project,
                  pieces: [...project.pieces, newPiece()],
                })
              }
            >
              <Icon name="plus" />
              Adicionar
            </button>
          </div>
          <div className="pieces-table-wrap">
            <table className="pieces-table">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>
                    Larg.<small>cm</small>
                  </th>
                  <th>
                    Alt.<small>cm</small>
                  </th>
                  <th>Qtd.</th>
                  <th>Girar</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {project.pieces.map((p, index) => (
                  <tr key={p.id}>
                    {(['name', 'width', 'height', 'quantity'] as const).map(
                      key => (
                        <td key={key}>
                          <input
                            aria-label={`${key === 'name' ? 'Nome' : key === 'width' ? 'Largura' : key === 'height' ? 'Altura' : 'Quantidade'} da peça ${index + 1}`}
                            aria-invalid={!!errors[`${p.id}.${key}`]}
                            type={key === 'name' ? 'text' : 'number'}
                            step={key === 'quantity' ? '1' : '0.1'}
                            min={key === 'name' ? undefined : 0}
                            value={p[key]}
                            onChange={e =>
                              setProject({
                                ...project,
                                pieces: project.pieces.map(row =>
                                  row.id === p.id
                                    ? { ...row, [key]: e.target.value }
                                    : row
                                ),
                              })
                            }
                          />
                          {errors[`${p.id}.${key}`] && (
                            <small className="field-error">
                              {errors[`${p.id}.${key}`]}
                            </small>
                          )}
                        </td>
                      )
                    )}
                    <td className="rotation-cell">
                      <input
                        aria-label={`Permitir rotação da peça ${index + 1}`}
                        type="checkbox"
                        checked={p.rotation}
                        onChange={e =>
                          setProject({
                            ...project,
                            pieces: project.pieces.map(row =>
                              row.id === p.id
                                ? { ...row, rotation: e.target.checked }
                                : row
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          title="Duplicar peça"
                          aria-label={`Duplicar peça ${index + 1}`}
                          onClick={() =>
                            setProject({
                              ...project,
                              pieces: [
                                ...project.pieces.slice(0, index + 1),
                                { ...p, id: newId() },
                                ...project.pieces.slice(index + 1),
                              ],
                            })
                          }
                        >
                          <Icon name="copy" size={15} />
                        </button>
                        <button
                          title="Remover peça"
                          aria-label={`Remover peça ${index + 1}`}
                          onClick={() => {
                            setRemoved({ row: p, index });
                            setProject({
                              ...project,
                              pieces: project.pieces.filter(
                                row => row.id !== p.id
                              ),
                            });
                          }}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.pieces && <p className="field-error">{errors.pieces}</p>}
          {removed && (
            <div className="undo-notice">
              Peça removida.
              <button
                onClick={() => {
                  setProject({
                    ...project,
                    pieces: [
                      ...project.pieces.slice(0, removed.index),
                      removed.row,
                      ...project.pieces.slice(removed.index),
                    ],
                  });
                  setRemoved(null);
                }}
              >
                <Icon name="undo" size={14} />
                Desfazer
              </button>
            </div>
          )}
          <details className="advanced">
            <summary>Opções de otimização</summary>
            <div className="material-fields">
              <label className="field">
                Modo
                <select
                  value={project.mode}
                  onChange={e =>
                    setProject({
                      ...project,
                      mode: e.target.value as Project['mode'],
                    })
                  }
                >
                  <option value="fast">Rápido</option>
                  <option value="refined">Refinado</option>
                </select>
              </label>
              {field('timeLimit', 'Tempo máximo (s)')}
            </div>
          </details>
          <div className="optimize-footer">
            {loading ? (
              <>
                <div className="progress-state" role="status">
                  <span className="spinner" />
                  <div>
                    <strong>{canceling ? 'Cancelando…' : phase}</strong>
                    <small>
                      {elapsed.toFixed(1)} s decorridos · limite de busca{' '}
                      {runLimit} s
                    </small>
                  </div>
                </div>
                <button
                  className="cancel-button"
                  disabled={canceling}
                  onClick={() => void cancel()}
                >
                  <Icon name="stop" />
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  disabled={!hydrated || fileBusy || invalid}
                  onClick={() => void optimize()}
                >
                  <Icon name="play" />
                  Otimizar corte
                </button>
                <small>Ctrl/Cmd + Enter</small>
              </>
            )}
          </div>
          {!!recent.length && (
            <details className="recent-projects">
              <summary>Projetos recentes</summary>
              {recent.map(path => (
                <button
                  disabled={loading || fileBusy}
                  key={path}
                  title={path}
                  onClick={() => request('open', path)}
                >
                  <Icon name="folder" size={15} />
                  {path.split(/[\\/]/).pop()}
                </button>
              ))}
            </details>
          )}
        </section>
        <div
          role="separator"
          aria-label="Largura do painel de peças"
          aria-orientation="vertical"
          aria-valuemin={460}
          aria-valuemax={800}
          aria-valuenow={panelWidth}
          tabIndex={0}
          className="panel-divider"
          onPointerDown={resize}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              setPanelWidth(
                Math.max(
                  460,
                  Math.min(800, panelWidth + (e.key === 'ArrowLeft' ? -20 : 20))
                )
              );
            }
          }}
        />
        <section className="plan-panel" aria-label="Plano de corte">
          <div className="plan-heading">
            <div>
              <span className="eyebrow">RESULTADO</span>
              <h1>Plano de corte</h1>
            </div>
            <span className={`result-badge ${stale ? 'stale' : ''}`}>
              {loading
                ? 'Calculando'
                : stale
                  ? 'Precisa recalcular'
                  : result
                    ? 'Atualizado'
                    : 'Aguardando cálculo'}
            </span>
          </div>
          {stale && (
            <div className="stale-banner">
              O cadastro mudou. Este plano corresponde ao cálculo anterior;
              otimize novamente para atualizar.
            </div>
          )}
          {result ? (
            <>
              <div className="metric-grid">
                <div>
                  <span>Comprimento usado</span>
                  <strong>
                    {format(
                      (result.layout_metrics?.used_height ||
                        result.result.stock_dimensions.height) / 10
                    )}
                    <small> cm</small>
                  </strong>
                </div>
                <div>
                  <span>Aproveitamento</span>
                  <strong>
                    {format(consumedEfficiency)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <span>Desperdício consumido</span>
                  <strong>
                    {format(100 - consumedEfficiency)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <span>Peças posicionadas</span>
                  <strong>{resultCount}</strong>
                </div>
              </div>
              <CuttingVisualizer
                stockWidth={result.result.stock_dimensions.width}
                stockHeight={result.result.stock_dimensions.height}
                piecesPlaced={result.result.pieces_placed}
              />
              <details className="technical-details">
                <summary>Detalhes do resultado</summary>
                <dl>
                  <div>
                    <dt>Tempo de cálculo</dt>
                    <dd>{result.result.execution_time.toFixed(2)} s</dd>
                  </div>
                  <div>
                    <dt>Comprimento mínimo comprovado</dt>
                    <dd>
                      {result.result.is_optimal ? 'Sim' : 'Não comprovado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Área das peças</dt>
                    <dd>{format(result.result.used_area / 100)} cm²</dd>
                  </div>
                  <div>
                    <dt>Desperdício da chapa inteira</dt>
                    <dd>{format(result.result.waste_percentage)}%</dd>
                  </div>
                </dl>
              </details>
            </>
          ) : (
            <div className="empty-plan">
              <div className="empty-illustration">
                <span />
                <span />
                <span />
                <span />
              </div>
              <h2>Seu próximo corte começa aqui</h2>
              <p>
                Defina o material, cadastre as peças e clique em{' '}
                <strong>Otimizar corte</strong>. O plano e o aproveitamento
                aparecerão neste espaço.
              </p>
              <span>Medidas em centímetros · Exportação SVG em escala 1:1</span>
            </div>
          )}
        </section>
      </main>
      <footer className="status-bar">
        <span>{recoveryStatus || 'Recuperação automática ativa'}</span>
        <span title={filePath}>
          {filePath ? filePath.split(/[\\/]/).pop() : 'Projeto sem arquivo'}
          {dirty ? ' · não salvo' : ''}
        </span>
      </footer>
      {pending && (
        <div className="modal-backdrop">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {loading ? 'Há um cálculo em andamento' : 'Salvar alterações?'}
            </h2>
            <p>
              {loading
                ? 'Ao fechar, o cálculo será interrompido. Seu cadastro será mantido na recuperação automática.'
                : 'Seu projeto tem alterações que ainda não foram salvas em arquivo.'}
            </p>
            <div className="dialog-actions">
              <button autoFocus onClick={() => setPending(null)}>
                Voltar
              </button>
              <button
                disabled={fileBusy}
                onClick={() => {
                  const action = pending;
                  setPending(null);
                  void perform(action, pendingPath);
                }}
              >
                {pending === 'close'
                  ? 'Fechar sem salvar'
                  : 'Continuar sem salvar'}
              </button>
              {dirty && (
                <button
                  className="primary-button"
                  disabled={fileBusy}
                  onClick={async () => {
                    if (await save()) {
                      const action = pending;
                      setPending(null);
                      void perform(action, pendingPath);
                    }
                  }}
                >
                  Salvar e continuar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
