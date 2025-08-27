"""
Módulo core - Algoritmos de otimização de corte
"""

from .cutting_optimizer import CuttingOptimizer, Piece, CuttingResult
from .cutting_optimizer_simple import SimpleCuttingOptimizer
from .cutting_optimizer_fast import FastCuttingOptimizer
from .cutting_optimizer_improved import ImprovedCuttingOptimizer
from .cutting_optimizer_smart import SmartCuttingOptimizer

__all__ = [
    'CuttingOptimizer',
    'SimpleCuttingOptimizer', 
    'FastCuttingOptimizer',
    'ImprovedCuttingOptimizer',
    'SmartCuttingOptimizer',
    'Piece',
    'CuttingResult'
]
