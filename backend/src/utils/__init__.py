"""
Módulo utils - Utilitários e funções auxiliares
"""

from .utils import (
    CuttingConfig,
    load_config_from_json,
    save_config_to_json,
    save_results_to_csv,
    export_cutting_instructions,
    calculate_efficiency_metrics,
    validate_pieces_fit_stock,
    generate_test_cases,
    create_piece_summary,
    calculate_material_cost
)

__all__ = [
    'CuttingConfig',
    'load_config_from_json',
    'save_config_to_json', 
    'save_results_to_csv',
    'export_cutting_instructions',
    'calculate_efficiency_metrics',
    'validate_pieces_fit_stock',
    'generate_test_cases',
    'create_piece_summary',
    'calculate_material_cost'
]
