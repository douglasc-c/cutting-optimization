"""
Algoritmo de Otimização de Corte Bidimensional - Versão Melhorada
Foca em colocar mais peças na mesma área
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


class ImprovedCuttingOptimizer:
    """
    Otimizador de corte bidimensional melhorado
    Foca em colocar mais peças na mesma área
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
    
    def _find_best_position(self, width: int, height: int) -> Optional[Tuple[int, int]]:
        """Encontra a melhor posição para uma peça usando heurísticas avançadas"""
        best_x, best_y = None, None
        best_score = float('-inf')
        
        # Tentar diferentes posições
        for y in range(self.stock_height - height + 1):
            for x in range(self.stock_width - width + 1):
                if self._can_place_piece(x, y, width, height):
                    # Calcular score da posição
                    score = self._calculate_position_score(x, y, width, height)
                    if score > best_score:
                        best_score = score
                        best_x, best_y = x, y
        
        return (best_x, best_y) if best_x is not None else None
    
    def _calculate_position_score(self, x: int, y: int, width: int, height: int) -> float:
        """Calcula o score de uma posição (quanto melhor a posição, maior o score)"""
        score = 0.0
        
        # 1. Preferir posições mais próximas da origem (0,0)
        score -= (x + y) * 0.1
        
        # 2. Preferir posições que deixam menos espaços vazios
        # Verificar se a peça encaixa bem com outras peças
        if x > 0 and y > 0:
            # Se há peças adjacentes, é bom
            if np.any(self.grid[y-1:y+height+1, x-1:x+width+1]):
                score += 10
        
        # 3. Preferir posições que preenchem cantos
        if x == 0 or y == 0:
            score += 5
        
        # 4. Preferir posições que criam linhas/colunas completas
        if x + width == self.stock_width or y + height == self.stock_height:
            score += 3
        
        # 5. Preferir posições que deixam espaços retangulares
        remaining_width = self.stock_width - (x + width)
        remaining_height = self.stock_height - (y + height)
        if remaining_width > 0 and remaining_height > 0:
            # Se o espaço restante é retangular, é bom
            score += 2
        
        return score
    
    def _sort_pieces_by_efficiency(self) -> List[Piece]:
        """Ordena as peças por eficiência de uso de espaço"""
        def efficiency_key(piece):
            area = piece.width * piece.height
            perimeter = 2 * (piece.width + piece.height)
            # Eficiência = área / perímetro (quanto maior, melhor)
            efficiency = area / perimeter if perimeter > 0 else 0
            return -efficiency  # Ordem decrescente
        
        return sorted(self.pieces, key=efficiency_key)
    
    def _try_place_piece_with_rotation(self, piece: Piece) -> Optional[Tuple[int, int, int, int]]:
        """Tenta colocar uma peça com rotação se necessário"""
        # Tentar orientação original
        position = self._find_best_position(piece.width, piece.height)
        if position:
            return position[0], position[1], piece.width, piece.height
        
        # Se não couber e rotação for permitida, tentar rotacionar
        if self.allow_rotation and piece.width != piece.height:
            position = self._find_best_position(piece.height, piece.width)
            if position:
                return position[0], position[1], piece.height, piece.width
        
        return None
    
    def optimize(self, time_limit: int = 60) -> CuttingResult:
        """
        Executa a otimização focando em colocar mais peças
        
        Args:
            time_limit: Limite de tempo em segundos
            
        Returns:
            CuttingResult com os resultados da otimização
        """
        start_time = time.time()
        
        # Resetar grid
        self.grid = np.zeros((self.stock_height, self.stock_width), dtype=bool)
        
        # Ordenar peças por eficiência
        sorted_pieces = self._sort_pieces_by_efficiency()
        
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
            placement = self._try_place_piece_with_rotation(piece)
            
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


def create_improved_optimizer_from_dict(config: Dict) -> ImprovedCuttingOptimizer:
    """
    Cria um otimizador melhorado a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        ImprovedCuttingOptimizer configurado
    """
    return ImprovedCuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True)
    )
