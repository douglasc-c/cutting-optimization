"""
Algoritmo de Otimização de Corte Bidimensional - Versão Ultra-Rápida
Usando heurísticas simplificadas para máxima velocidade
"""

import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import time


@dataclass
class Piece:
    """Representa uma peça a ser cortada"""
    width: int
    height: int
    quantity: int
    id: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = f"piece_{self.width}x{self.height}"


@dataclass
class CuttingResult:
    """Resultado da otimização de corte"""
    pieces_placed: List[Dict]
    stock_used: int
    waste_percentage: float
    execution_time: float
    is_optimal: bool
    total_area: int
    used_area: int


class FastCuttingOptimizer:
    """
    Otimizador de corte bidimensional ultra-rápido
    """
    
    def __init__(self, stock_width: int, stock_height: int, 
                 pieces: List[Tuple[int, int, int]], 
                 allow_rotation: bool = True):
        """
        Inicializa o otimizador
        
        Args:
            stock_width: Largura do material base
            stock_height: Altura do material base
            pieces: Lista de peças (largura, altura, quantidade)
            allow_rotation: Permite rotação das peças
        """
        self.stock_width = stock_width
        self.stock_height = stock_height
        self.allow_rotation = allow_rotation
        
        # Converter peças para objetos Piece
        self.pieces = []
        for i, (width, height, quantity) in enumerate(pieces):
            self.pieces.append(Piece(width, height, quantity, f"piece_{i}"))
            if allow_rotation and width != height:
                # Adicionar versão rotacionada
                self.pieces.append(Piece(height, width, quantity, f"piece_{i}_rot"))
        
        self.total_pieces = sum(piece.quantity for piece in self.pieces)
        self.stock_area = stock_width * stock_height
        
        # Criar grid para representar o material
        self.grid = np.zeros((stock_height, stock_width), dtype=bool)
    
    def _can_place_piece(self, x: int, y: int, width: int, height: int) -> bool:
        """Verifica se uma peça pode ser colocada na posição (x, y)"""
        if x + width > self.stock_width or y + height > self.stock_height:
            return False
        
        # Verificar se a área está livre
        return not np.any(self.grid[y:y+height, x:x+width])
    
    def _place_piece(self, x: int, y: int, width: int, height: int) -> None:
        """Coloca uma peça na posição (x, y)"""
        self.grid[y:y+height, x:x+width] = True
    
    def _find_next_position(
        self,
        width: int,
        height: int,
        deadline_ts: Optional[float] = None,
        scan_step: int = 1
    ) -> Optional[Tuple[int, int]]:
        """Encontra a próxima posição disponível usando busca simples"""
        max_y = self.stock_height - height + 1
        max_x = self.stock_width - width + 1
        if max_y <= 0 or max_x <= 0:
            return None

        step = max(1, scan_step)

        # Busca simples: linha por linha, coluna por coluna.
        # A cada poucas iterações, verificamos deadline para evitar travar a UI.
        checks = 0
        for y in range(0, max_y, step):
            for x in range(0, max_x, step):
                checks += 1
                if deadline_ts and checks % 256 == 0 and time.time() >= deadline_ts:
                    return None
                if self._can_place_piece(x, y, width, height):
                    return (x, y)

        # Se usamos varredura mais grossa, fazemos uma segunda chance fina.
        if step > 1:
            for y in range(max_y):
                for x in range(max_x):
                    checks += 1
                    if deadline_ts and checks % 256 == 0 and time.time() >= deadline_ts:
                        return None
                    if self._can_place_piece(x, y, width, height):
                        return (x, y)

        return None
    
    def _sort_pieces_by_area(self) -> List[Piece]:
        """Ordena as peças por área (maior primeiro)"""
        return sorted(self.pieces, key=lambda p: p.width * p.height, reverse=True)

    def _compact_upward(self, pieces_placed: List[Dict]) -> List[Dict]:
        """Compacta peças para cima, removendo vazios verticais sem gerar colisões."""
        if not pieces_placed:
            return pieces_placed

        compacted: List[Dict] = []
        for piece in sorted(pieces_placed, key=lambda p: (p['y'], p['x'])):
            x1 = piece['x']
            x2 = piece['x'] + piece['width']
            new_y = 0

            for other in compacted:
                ox1 = other['x']
                ox2 = other['x'] + other['width']
                # Se sobrepõe em x, não pode atravessar essa peça em y.
                if not (x2 <= ox1 or x1 >= ox2):
                    new_y = max(new_y, other['y'] + other['height'])

            new_piece = dict(piece)
            new_piece['y'] = new_y
            compacted.append(new_piece)

        return compacted

    def _reorder_rows_by_fill(self, pieces_placed: List[Dict]) -> List[Dict]:
        """Ordena as faixas por ocupação horizontal (maior no topo, menor no fundo)."""
        if not pieces_placed:
            return pieces_placed

        rows: Dict[int, List[Dict]] = {}
        for piece in pieces_placed:
            rows.setdefault(piece['y'], []).append(piece)

        row_meta = []
        for y, row_pieces in rows.items():
            row_height = max(piece['height'] for piece in row_pieces)
            used_width = sum(piece['width'] for piece in row_pieces)
            fill_ratio = used_width / self.stock_width if self.stock_width > 0 else 0.0
            row_meta.append((y, row_pieces, row_height, fill_ratio))

        # Maior ocupação primeiro, depois menor altura para estabilizar ordem.
        row_meta.sort(key=lambda item: (-item[3], item[2], item[0]))

        remapped: List[Dict] = []
        current_y = 0
        for _, row_pieces, row_height, _ in row_meta:
            for piece in sorted(row_pieces, key=lambda p: p['x']):
                new_piece = dict(piece)
                new_piece['y'] = current_y
                remapped.append(new_piece)
            current_y += row_height

        return remapped

    def _refine_layout_locally(self, pieces_placed: List[Dict], deadline_ts: float) -> List[Dict]:
        """Refina o layout peça a peça, tentando reposicionar itens em pontos candidatos."""
        if not pieces_placed:
            return pieces_placed

        def overlaps(placed_list: List[Dict], x: int, y: int, width: int, height: int, skip_index: Optional[int] = None) -> bool:
            x2 = x + width
            y2 = y + height
            for index, placed in enumerate(placed_list):
                if skip_index is not None and index == skip_index:
                    continue
                px1 = placed['x']
                py1 = placed['y']
                px2 = px1 + placed['width']
                py2 = py1 + placed['height']
                if x < px2 and x2 > px1 and y < py2 and y2 > py1:
                    return True
            return False

        def layout_score(placed_list: List[Dict]) -> tuple:
            if not placed_list:
                return (0, 0, 0, 0)
            used_height = max(piece['y'] + piece['height'] for piece in placed_list)
            used_width = max(piece['x'] + piece['width'] for piece in placed_list)
            area = sum(piece['area'] for piece in placed_list)
            return (
                used_height,
                self.stock_width * used_height - area,
                used_width,
                -area
            )

        def candidate_points_for(placed_list: List[Dict], skip_index: Optional[int] = None) -> List[Tuple[int, int]]:
            points = {(0, 0)}
            for other_index, other in enumerate(placed_list):
                if skip_index is not None and other_index == skip_index:
                    continue
                points.add((other['x'] + other['width'], other['y']))
                points.add((other['x'], other['y'] + other['height']))
            return sorted(
                [
                    (x, y)
                    for x, y in points
                    if 0 <= x < self.stock_width and 0 <= y < self.stock_height
                ],
                key=lambda pt: (pt[1], pt[0])
            )

        refined = [dict(piece) for piece in pieces_placed]
        best_score = layout_score(refined)
        max_passes = 3

        for _ in range(max_passes):
            if time.time() >= deadline_ts:
                break

            improved = False
            # Tenta mover peças maiores primeiro, pois costumam gerar mais impacto no layout.
            order = sorted(range(len(refined)), key=lambda idx: refined[idx]['width'] * refined[idx]['height'], reverse=True)

            for index in order:
                if time.time() >= deadline_ts:
                    break

                original_piece = refined[index]
                piece_candidates = [
                    (original_piece['width'], original_piece['height'], original_piece['id'])
                ]
                if self.allow_rotation and original_piece['width'] != original_piece['height']:
                    piece_candidates.append((original_piece['height'], original_piece['width'], original_piece['id']))

                # Remove a peça temporariamente para procurar um encaixe melhor ao redor dos outros.
                for width, height, piece_id in piece_candidates:
                    candidate_points = {(0, 0)}
                    for other_index, other in enumerate(refined):
                        if other_index == index:
                            continue
                        candidate_points.add((other['x'] + other['width'], other['y']))
                        candidate_points.add((other['x'], other['y'] + other['height']))

                    candidate_points = [
                        (x, y)
                        for x, y in candidate_points
                        if 0 <= x <= self.stock_width - width and 0 <= y <= self.stock_height - height
                    ]
                    candidate_points.sort(key=lambda pt: (pt[1], pt[0]))

                    best_candidate = None
                    for x, y in candidate_points:
                        if overlaps(refined, x, y, width, height, skip_index=index):
                            continue

                        trial = [dict(piece) for piece in refined]
                        trial[index] = {
                            'id': piece_id,
                            'x': x,
                            'y': y,
                            'width': width,
                            'height': height,
                            'area': width * height,
                            'description': original_piece.get('description', piece_id)
                        }

                        score = layout_score(trial)
                        if best_candidate is None or score < best_candidate[0]:
                            best_candidate = (score, trial[index])

                    if best_candidate and best_candidate[0] < best_score:
                        refined[index] = best_candidate[1]
                        best_score = best_candidate[0]
                        improved = True
                        break

            if not improved:
                break

        refined = self._compact_upward(refined)

        # Passo extra: tenta trocar peças grandes por posições melhores abertas pelas menores.
        if time.time() < deadline_ts:
            for _ in range(2):
                if time.time() >= deadline_ts:
                    break

                best_swap = None
                order = sorted(range(len(refined)), key=lambda idx: refined[idx]['width'] * refined[idx]['height'], reverse=True)

                for large_index in order[: min(4, len(order))]:
                    if time.time() >= deadline_ts:
                        break

                    large_piece = refined[large_index]
                    large_area = large_piece['width'] * large_piece['height']
                    small_order = sorted(
                        range(len(refined)),
                        key=lambda idx: refined[idx]['width'] * refined[idx]['height']
                    )[: min(4, len(refined))]

                    for small_index in small_order:
                        if small_index == large_index:
                            continue
                        small_piece = refined[small_index]

                        # Tenta trocar o lugar da peça grande com um ponto candidato criado pela pequena.
                        for width, height in [
                            (large_piece['width'], large_piece['height']),
                            (large_piece['height'], large_piece['width']) if self.allow_rotation and large_piece['width'] != large_piece['height'] else (large_piece['width'], large_piece['height'])
                        ]:
                            for x, y in candidate_points_for(refined, skip_index=large_index):
                                if x + width > self.stock_width or y + height > self.stock_height:
                                    continue
                                if overlaps(refined, x, y, width, height, skip_index=large_index):
                                    continue

                                trial = [dict(piece) for piece in refined]
                                trial[large_index] = {
                                    'id': large_piece['id'],
                                    'x': x,
                                    'y': y,
                                    'width': width,
                                    'height': height,
                                    'area': width * height,
                                    'description': large_piece.get('description', large_piece['id'])
                                }

                                score = layout_score(trial)
                                if best_swap is None or score < best_swap[0]:
                                    best_swap = (score, trial)

                if best_swap and best_swap[0] < layout_score(refined):
                    refined = best_swap[1]
                    refined = self._compact_upward(refined)
                else:
                    break

        return refined

    def _optimize_greedy_layout(self, deadline_ts: float) -> List[Dict]:
        """Caminho rápido: primeira posição válida para cada peça, sem refinamento pesado."""
        families: Dict[str, Dict] = {}
        for piece in self.pieces:
            base_id = piece.id.split('_rot')[0]
            if base_id not in families:
                families[base_id] = {
                    'quantity': int(piece.quantity),
                    'remaining': int(piece.quantity),
                    'candidates': []
                }

            candidate = (piece.id, piece.width, piece.height)
            if candidate not in families[base_id]['candidates']:
                families[base_id]['candidates'].append(candidate)

        placed: List[Dict] = []
        candidate_points = {(0, 0)}

        def overlaps(x: int, y: int, width: int, height: int) -> bool:
            x2 = x + width
            y2 = y + height
            for piece in placed:
                px1 = piece['x']
                py1 = piece['y']
                px2 = px1 + piece['width']
                py2 = py1 + piece['height']
                if x < px2 and x2 > px1 and y < py2 and y2 > py1:
                    return True
            return False

        while time.time() < deadline_ts:
            if all(data['remaining'] <= 0 for data in families.values()):
                break

            points = sorted(
                [pt for pt in candidate_points if 0 <= pt[0] < self.stock_width and 0 <= pt[1] < self.stock_height],
                key=lambda pt: (pt[1], pt[0])
            )
            if not points:
                break

            placed_this_round = False

            for x, y in points:
                if time.time() >= deadline_ts:
                    break

                for base_id, family in families.items():
                    if family['remaining'] <= 0:
                        continue

                    options = sorted(family['candidates'], key=lambda c: (c[1] * c[2], c[1], c[2]), reverse=True)
                    for piece_id, width, height in options:
                        if x + width > self.stock_width or y + height > self.stock_height:
                            continue
                        if overlaps(x, y, width, height):
                            continue

                        placed.append({
                            'id': piece_id,
                            'x': x,
                            'y': y,
                            'width': width,
                            'height': height,
                            'area': width * height
                        })
                        family['remaining'] -= 1
                        candidate_points.add((x + width, y))
                        candidate_points.add((x, y + height))
                        placed_this_round = True
                        break

                    if placed_this_round:
                        break

                if placed_this_round:
                    break

            if not placed_this_round:
                break

        return self._compact_upward(placed)

    def _optimize_with_shelves(self, deadline_ts: float, refine_layout: bool = True) -> List[Dict]:
        """Heurística peça a peça com busca de melhor encaixe (não baseada em linhas)."""
        if not refine_layout:
            return self._optimize_greedy_layout(deadline_ts)

        families: Dict[str, Dict] = {}
        for piece in self.pieces:
            base_id = piece.id.split('_rot')[0]
            if base_id not in families:
                families[base_id] = {
                    'quantity': int(piece.quantity),
                    'remaining': int(piece.quantity),
                    'candidates': []
                }

            candidate = (piece.id, piece.width, piece.height)
            if candidate not in families[base_id]['candidates']:
                families[base_id]['candidates'].append(candidate)

        def overlaps(placed_list: List[Dict], x: int, y: int, width: int, height: int) -> bool:
            x2 = x + width
            y2 = y + height
            for placed in placed_list:
                px1 = placed['x']
                py1 = placed['y']
                px2 = px1 + placed['width']
                py2 = py1 + placed['height']
                if x < px2 and x2 > px1 and y < py2 and y2 > py1:
                    return True
            return False

        def contact_score(placed_list: List[Dict], x: int, y: int, width: int, height: int) -> int:
            score = 0
            x2 = x + width
            y2 = y + height

            # Contato com bordas favorece layouts mais "colados" e menos fragmentados.
            if x == 0:
                score += height
            if y == 0:
                score += width
            if x2 == self.stock_width:
                score += height
            if y2 == self.stock_height:
                score += width

            for placed in placed_list:
                px1 = placed['x']
                py1 = placed['y']
                px2 = px1 + placed['width']
                py2 = py1 + placed['height']

                # Contato lateral
                if x2 == px1 or x == px2:
                    overlap_len = min(y2, py2) - max(y, py1)
                    if overlap_len > 0:
                        score += overlap_len

                # Contato vertical
                if y2 == py1 or y == py2:
                    overlap_len = min(x2, px2) - max(x, px1)
                    if overlap_len > 0:
                        score += overlap_len

            return score

        best_layout: List[Dict] = []
        best_key = None
        max_attempts = 8 if refine_layout else 3

        for attempt in range(max_attempts):
            if time.time() >= deadline_ts:
                break

            remaining = {
                base_id: {
                    'remaining': int(family['quantity']),
                    'candidates': list(family['candidates'])
                }
                for base_id, family in families.items()
            }

            placed: List[Dict] = []
            candidate_points = {(0, 0)}
            used_height = 0

            while True:
                if time.time() >= deadline_ts:
                    break
                if all(data['remaining'] <= 0 for data in remaining.values()):
                    break

                # Mantém pontos úteis e ordenados bottom-left.
                filtered_points = [
                    (x, y)
                    for x, y in candidate_points
                    if 0 <= x < self.stock_width and 0 <= y < self.stock_height
                ]
                filtered_points.sort(key=lambda pt: (pt[1], pt[0]))

                if not filtered_points:
                    break

                best_move = None

                for x, y in filtered_points:
                    for base_id, data in remaining.items():
                        if data['remaining'] <= 0:
                            continue

                        options = list(data['candidates'])
                        # Alterna priorização para escapar de mínimos locais.
                        if attempt % 2 == 0:
                            options.sort(key=lambda c: (c[1], c[1] * c[2]), reverse=True)
                        else:
                            options.sort(key=lambda c: (c[1] * c[2], c[2], c[1]), reverse=True)

                        for piece_id, width, height in options:
                            if x + width > self.stock_width or y + height > self.stock_height:
                                continue
                            if overlaps(placed, x, y, width, height):
                                continue

                            projected_height = max(used_height, y + height)
                            row_slack = self.stock_width - (x + width)
                            orient_penalty = max(0, height - width)
                            contact = contact_score(placed, x, y, width, height)

                            # Menor altura projetada, melhor uso horizontal e mais contato.
                            score = (
                                projected_height,
                                row_slack + orient_penalty,
                                -contact,
                                y,
                                x,
                                -(width * height)
                            )

                            if best_move is None or score < best_move[0]:
                                best_move = (score, base_id, piece_id, x, y, width, height)

                if best_move is None:
                    break

                _, base_id, piece_id, x, y, width, height = best_move
                placed.append({
                    'id': piece_id,
                    'x': x,
                    'y': y,
                    'width': width,
                    'height': height,
                    'area': width * height
                })
                remaining[base_id]['remaining'] -= 1
                used_height = max(used_height, y + height)

                candidate_points.add((x + width, y))
                candidate_points.add((x, y + height))

            compacted = self._compact_upward(placed)

            # Passo de fechamento: tenta encaixar peças restantes com busca em grid.
            # Mantém a estratégia peça-a-peça, mas evita perder peça por mínimo local.
            self.grid = np.zeros((self.stock_height, self.stock_width), dtype=bool)
            for piece in compacted:
                self._place_piece(piece['x'], piece['y'], piece['width'], piece['height'])

            for base_id, data in remaining.items():
                while data['remaining'] > 0 and time.time() < deadline_ts:
                    best_grid_move = None
                    for piece_id, width, height in data['candidates']:
                        pos = self._find_next_position(
                            width,
                            height,
                            deadline_ts=deadline_ts,
                            scan_step=2
                        )
                        if not pos:
                            continue

                        x, y = pos
                        score = (y, x, -(width * height))
                        if best_grid_move is None or score < best_grid_move[0]:
                            best_grid_move = (score, piece_id, x, y, width, height)

                    if best_grid_move is None:
                        break

                    _, piece_id, x, y, width, height = best_grid_move
                    self._place_piece(x, y, width, height)
                    compacted.append({
                        'id': piece_id,
                        'x': x,
                        'y': y,
                        'width': width,
                        'height': height,
                        'area': width * height
                    })
                    data['remaining'] -= 1

            compacted = self._compact_upward(compacted)
            placed_count = len(compacted)
            if compacted:
                used_height_compacted = max(piece['y'] + piece['height'] for piece in compacted)
                used_area = sum(piece['area'] for piece in compacted)
                bbox_area = self.stock_width * used_height_compacted
                bbox_waste = bbox_area - used_area
            else:
                used_height_compacted = 0
                bbox_waste = self.stock_width * self.stock_height

            attempt_key = (
                -placed_count,
                used_height_compacted,
                bbox_waste
            )

            if best_key is None or attempt_key < best_key:
                best_key = attempt_key
                best_layout = compacted

        return self._refine_layout_locally(best_layout, deadline_ts) if refine_layout else best_layout
    
    def optimize(self, time_limit: int = 30, optimization_mode: str = 'refined') -> CuttingResult:
        """
        Executa a otimização usando heurísticas ultra-rápidas
        
        Args:
            time_limit: Limite de tempo em segundos
            
        Returns:
            CuttingResult com os resultados da otimização
        """
        start_time = time.time()
        deadline_ts = start_time + max(1, int(time_limit))
        
        # Resetar grid
        self.grid = np.zeros((self.stock_height, self.stock_width), dtype=bool)
        
        # Ordenar peças por área
        sorted_pieces = self._sort_pieces_by_area()
        
        pieces_placed = []
        piece_counts = {}
        
        # Contar peças originais (sem rotação)
        for piece in self.pieces:
            base_id = piece.id.split('_rot')[0]
            if base_id not in piece_counts:
                piece_counts[base_id] = 0
        
        # Em materiais muito grandes, usar prateleiras é mais rápido e estável.
        stock_area = self.stock_width * self.stock_height
        refine_layout = optimization_mode != 'fast'

        if stock_area > 2_000_000:
            pieces_placed = self._optimize_with_shelves(deadline_ts, refine_layout=refine_layout)
        else:
            # Em materiais pequenos, manter busca em grid com passo adaptativo.
            if stock_area > 1_000_000:
                scan_step = 2
            else:
                scan_step = 1

            # Tentar colocar cada peça (respeitando quantidade)
            for piece in sorted_pieces:
                # Verificar limite de tempo
                if time.time() >= deadline_ts:
                    break
                
                # Verificar quantidade máxima
                base_id = piece.id.split('_rot')[0]
                if piece_counts[base_id] >= piece.quantity:
                    continue

                while piece_counts[base_id] < piece.quantity:
                    if time.time() >= deadline_ts:
                        break

                    # Tentar colocar a peça
                    position = self._find_next_position(
                        piece.width,
                        piece.height,
                        deadline_ts=deadline_ts,
                        scan_step=scan_step
                    )

                    if time.time() >= deadline_ts:
                        break

                    # Sem posição para esta orientação nesse estado atual do grid.
                    if not position:
                        break

                    x, y = position
                    self._place_piece(x, y, piece.width, piece.height)

                    pieces_placed.append({
                        'id': piece.id,
                        'x': x,
                        'y': y,
                        'width': piece.width,
                        'height': piece.height,
                        'area': piece.width * piece.height
                    })

                    piece_counts[base_id] += 1

            pieces_placed = self._compact_upward(pieces_placed)

            if refine_layout:
                pieces_placed = self._refine_layout_locally(pieces_placed, deadline_ts)
        
        execution_time = time.time() - start_time
        
        # Calcular resultados
        used_area = sum(piece['area'] for piece in pieces_placed)
        waste_percentage = ((self.stock_area - used_area) / self.stock_area) * 100
        
        return CuttingResult(
            pieces_placed=pieces_placed,
            stock_used=1,
            waste_percentage=waste_percentage,
            execution_time=execution_time,
            is_optimal=False,  # Heurística não garante otimalidade
            total_area=self.stock_area,
            used_area=used_area
        )
    
    def get_statistics(self) -> Dict:
        """Retorna estatísticas do problema"""
        total_piece_area = sum(piece.width * piece.height * piece.quantity 
                              for piece in self.pieces)
        
        return {
            'stock_dimensions': (self.stock_width, self.stock_height),
            'stock_area': self.stock_area,
            'total_pieces': self.total_pieces,
            'total_piece_area': total_piece_area,
            'theoretical_waste': ((self.stock_area - total_piece_area) / self.stock_area) * 100,
            'allow_rotation': self.allow_rotation,
            'guillotine_cut': False
        }


def create_fast_optimizer_from_dict(config: Dict) -> FastCuttingOptimizer:
    """
    Cria um otimizador rápido a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        FastCuttingOptimizer configurado
    """
    return FastCuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True)
    )
