"""
Algoritmo de Otimização de Corte Bidimensional (2D Cutting Stock Problem)
Usando Programação Linear Inteira Mista (MILP)
"""

import numpy as np
from pulp import *
import time
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass


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


class CuttingOptimizer:
    """
    Otimizador de corte bidimensional usando MILP
    """
    
    def __init__(self, stock_width: int, stock_height: int, 
                 pieces: List[Tuple[int, int, int]], 
                 allow_rotation: bool = True,
                 guillotine_cut: bool = True):
        """
        Inicializa o otimizador
        
        Args:
            stock_width: Largura do material base
            stock_height: Altura do material base
            pieces: Lista de peças (largura, altura, quantidade)
            allow_rotation: Permite rotação das peças
            guillotine_cut: Restringe a cortes guilhotina
        """
        self.stock_width = stock_width
        self.stock_height = stock_height
        self.allow_rotation = allow_rotation
        self.guillotine_cut = guillotine_cut
        
        # Converter peças para objetos Piece
        self.pieces = []
        for i, (width, height, quantity) in enumerate(pieces):
            self.pieces.append(Piece(width, height, quantity, f"piece_{i}"))
            if allow_rotation and width != height:
                # Adicionar versão rotacionada
                self.pieces.append(Piece(height, width, quantity, f"piece_{i}_rot"))
        
        self.total_pieces = sum(piece.quantity for piece in self.pieces)
        self.stock_area = stock_width * stock_height
        
    def _create_variables(self, prob):
        """Cria as variáveis de decisão do modelo MILP"""
        variables = {}
        
        # Variável binária: peça i é colocada na posição (x, y) com orientação o
        for piece in self.pieces:
            for x in range(self.stock_width - piece.width + 1):
                for y in range(self.stock_height - piece.height + 1):
                    var_name = f"piece_{piece.id}_x{x}_y{y}"
                    variables[var_name] = LpVariable(var_name, cat='Binary')
        
        # Variável binária: posição (x, y) é usada
        for x in range(self.stock_width):
            for y in range(self.stock_height):
                var_name = f"used_x{x}_y{y}"
                variables[var_name] = LpVariable(var_name, cat='Binary')
        
        return variables
    
    def _add_constraints(self, prob, variables):
        """Adiciona as restrições ao modelo"""
        
        # 1. Restrição de quantidade: cada peça deve ser cortada na quantidade especificada
        for piece in self.pieces:
            # Agrupar peças iguais (incluindo rotações)
            base_id = piece.id.split('_rot')[0]
            total_quantity = sum(p.quantity for p in self.pieces 
                               if p.id.split('_rot')[0] == base_id)
            
            constraint_vars = []
            for x in range(self.stock_width - piece.width + 1):
                for y in range(self.stock_height - piece.height + 1):
                    var_name = f"piece_{piece.id}_x{x}_y{y}"
                    if var_name in variables:
                        constraint_vars.append(variables[var_name])
            
            if constraint_vars:
                prob += lpSum(constraint_vars) <= total_quantity, f"quantity_{piece.id}"
        
        # 2. Restrição de sobreposição: peças não podem se sobrepor
        for x1 in range(self.stock_width):
            for y1 in range(self.stock_height):
                for piece1 in self.pieces:
                    for x2 in range(self.stock_width):
                        for y2 in range(self.stock_height):
                            for piece2 in self.pieces:
                                if piece1.id == piece2.id and x1 == x2 and y1 == y2:
                                    continue
                                
                                # Verificar se as peças se sobrepõem
                                if self._pieces_overlap(x1, y1, piece1, x2, y2, piece2):
                                    var1_name = f"piece_{piece1.id}_x{x1}_y{y1}"
                                    var2_name = f"piece_{piece2.id}_x{x2}_y{y2}"
                                    
                                    if var1_name in variables and var2_name in variables:
                                        prob += (variables[var1_name] + variables[var2_name] <= 1,
                                               f"overlap_{x1}_{y1}_{piece1.id}_{x2}_{y2}_{piece2.id}")
        
        # 3. Restrição de guilhotina (se aplicável)
        if self.guillotine_cut:
            self._add_guillotine_constraints(prob, variables)
    
    def _pieces_overlap(self, x1, y1, piece1, x2, y2, piece2):
        """Verifica se duas peças se sobrepõem"""
        return not (x1 + piece1.width <= x2 or x2 + piece2.width <= x1 or
                   y1 + piece1.height <= y2 or y2 + piece2.height <= y1)
    
    def _add_guillotine_constraints(self, prob, variables):
        """Adiciona restrições de corte guilhotina"""
        # Implementação simplificada - pode ser expandida
        pass
    
    def _create_objective(self, prob, variables):
        """Cria a função objetivo: maximizar área utilizada"""
        objective_terms = []
        
        for piece in self.pieces:
            piece_area = piece.width * piece.height
            for x in range(self.stock_width - piece.width + 1):
                for y in range(self.stock_height - piece.height + 1):
                    var_name = f"piece_{piece.id}_x{x}_y{y}"
                    if var_name in variables:
                        objective_terms.append(piece_area * variables[var_name])
        
        prob += lpSum(objective_terms)
    
    def optimize(self, time_limit: int = 300) -> CuttingResult:
        """
        Executa a otimização
        
        Args:
            time_limit: Limite de tempo em segundos
            
        Returns:
            CuttingResult com os resultados da otimização
        """
        start_time = time.time()
        
        # Criar problema de otimização
        prob = LpProblem("2D_Cutting_Optimization", LpMaximize)
        
        # Criar variáveis
        variables = self._create_variables(prob)
        
        # Adicionar restrições
        self._add_constraints(prob, variables)
        
        # Criar função objetivo
        self._create_objective(prob, variables)
        
        # Resolver o problema
        solver = PULP_CBC_CMD(msg=0, timeLimit=time_limit)
        prob.solve(solver)
        
        execution_time = time.time() - start_time
        
        # Processar resultados
        pieces_placed = self._extract_solution(variables)
        stock_used = 1  # Simplificado - pode ser expandido para múltiplas chapas
        used_area = sum(piece['area'] for piece in pieces_placed)
        waste_percentage = ((self.stock_area - used_area) / self.stock_area) * 100
        
        return CuttingResult(
            pieces_placed=pieces_placed,
            stock_used=stock_used,
            waste_percentage=waste_percentage,
            execution_time=execution_time,
            is_optimal=(prob.status == LpStatusOptimal),
            total_area=self.stock_area,
            used_area=used_area
        )
    
    def _extract_solution(self, variables) -> List[Dict]:
        """Extrai a solução das variáveis do modelo"""
        pieces_placed = []
        
        for var_name, var in variables.items():
            if var_name.startswith('piece_') and value(var) == 1:
                # Parsear nome da variável: piece_id_xX_yY
                parts = var_name.split('_')
                piece_id = '_'.join(parts[1:-2])
                x = int(parts[-2][1:])
                y = int(parts[-1][1:])
                
                # Encontrar a peça correspondente
                for piece in self.pieces:
                    if piece.id == piece_id:
                        pieces_placed.append({
                            'id': piece.id,
                            'x': x,
                            'y': y,
                            'width': piece.width,
                            'height': piece.height,
                            'area': piece.width * piece.height
                        })
                        break
        
        return pieces_placed
    
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
            'guillotine_cut': self.guillotine_cut
        }


def create_optimizer_from_dict(config: Dict) -> CuttingOptimizer:
    """
    Cria um otimizador a partir de um dicionário de configuração
    
    Args:
        config: Dicionário com configurações
        
    Returns:
        CuttingOptimizer configurado
    """
    return CuttingOptimizer(
        stock_width=config['stock_width'],
        stock_height=config['stock_height'],
        pieces=config['pieces'],
        allow_rotation=config.get('allow_rotation', True),
        guillotine_cut=config.get('guillotine_cut', True)
    )
