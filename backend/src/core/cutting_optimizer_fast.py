from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import time
import random

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
    used_height: int

class FastCuttingOptimizer:
    """
    Otimizador focado no aproveitamento máximo e compactação horizontal no topo.
    Executa buscas contínuas até esgotar as possibilidades de melhoria.
    """
    
    def __init__(self, stock_width: int, stock_height: int, 
                 pieces: List[Tuple[int, int, int]], 
                 allow_rotation: bool = True):
        self.stock_width = stock_width
        self.stock_height = stock_height
        self.allow_rotation = allow_rotation
        
        # Desenrola a lista de peças baseada na quantidade
        self.flat_pieces = []
        for i, (width, height, quantity) in enumerate(pieces):
            for q in range(quantity):
                self.flat_pieces.append({
                    'base_id': f"piece_{i}_{q}",
                    'w': width,
                    'h': height
                })
        
        self.stock_area = stock_width * stock_height

    def _build_grasp_sequence(self, alpha: float) -> List[Dict]:
        """Monta uma sequência GRASP com viés para peças maiores."""
        candidates = list(self.flat_pieces)
        sequence: List[Dict] = []

        while candidates:
            weights = []
            for candidate in candidates:
                area = candidate['w'] * candidate['h']
                weights.append(max(1.0, float(area) ** alpha))

            chosen_index = random.choices(range(len(candidates)), weights=weights, k=1)[0]
            sequence.append(candidates.pop(chosen_index))

        return sequence

    def _simulate_skyline_placement(self, pieces_sequence: List[Dict]) -> Tuple[List[Dict], int]:
        """
        Posiciona as peças usando a estratégia de Skyline (fundo plano/perfil).
        Garante alinhamento horizontal superior e empacotamento denso.
        """
        # Inicializa o horizonte (skyline): x, y, largura
        skyline = [{'x': 0, 'y': 0, 'w': self.stock_width}]
        placed_pieces = []
        max_height_reached = 0

        for p in pieces_sequence:
            w, h = p['w'], p['h']
            best_skyline_idx = -1
            best_y = float('inf')
            best_x = 0
            chosen_w, chosen_h = w, h
            chosen_id = p['base_id']

            # Testar orientações (Normal e Rotacionada se permitido)
            orientations = [(w, h, p['base_id'])]
            if self.allow_rotation and w != h:
                orientations.append((h, w, f"{p['base_id']}_rot"))

            for ow, oh, oid in orientations:
                if ow > self.stock_width:
                    continue

                for i, segment in enumerate(skyline):
                    x_start = segment['x']
                    if x_start + ow > self.stock_width:
                        continue

                    # Encontrar a altura máxima (Y) necessária para cobrir a largura desta peça
                    current_y = segment['y']
                    width_checked = 0
                    j = i
                    possible = True
                    
                    while width_checked < ow and j < len(skyline):
                        current_y = max(current_y, skyline[j]['y'])
                        width_checked += skyline[j]['w']
                        j += 1
                    
                    if width_checked < ow:
                        possible = False

                    if possible and current_y + oh <= self.stock_height:
                        # Prioridade absoluta para o menor Y (mais próximo do topo)
                        if current_y < best_y:
                            best_y = current_y
                            best_x = x_start
                            best_skyline_idx = i
                            chosen_w, chosen_h = ow, oh
                            chosen_id = oid

            # Se achou uma posição válida na chapa
            if best_skyline_idx != -1:
                placed_pieces.append({
                    'id': chosen_id,
                    'x': best_x,
                    'y': best_y,
                    'width': chosen_w,
                    'height': chosen_h,
                    'area': chosen_w * chosen_h
                })
                
                max_height_reached = max(max_height_reached, best_y + chosen_h)

                # Atualizar o Skyline
                new_segment = {'x': best_x, 'y': best_y + chosen_h, 'w': chosen_w}
                
                remaining_w = chosen_w
                idx = best_skyline_idx
                while remaining_w > 0 and idx < len(skyline):
                    seg = skyline[idx]
                    if seg['w'] <= remaining_w:
                        remaining_w -= seg['w']
                        skyline.pop(idx)
                    else:
                        seg['x'] += remaining_w
                        seg['w'] -= remaining_w
                        remaining_w = 0
                
                skyline.insert(best_skyline_idx, new_segment)

                # Mesclar segmentos adjacentes com mesma altura
                k = 0
                while k < len(skyline) - 1:
                    if skyline[k]['y'] == skyline[k+1]['y']:
                        skyline[k]['w'] += skyline[k+1]['w']
                        skyline.pop(k+1)
                    else:
                        k += 1

        return placed_pieces, max_height_reached

    def optimize(
        self,
        time_limit: int = 30,
        optimization_mode: str = 'refined',
        max_attempts_without_improvement: Optional[int] = None
    ) -> CuttingResult:
        """
        Executa a otimização buscando o melhor aproveitamento absoluto.
        Para quando atinge o limite de tentativas sem nenhuma melhoria no layout.
        """
        start_time = time.time()
        deadline_ts = start_time + max(1, int(time_limit))
        
        best_pieces_placed = []
        best_height = float('inf')
        best_used_area = 0
        
        if not self.flat_pieces:
            return CuttingResult([], 1, 100.0, 0.0, False, self.stock_area, 0, 0)

        attempts = 0

        # O loop principal roda continuamente até esgotar o limite de tempo.
        while time.time() < deadline_ts:
            attempts += 1
            
            # Heurísticas determinísticas iniciais
            if attempts == 1:
                current_sequence = sorted(self.flat_pieces, key=lambda p: (p['w'], p['h']), reverse=True)
            elif attempts == 2:
                current_sequence = sorted(self.flat_pieces, key=lambda p: p['w'] * p['h'], reverse=True)
            elif attempts == 3:
                current_sequence = sorted(self.flat_pieces, key=lambda p: (p['h'], p['w']), reverse=True)
            else:
                # GRASP controlado: peças maiores tendem a entrar primeiro, sem ordem fixa.
                alpha = 1.15 if optimization_mode == 'fast' else 1.35
                current_sequence = self._build_grasp_sequence(alpha)

            # Simular posicionamento
            placed, max_h = self._simulate_skyline_placement(current_sequence)
            
            # Critério de validação: Garante que TODAS as peças couberam
            if len(placed) == len(self.flat_pieces):
                # Se a altura máxima encontrada for menor que a melhor atual, salvamos
                if max_h < best_height:
                    best_height = max_h
                    best_pieces_placed = placed
                    best_used_area = sum(p['area'] for p in placed)
                elif max_h == best_height:
                    current_used_area = sum(p['area'] for p in placed)
                    if current_used_area > best_used_area:
                        best_pieces_placed = placed
                        best_used_area = current_used_area

        execution_time = time.time() - start_time
        if best_height == float('inf'):
            best_height = 0
        waste_percentage = ((self.stock_area - best_used_area) / self.stock_area) * 100
        
        return CuttingResult(
            pieces_placed=best_pieces_placed,
            stock_used=1,
            waste_percentage=waste_percentage,
            execution_time=execution_time,
            is_optimal=False,
            total_area=self.stock_area,
            used_area=best_used_area,
            used_height=int(best_height)
        )

    def get_statistics(self) -> Dict:
        """Retorna estatísticas básicas do problema para a API."""
        total_piece_area = sum(piece['w'] * piece['h'] for piece in self.flat_pieces)
        total_pieces = len(self.flat_pieces)
        return {
            'stock_dimensions': (self.stock_width, self.stock_height),
            'stock_area': self.stock_area,
            'total_pieces': total_pieces,
            'total_piece_area': total_piece_area,
            'theoretical_waste': ((self.stock_area - total_piece_area) / self.stock_area) * 100 if self.stock_area > 0 else 0.0,
            'allow_rotation': self.allow_rotation,
            'guillotine_cut': False
        }


# Alias de compatibilidade com versões anteriores.
BestCuttingOptimizer = FastCuttingOptimizer