"""
Algoritmo de Otimização de Corte Bidimensional - Versão Inteligente
Usando estratégias avançadas para colocar mais peças
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


class SmartCuttingOptimizer:
    """
    Otimizador de corte bidimensional inteligente
    Usa estratégias avançadas para colocar mais peças
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
    
    def _find_corner_position(self, width: int, height: int) -> Optional[Tuple[int, int]]:
        """Encontra a próxima posição de canto disponível"""
        # Buscar cantos disponíveis
        corners = [(0, 0)]  # Começar pela origem
        
        # Adicionar cantos criados pelas peças já colocadas
        for y in range(self.stock_height):
            for x in range(self.stock_width):
                if self.grid[y, x]:
                    # Verificar cantos adjacentes
                    for dx, dy in [(1, 0), (0, 1), (1, 1)]:
                        corner_x, corner_y = x + dx, y + dy
                        if (corner_x, corner_y) not in corners:
                            corners.append((corner_x, corner_y))
        
        # Tentar colocar a peça em cada canto
        for corner_x, corner_y in corners:
            if self._can_place_piece(corner_x, corner_y, width, height):
                return (corner_x, corner_y)
        
        return None
    
    def _find_best_fit(self, width: int, height: int) -> Optional[Tuple[int, int]]:
        """Encontra a melhor posição usando estratégia de melhor encaixe"""
        best_x, best_y = None, None
        min_waste = float('inf')
        
        # Buscar em uma grade mais espaçada para ser mais rápido
        step = max(1, min(width, height) // 4)
        
        for y in range(0, self.stock_height - height + 1, step):
            for x in range(0, self.stock_width - width + 1, step):
                if self._can_place_piece(x, y, width, height):
                    # Calcular desperdício potencial
                    waste = self._calculate_waste_at_position(x, y, width, height)
                    if waste < min_waste:
                        min_waste = waste
                        best_x, best_y = x, y
        
        return (best_x, best_y) if best_x is not None else None
    
    def _calculate_waste_at_position(self, x: int, y: int, width: int, height: int) -> float:
        """Calcula o desperdício potencial ao colocar uma peça na posição (x, y)"""
        # Simular colocação da peça
        temp_grid = self.grid.copy()
        temp_grid[y:y+height, x:x+width] = True
        
        # Calcular espaços vazios adjacentes
        waste = 0
        for dy in range(max(0, y-1), min(self.stock_height, y+height+1)):
            for dx in range(max(0, x-1), min(self.stock_width, x+width+1)):
                if not temp_grid[dy, dx]:
                    waste += 1
        
        return waste
    
    def _sort_pieces_by_density(self) -> List[Piece]:
        """Ordena as peças por densidade (área/perímetro)"""
        def density_key(piece):
            area = piece.width * piece.height
            perimeter = 2 * (piece.width + piece.height)
            # Densidade = área / perímetro (quanto maior, melhor)
            density = area / perimeter if perimeter > 0 else 0
            return -density  # Ordem decrescente
        
        return sorted(self.pieces, key=density_key)
    
    def _try_multiple_orientations(self, piece: Piece) -> Optional[Tuple[int, int, int, int]]:
        """Tenta colocar uma peça em múltiplas orientações"""
        orientations = [(piece.width, piece.height)]
        
        if self.allow_rotation and piece.width != piece.height:
            orientations.append((piece.height, piece.width))
        
        best_placement = None
        best_score = float('-inf')
        
        for width, height in orientations:
            # Tentar posição de canto primeiro
            position = self._find_corner_position(width, height)
            if position:
                score = self._calculate_placement_score(position[0], position[1], width, height)
                if score > best_score:
                    best_score = score
                    best_placement = (position[0], position[1], width, height)
            
            # Se não encontrou canto, tentar melhor encaixe
            if not best_placement:
                position = self._find_best_fit(width, height)
                if position:
                    score = self._calculate_placement_score(position[0], position[1], width, height)
                    if score > best_score:
                        best_score = score
                        best_placement = (position[0], position[1], width, height)
        
        return best_placement
    
    def _calculate_placement_score(self, x: int, y: int, width: int, height: int) -> float:
        """Calcula o score de uma colocação"""
        score = 0.0
        
        # Preferir posições próximas à origem
        score -= (x + y) * 0.01
        
        # Preferir posições que preenchem cantos
        if x == 0 or y == 0:
            score += 10
        
        # Preferir posições que criam bordas completas
        if x + width == self.stock_width or y + height == self.stock_height:
            score += 5
        
        # Preferir posições que deixam espaços retangulares
        remaining_width = self.stock_width - (x + width)
        remaining_height = self.stock_height - (y + height)
        if remaining_width > 0 and remaining_height > 0:
            score += 2
        
        return score
    
    def optimize(self, time_limit: int = 60) -> CuttingResult:
        """
        Executa a otimização usando estratégias inteligentes
        
        Args:
            time_limit: Limite de tempo em segundos
            
        Returns:
            CuttingResult com os resultados da otimização
        """
        start_time = time.time()
        
        # Resetar grid
        self.grid = np.zeros((self.stock_height, self.stock_width), dtype=bool)
        
        # Ordenar peças por densidade
        sorted_pieces = self._sort_pieces_by_density()
        
        pieces_placed = []
        piece_counts = {}
        
        # Contar peças originais (sem rotação)
        for piece in self.pieces:
            base_id = piece.id.split('_rot')[0]
            if base_id not in piece_counts:
                piece_counts[base_id] = 0
        
        # Tentar colocar cada peça
        for piece in sorted_pieces:
            # Verificar limite de tempo
            if time.time() - start_time > time_limit:
                break
            
            # Verificar quantidade máxima
            base_id = piece.id.split('_rot')[0]
            if piece_counts[base_id] >= piece.quantity:
                continue
            
            # Tentar colocar a peça
            placement = self._try_multiple_orientations(piece)
            
            if placement:
                x, y, width, height = placement
                self._place_piece(x, y, width, height)
                
                pieces_placed.append({
                    'id': piece.id,
                    'x': x,
                    'y': y,
                    'width': width,
                    'height': height,
                    'area': width * height
                })
                
                piece_counts[base_id] += 1
        
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


def create_smart_optimizer_from_dict(config: Dict) -> SmartCuttingOptimizer:
    """
    Cria um otimizador inteligente a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        SmartCuttingOptimizer configurado
    """
    return SmartCuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True)
    )
