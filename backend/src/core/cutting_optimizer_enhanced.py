#!/usr/bin/env python3
"""
Otimizador de corte bidimensional melhorado
Versão que tenta colocar mais peças usando estratégias avançadas
"""

import time
import numpy as np
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass

from .cutting_optimizer_fast import Piece, CuttingResult


class EnhancedCuttingOptimizer:
    """
    Otimizador de corte bidimensional melhorado
    Usa múltiplas estratégias para maximizar o número de peças colocadas
    """
    
    def __init__(self, stock_width: int, stock_height: int, 
                 pieces: List[Tuple[int, int, int, bool, str]],  # [width, height, quantity, allow_rotation, description]
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
        self.piece_descriptions = {}  # Mapear IDs para descrições
        
        for i, (width, height, quantity, piece_allow_rotation, description) in enumerate(pieces):
            piece_id = f"piece_{i}"
            self.pieces.append(Piece(width, height, quantity, piece_id))
            self.piece_descriptions[piece_id] = description
            
            if piece_allow_rotation and width != height:
                # Adicionar versão rotacionada apenas se a peça permitir rotação
                rotated_id = f"{piece_id}_rot"
                self.pieces.append(Piece(height, width, quantity, rotated_id))
                self.piece_descriptions[rotated_id] = f"{description} (Rotacionada)"
        
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
        """Encontra a melhor posição para uma peça usando múltiplas estratégias"""
        # Estratégia 1: Busca por linhas (mais eficiente para peças pequenas)
        for y in range(self.stock_height - height + 1):
            for x in range(self.stock_width - width + 1):
                if self._can_place_piece(x, y, width, height):
                    return (x, y)
        
        # Estratégia 2: Busca por colunas (mais eficiente para peças altas)
        for x in range(self.stock_width - width + 1):
            for y in range(self.stock_height - height + 1):
                if self._can_place_piece(x, y, width, height):
                    return (x, y)
        
        return None
    
    def _find_position_near_edges(self, width: int, height: int) -> Optional[Tuple[int, int]]:
        """Encontra posição próxima às bordas (estratégia de empacotamento)"""
        # Tentar posições próximas às bordas
        edge_positions = [
            (0, 0),  # Canto superior esquerdo
            (self.stock_width - width, 0),  # Canto superior direito
            (0, self.stock_height - height),  # Canto inferior esquerdo
            (self.stock_width - width, self.stock_height - height),  # Canto inferior direito
        ]
        
        for x, y in edge_positions:
            if self._can_place_piece(x, y, width, height):
                return (x, y)
        
        return None
    
    def _sort_pieces_by_efficiency(self) -> List[Piece]:
        """Ordena as peças por eficiência de empacotamento"""
        def efficiency_key(piece):
            # Priorizar peças menores que se encaixam melhor
            area = piece.width * piece.height
            perimeter = 2 * (piece.width + piece.height)
            # Eficiência = área / perímetro (maior é melhor)
            # Também considerar a quantidade - priorizar peças com mais unidades
            efficiency = area / perimeter if perimeter > 0 else area
            return -efficiency * piece.quantity  # Multiplicar pela quantidade
        
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
    
    def _try_place_piece_near_edges(self, piece: Piece) -> Optional[Tuple[int, int, int, int]]:
        """Tenta colocar uma peça próxima às bordas"""
        # Tentar orientação original
        position = self._find_position_near_edges(piece.width, piece.height)
        if position:
            return position[0], position[1], piece.width, piece.height
        
        # Se não couber e rotação for permitida, tentar rotacionar
        if self.allow_rotation and piece.width != piece.height:
            position = self._find_position_near_edges(piece.height, piece.width)
            if position:
                return position[0], position[1], piece.height, piece.width
        
        return None
    
    def optimize(self, time_limit: int = 60) -> CuttingResult:
        """
        Executa a otimização usando estratégias avançadas
        
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
        
        # Tentar colocar peças em múltiplas iterações para maximizar o uso
        max_iterations = 12  # Aumentar para 12 iterações para colocar mais peças
        pieces_placed_this_iteration = 1  # Inicializar para entrar no loop
        
        for iteration in range(max_iterations):
            if pieces_placed_this_iteration == 0:
                # Se não conseguiu colocar nenhuma peça, tentar reorganizar
                if iteration > 3:  # Só tentar reorganizar após algumas iterações
                    self._try_reorganize_pieces()
                elif iteration > 6:  # Tentar estratégia mais agressiva
                    self._try_aggressive_reorganization()
                else:
                    break  # Se não conseguiu colocar nenhuma peça nesta iteração, parar
                
            pieces_placed_this_iteration = 0
            
            # Tentar colocar cada peça usando múltiplas estratégias
            for piece in sorted_pieces:
                # Verificar limite de tempo
                if time.time() - start_time > time_limit:
                    break
                
                # Verificar quantidade máxima
                base_id = piece.id.split('_rot')[0]
                if piece_counts[base_id] >= piece.quantity:
                    continue
                
                # Tentar múltiplas estratégias de posicionamento
                placement = None
                
                # Estratégia 1: Tentar posição normal
                placement = self._try_place_piece_with_rotation(piece)
                
                # Estratégia 2: Se não funcionar, tentar próximo às bordas
                if not placement:
                    placement = self._try_place_piece_near_edges(piece)
                
                # Estratégia 3: Tentar posições aleatórias se ainda não conseguiu
                if not placement:
                    placement = self._try_random_positions(piece)
                
                # Estratégia 4: Tentar posições mais agressivas
                if not placement:
                    placement = self._try_aggressive_placement(piece)
                
                if placement:
                    x, y, width, height = placement
                    self._place_piece(x, y, width, height)
                    
                    pieces_placed.append({
                        'id': piece.id,
                        'x': x,
                        'y': y,
                        'width': width,
                        'height': height,
                        'area': width * height,
                        'description': self.piece_descriptions.get(piece.id, piece.id)
                    })
                    
                    piece_counts[base_id] += 1
                    pieces_placed_this_iteration += 1
        
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
    
    def _try_random_positions(self, piece: Piece) -> Optional[Tuple[int, int, int, int]]:
        """Tenta colocar uma peça em posições aleatórias"""
        import random
        
        # Tentar posições aleatórias
        attempts = 100  # Aumentar para 100 tentativas aleatórias
        
        for _ in range(attempts):
            # Gerar posição aleatória
            x = random.randint(0, max(0, self.stock_width - piece.width))
            y = random.randint(0, max(0, self.stock_height - piece.height))
            
            # Tentar orientação original
            if self._can_place_piece(x, y, piece.width, piece.height):
                return x, y, piece.width, piece.height
            
            # Se não couber e rotação for permitida, tentar rotacionar
            if self.allow_rotation and piece.width != piece.height:
                if self._can_place_piece(x, y, piece.height, piece.width):
                    return x, y, piece.height, piece.width
        
        return None
    
    def _try_aggressive_placement(self, piece: Piece) -> Optional[Tuple[int, int, int, int]]:
        """Tenta colocar uma peça usando estratégia mais agressiva"""
        # Estratégia: tentar posições em uma grade mais fina
        step_size = 1  # Passo de 1 pixel para máxima precisão
        
        # Tentar orientação original
        for y in range(0, self.stock_height - piece.height + 1, step_size):
            for x in range(0, self.stock_width - piece.width + 1, step_size):
                if self._can_place_piece(x, y, piece.width, piece.height):
                    return x, y, piece.width, piece.height
        
        # Se não couber e rotação for permitida, tentar rotacionar
        if self.allow_rotation and piece.width != piece.height:
            for y in range(0, self.stock_height - piece.height + 1, step_size):
                for x in range(0, self.stock_width - piece.width + 1, step_size):
                    if self._can_place_piece(x, y, piece.height, piece.width):
                        return x, y, piece.height, piece.width
        
        return None
    
    def _try_reorganize_pieces(self) -> None:
        """Tenta reorganizar as peças já colocadas para liberar espaço"""
        # Esta é uma versão simplificada - em uma implementação completa,
        # seria necessário mover peças existentes para criar espaço
        # Por enquanto, vamos apenas limpar algumas áreas pequenas
        
        # Encontrar áreas pequenas que podem ser preenchidas
        for y in range(0, self.stock_height, 50):
            for x in range(0, self.stock_width, 50):
                # Verificar se há uma área pequena livre
                if x + 50 <= self.stock_width and y + 50 <= self.stock_height:
                    area_free = not np.any(self.grid[y:y+50, x:x+50])
                    if area_free:
                        # Marcar como ocupada para evitar colisões futuras
                        self.grid[y:y+50, x:x+50] = True
    
    def _try_aggressive_reorganization(self) -> None:
        """Tenta reorganização mais agressiva para liberar espaço"""
        # Estratégia: tentar encontrar espaços menores que podem acomodar peças pequenas
        for y in range(0, self.stock_height, 25):  # Passo menor
            for x in range(0, self.stock_width, 25):
                # Verificar se há uma área pequena livre
                if x + 25 <= self.stock_width and y + 25 <= self.stock_height:
                    area_free = not np.any(self.grid[y:y+25, x:x+25])
                    if area_free:
                        # Marcar como ocupada para evitar colisões futuras
                        self.grid[y:y+25, x:x+25] = True
    
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
            'guillotine_cut': False,
            'algorithm': 'enhanced'
        }


def create_enhanced_optimizer_from_dict(config: Dict) -> EnhancedCuttingOptimizer:
    """
    Cria um otimizador melhorado a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        EnhancedCuttingOptimizer configurado
    """
    return EnhancedCuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True)
    )
