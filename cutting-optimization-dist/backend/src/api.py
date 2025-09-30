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
                        time_limit: int = 60) -> Dict:
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
            
            # Validar entrada
            validation = validate_pieces_fit_stock(stock_width, stock_height, pieces)
            
            # Criar otimizador
            optimizer_class = self.available_algorithms[algorithm]
            optimizer = optimizer_class(
                stock_width=stock_width,
                stock_height=stock_height,
                pieces=pieces,
                allow_rotation=True  # Mantido para compatibilidade, mas será ignorado
            )
            
            # Executar otimização
            result = optimizer.optimize(time_limit=time_limit)
            
            # Calcular métricas adicionais
            efficiency_metrics = calculate_efficiency_metrics(result)
            
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
