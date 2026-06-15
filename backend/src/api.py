"""
API principal para interface com o frontend
"""

import json
from typing import Dict, List, Tuple, Optional
from pathlib import Path

from .core import (
    CuttingOptimizer,
    SimpleCuttingOptimizer,
    FastCuttingOptimizer,
    ImprovedCuttingOptimizer,
    SmartCuttingOptimizer,
    CuttingResult
)
from .core.cutting_optimizer_enhanced import EnhancedCuttingOptimizer
from .utils import (
    CuttingConfig,
    load_config_from_json,
    save_config_to_json,
    save_results_to_csv,
    export_cutting_instructions,
    calculate_efficiency_metrics,
    validate_pieces_fit_stock
)
from .visualization import CuttingVisualizer


class CuttingOptimizationAPI:
    """
    API principal para otimização de corte
    """
    
    def __init__(self):
        self.available_algorithms = {
            'milp': CuttingOptimizer,
            'simple': SimpleCuttingOptimizer,
            'fast': FastCuttingOptimizer,
            'improved': ImprovedCuttingOptimizer,
            'smart': SmartCuttingOptimizer,
            'enhanced': EnhancedCuttingOptimizer
        }
    
    def get_available_algorithms(self) -> List[str]:
        """Retorna lista de algoritmos disponíveis"""
        return list(self.available_algorithms.keys())
    
    def optimize_cutting(self, 
                        stock_width: int,
                        stock_height: int,
                        pieces: List[Tuple[int, int, int, bool, str]],  # [width, height, quantity, allow_rotation, description]
                        algorithm: str = 'fast',
                        time_limit: int = 60,
                        optimization_mode: str = 'refined') -> Dict:
        """
        Executa otimização de corte
        
        Args:
            stock_width: Largura do material base
            stock_height: Altura do material base
            pieces: Lista de peças (largura, altura, quantidade)
            algorithm: Algoritmo a ser usado
            allow_rotation: Permite rotação das peças
            time_limit: Limite de tempo em segundos
            
        Returns:
            Dicionário com resultados da otimização
        """
        try:
            # Validar algoritmo
            if algorithm not in self.available_algorithms:
                raise ValueError(f"Algoritmo '{algorithm}' não disponível")

            normalized_pieces = []
            for i, piece in enumerate(pieces):
                if len(piece) >= 5:
                    width, height, quantity, piece_allow_rotation, description = piece[:5]
                elif len(piece) == 4:
                    width, height, quantity, piece_allow_rotation = piece
                    description = f"Peça {i + 1}"
                elif len(piece) == 3:
                    width, height, quantity = piece
                    piece_allow_rotation = True
                    description = f"Peça {i + 1}"
                else:
                    raise ValueError(f"Formato de peça inválido no índice {i}: {piece}")

                normalized_pieces.append((
                    int(width),
                    int(height),
                    int(quantity),
                    bool(piece_allow_rotation),
                    str(description)
                ))
            
            # Validar entrada
            validation = validate_pieces_fit_stock(stock_width, stock_height, normalized_pieces)
            
            # Criar otimizador
            optimizer_class = self.available_algorithms[algorithm]

            if algorithm == 'enhanced':
                optimizer_pieces = normalized_pieces
            else:
                optimizer_pieces = [
                    (width, height, quantity)
                    for width, height, quantity, _, _ in normalized_pieces
                ]

            allow_rotation = any(piece_allow_rotation for _, _, _, piece_allow_rotation, _ in normalized_pieces)
            optimizer = optimizer_class(
                stock_width=stock_width,
                stock_height=stock_height,
                pieces=optimizer_pieces,
                allow_rotation=allow_rotation
            )
            
            # Executar otimização
            if algorithm == 'fast':
                result = optimizer.optimize(
                    time_limit=time_limit,
                    optimization_mode=optimization_mode
                )
            else:
                result = optimizer.optimize(time_limit=time_limit)

            # Garantir descrição legível para todos os algoritmos (inclusive fast/simple/...)
            description_by_base_id = {
                f"piece_{idx}": description
                for idx, (_, _, _, _, description) in enumerate(normalized_pieces)
            }

            for placed_piece in result.pieces_placed:
                if placed_piece.get('description'):
                    continue

                piece_id = str(placed_piece.get('id', ''))
                is_rotated = piece_id.endswith('_rot')
                base_id = piece_id[:-4] if is_rotated else piece_id
                base_description = description_by_base_id.get(base_id, piece_id)

                placed_piece['description'] = (
                    f"{base_description} (Rotacionada)" if is_rotated else base_description
                )
            
            # Calcular métricas adicionais
            efficiency_metrics = calculate_efficiency_metrics(result)

            pieces_placed = result.pieces_placed
            if pieces_placed:
                used_width = max(piece['x'] + piece['width'] for piece in pieces_placed)
                used_height = max(piece['y'] + piece['height'] for piece in pieces_placed)
            else:
                used_width = 0
                used_height = 0

            bbox_area = used_width * used_height if used_width > 0 and used_height > 0 else 0
            bbox_area_efficiency = (result.used_area / bbox_area) * 100 if bbox_area > 0 else 0.0
            length_utilization_percentage = (used_height / stock_height) * 100 if stock_height > 0 else 0.0
            
            # Preparar resposta
            response = {
                'success': True,
                'algorithm': algorithm,
                'result': {
                    'pieces_placed': result.pieces_placed,
                    'stock_used': result.stock_used,
                    'waste_percentage': result.waste_percentage,
                    'execution_time': result.execution_time,
                    'is_optimal': result.is_optimal,
                    'total_area': result.total_area,
                    'used_area': result.used_area
                },
                'efficiency_metrics': efficiency_metrics,
                'layout_metrics': {
                    'used_width': used_width,
                    'used_height': used_height,
                    'suggested_stock_height': used_height,
                    'length_utilization_percentage': length_utilization_percentage,
                    'bbox_area_efficiency': bbox_area_efficiency
                },
                'validation': validation,
                'statistics': optimizer.get_statistics()
            }
            
            return response
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'algorithm': algorithm
            }
    
    def save_results(self, 
                    result: Dict,
                    output_dir: str = 'output',
                    save_csv: bool = True,
                    save_instructions: bool = True) -> Dict:
        """
        Salva resultados da otimização
        
        Args:
            result: Resultado da otimização
            output_dir: Diretório de saída
            save_csv: Salvar em CSV
            save_instructions: Salvar instruções
            
        Returns:
            Dicionário com caminhos dos arquivos salvos
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            saved_files = {}
            
            # Salvar CSV
            if save_csv:
                csv_path = output_path / "resultado_corte.csv"
                save_results_to_csv(result['result'], str(csv_path))
                saved_files['csv'] = str(csv_path)
            
            # Salvar instruções
            if save_instructions:
                instructions_path = output_path / "instrucoes_corte.txt"
                export_cutting_instructions(result['result'], str(instructions_path))
                saved_files['instructions'] = str(instructions_path)
            
            return {
                'success': True,
                'saved_files': saved_files
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_visualization(self,
                             result: Dict,
                             output_dir: str = 'output',
                             save_images: bool = True) -> Dict:
        """
        Gera visualizações dos resultados
        
        Args:
            result: Resultado da otimização
            output_dir: Diretório de saída
            save_images: Salvar imagens
            
        Returns:
            Dicionário com caminhos das imagens
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            # Criar visualizador
            visualizer = CuttingVisualizer(
                result['statistics']['stock_dimensions'][0],
                result['statistics']['stock_dimensions'][1]
            )
            
            saved_images = {}
            
            if save_images:
                # Plano de corte
                cutting_plan_path = output_path / "plano_corte.png"
                visualizer.visualize_cutting_plan(
                    result['result']['pieces_placed'],
                    title="Plano de Corte Otimizado",
                    save_path=str(cutting_plan_path)
                )
                saved_images['cutting_plan'] = str(cutting_plan_path)
                
                # Análise de desperdício
                waste_analysis_path = output_path / "analise_desperdicio.png"
                visualizer.visualize_waste_analysis({
                    'total_area': result['result']['total_area'],
                    'used_area': result['result']['used_area'],
                    'waste_percentage': result['result']['waste_percentage']
                }, save_path=str(waste_analysis_path))
                saved_images['waste_analysis'] = str(waste_analysis_path)
            
            return {
                'success': True,
                'saved_images': saved_images
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def load_config(self, config_path: str) -> Dict:
        """
        Carrega configuração de arquivo JSON
        
        Args:
            config_path: Caminho do arquivo de configuração
            
        Returns:
            Dicionário com configuração carregada
        """
        try:
            config = load_config_from_json(config_path)
            return {
                'success': True,
                'config': {
                    'stock_width': config.stock_width,
                    'stock_height': config.stock_height,
                    'pieces': config.pieces,
                    'allow_rotation': config.allow_rotation,
                    'time_limit': config.time_limit,
                    'optimization_mode': getattr(config, 'optimization_mode', 'refined'),
                    'name': config.name
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def save_config(self, config: Dict, config_path: str) -> Dict:
        """
        Salva configuração em arquivo JSON
        
        Args:
            config: Configuração a ser salva
            config_path: Caminho do arquivo
            
        Returns:
            Dicionário com resultado da operação
        """
        try:
            config_obj = CuttingConfig(
                stock_width=config['stock_width'],
                stock_height=config['stock_height'],
                pieces=config['pieces'],
                allow_rotation=config.get('allow_rotation', True),
                time_limit=config.get('time_limit', 300),
                optimization_mode=config.get('optimization_mode', 'refined'),
                name=config.get('name', '')
            )
            
            save_config_to_json(config_obj, config_path)
            
            return {
                'success': True,
                'config_path': config_path
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Instância global da API
api = CuttingOptimizationAPI()
