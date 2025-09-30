"""
Algoritmo de Otimização de Corte Bidimensional - Versão Simplificada
Usando heurísticas para problemas de tamanho médio
"""

import numpy as np
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


class SimpleCuttingOptimizer:
    """
    Otimizador de corte bidimensional usando heurísticas
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
        """Encontra a melhor posição para uma peça usando heurística de canto inferior esquerdo"""
        best_x, best_y = None, None
        min_waste = float('inf')
        
        # Tentar posições em ordem de preferência (canto inferior esquerdo)
        for y in range(self.stock_height - height + 1):
            for x in range(self.stock_width - width + 1):
                if self._can_place_piece(x, y, width, height):
                    # Calcular desperdício potencial
                    waste = self._calculate_waste_at_position(x, y, width, height)
                    if waste < min_waste:
                        min_waste = waste
                        best_x, best_y = x, y
        
        return (best_x, best_y) if best_x is not None else None
    
    def _calculate_waste_at_position(self, x: int, y: int, width: int, height: int) -> float:
        """Calcula o desperdício potencial ao colocar uma peça na posição (x, y)"""
        # Heurística simples: preferir posições mais próximas da origem
        return x + y
    
    def _sort_pieces_by_heuristic(self) -> List[Piece]:
        """Ordena as peças por heurística (maior área primeiro, depois maior dimensão)"""
        def sort_key(piece):
            area = piece.width * piece.height
            max_dim = max(piece.width, piece.height)
            return (-area, -max_dim)  # Ordem decrescente
        
        return sorted(self.pieces, key=sort_key)
    
    def optimize(self, time_limit: int = 60) -> CuttingResult:
        """
        Executa a otimização usando heurísticas
        
        Args:
            time_limit: Limite de tempo em segundos
            
        Returns:
            CuttingResult com os resultados da otimização
        """
        start_time = time.time()
        
        # Resetar grid
        self.grid = np.zeros((self.stock_height, self.stock_width), dtype=bool)
        
        # Ordenar peças por heurística
        sorted_pieces = self._sort_pieces_by_heuristic()
        
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
            position = self._find_best_position(piece.width, piece.height)
            
            if position:
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
            'guillotine_cut': False  # Heurística não garante corte guilhotina
        }


def create_simple_optimizer_from_dict(config: Dict) -> SimpleCuttingOptimizer:
    """
    Cria um otimizador simples a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        SimpleCuttingOptimizer configurado
    """
    return SimpleCuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True)
    )
