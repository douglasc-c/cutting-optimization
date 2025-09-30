"""
Utilitários para otimização de corte bidimensional
"""

import json
import csv
from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass, asdict
from ..core import CuttingResult, Piece


@dataclass
class CuttingConfig:
    """Configuração para otimização de corte"""
    stock_width: int
    stock_height: int
    pieces: List[Tuple[int, int, int]]  # (width, height, quantity)
    allow_rotation: bool = True
    guillotine_cut: bool = True
    time_limit: int = 300
    name: str = ""


def load_config_from_json(file_path: str) -> CuttingConfig:
    """
    Carrega configuração de um arquivo JSON
    
    Args:
        file_path: Caminho do arquivo JSON
        
    Returns:
        CuttingConfig carregada
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Converter peças para o novo formato se necessário
    pieces = data['pieces']
    converted_pieces = []
    
    for piece in pieces:
        if len(piece) == 3:
            # Formato antigo: [width, height, quantity]
            width, height, quantity = piece
            converted_pieces.append([width, height, quantity, data.get('allow_rotation', True), f"Peça {len(converted_pieces) + 1}"])
        elif len(piece) == 4:
            # Formato intermediário: [width, height, quantity, allow_rotation]
            width, height, quantity, allow_rotation = piece
            converted_pieces.append([width, height, quantity, allow_rotation, f"Peça {len(converted_pieces) + 1}"])
        else:
            # Formato novo: [width, height, quantity, allow_rotation, description]
            converted_pieces.append(piece)
    
    return CuttingConfig(
        stock_width=data['stock_width'],
        stock_height=data['stock_height'],
        pieces=converted_pieces,
        allow_rotation=data.get('allow_rotation', True),
        guillotine_cut=data.get('guillotine_cut', True),
        time_limit=data.get('time_limit', 300),
        name=data.get('name', '')
    )


def save_config_to_json(config: CuttingConfig, file_path: str) -> None:
    """
    Salva configuração em arquivo JSON
    
    Args:
        config: Configuração a ser salva
        file_path: Caminho do arquivo de saída
    """
    data = asdict(config)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_results_to_csv(result: CuttingResult, file_path: str) -> None:
    """
    Salva resultados em arquivo CSV
    
    Args:
        result: Resultado da otimização
        file_path: Caminho do arquivo CSV
    """
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Cabeçalho
        writer.writerow(['ID', 'X', 'Y', 'Largura', 'Altura', 'Área'])
        
        # Dados das peças
        for piece in result.pieces_placed:
            writer.writerow([
                piece['id'],
                piece['x'],
                piece['y'],
                piece['width'],
                piece['height'],
                piece['area']
            ])
        
        # Estatísticas
        writer.writerow([])
        writer.writerow(['Estatísticas'])
        writer.writerow(['Área Total', result.total_area])
        writer.writerow(['Área Utilizada', result.used_area])
        writer.writerow(['Desperdício (%)', f"{result.waste_percentage:.2f}"])
        writer.writerow(['Tempo de Execução (s)', f"{result.execution_time:.2f}"])
        writer.writerow(['Ótimo', result.is_optimal])


def calculate_efficiency_metrics(result: CuttingResult) -> Dict:
    """
    Calcula métricas de eficiência do corte
    
    Args:
        result: Resultado da otimização
        
    Returns:
        Dicionário com métricas de eficiência
    """
    # Eficiência de área
    area_efficiency = (result.used_area / result.total_area) * 100
    
    # Densidade de peças (peças por unidade de área)
    piece_density = len(result.pieces_placed) / (result.total_area / 10000)  # peças/m²
    
    # Média de área por peça
    avg_piece_area = result.used_area / len(result.pieces_placed) if result.pieces_placed else 0
    
    # Coeficiente de variação das áreas das peças
    piece_areas = [piece['area'] for piece in result.pieces_placed]
    cv_area = np.std(piece_areas) / np.mean(piece_areas) if piece_areas else 0
    
    return {
        'area_efficiency': area_efficiency,
        'piece_density': piece_density,
        'avg_piece_area': avg_piece_area,
        'cv_area': cv_area,
        'waste_percentage': result.waste_percentage,
        'execution_time': result.execution_time
    }


def validate_pieces_fit_stock(stock_width: int, stock_height: int, 
                            pieces: List[Tuple[int, int, int]]) -> Dict:
    """
    Valida se as peças podem caber no material base
    
    Args:
        stock_width: Largura do material base
        stock_height: Altura do material base
        pieces: Lista de peças (width, height, quantity)
        
    Returns:
        Dicionário com resultados da validação
    """
    stock_area = stock_width * stock_height
    total_piece_area = sum(width * height * quantity for width, height, quantity, _, _ in pieces)
    
    # Verificar se alguma peça é maior que o material base
    oversized_pieces = []
    for i, (width, height, quantity, _, _) in enumerate(pieces):
        if width > stock_width or height > stock_height:
            oversized_pieces.append({
                'index': i,
                'dimensions': (width, height),
                'quantity': quantity
            })
    
    # Verificar se a área total das peças excede o material base
    area_exceeds = total_piece_area > stock_area
    
    return {
        'fits_in_area': not area_exceeds,
        'total_piece_area': total_piece_area,
        'stock_area': stock_area,
        'area_ratio': total_piece_area / stock_area if stock_area > 0 else 0,
        'oversized_pieces': oversized_pieces,
        'has_oversized_pieces': len(oversized_pieces) > 0
    }


def generate_test_cases() -> List[CuttingConfig]:
    """
    Gera casos de teste para validação do algoritmo
    
    Returns:
        Lista de configurações de teste
    """
    test_cases = [
        # Caso simples - poucas peças pequenas
        CuttingConfig(
            stock_width=1000,
            stock_height=1000,
            pieces=[(100, 100, 5), (200, 150, 3)],
            name="Caso Simples"
        ),
        
        # Caso médio - peças variadas
        CuttingConfig(
            stock_width=1200,
            stock_height=800,
            pieces=[(200, 300, 4), (150, 200, 6), (100, 100, 10)],
            name="Caso Médio"
        ),
        
        # Caso complexo - muitas peças pequenas
        CuttingConfig(
            stock_width=1500,
            stock_height=1000,
            pieces=[(50, 50, 20), (75, 75, 15), (100, 100, 8), (150, 200, 5)],
            name="Caso Complexo"
        ),
        
        # Caso com rotação
        CuttingConfig(
            stock_width=1000,
            stock_height=800,
            pieces=[(300, 200, 3), (150, 100, 8)],
            allow_rotation=True,
            name="Com Rotação"
        ),
        
        # Caso sem rotação
        CuttingConfig(
            stock_width=1000,
            stock_height=800,
            pieces=[(300, 200, 3), (150, 100, 8)],
            allow_rotation=False,
            name="Sem Rotação"
        )
    ]
    
    return test_cases


def create_piece_summary(pieces_placed: List[Dict]) -> Dict:
    """
    Cria um resumo das peças cortadas
    
    Args:
        pieces_placed: Lista de peças posicionadas
        
    Returns:
        Dicionário com resumo das peças
    """
    piece_counts = {}
    piece_areas = {}
    
    for piece in pieces_placed:
        piece_id = piece['id'].split('_rot')[0]  # Remover sufixo de rotação
        
        if piece_id not in piece_counts:
            piece_counts[piece_id] = 0
            piece_areas[piece_id] = piece['area']
        
        piece_counts[piece_id] += 1
    
    return {
        'piece_counts': piece_counts,
        'piece_areas': piece_areas,
        'total_pieces': len(pieces_placed),
        'unique_piece_types': len(piece_counts)
    }


def export_cutting_instructions(result: CuttingResult, output_path: str) -> None:
    """
    Exporta instruções de corte em formato legível
    
    Args:
        result: Resultado da otimização
        output_path: Caminho do arquivo de saída
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("INSTRUÇÕES DE CORTE\n")
        f.write("=" * 50 + "\n\n")
        
        f.write(f"Material Base: {result.total_area} mm²\n")
        f.write(f"Área Utilizada: {result.used_area} mm²\n")
        f.write(f"Desperdício: {result.waste_percentage:.2f}%\n")
        f.write(f"Tempo de Otimização: {result.execution_time:.2f} segundos\n")
        f.write(f"Solução Ótima: {'Sim' if result.is_optimal else 'Não'}\n\n")
        
        f.write("PEÇAS A SEREM CORTADAS:\n")
        f.write("-" * 30 + "\n")
        
        # Agrupar peças por tipo
        piece_groups = {}
        for piece in result.pieces_placed:
            piece_id = piece['id'].split('_rot')[0]
            if piece_id not in piece_groups:
                piece_groups[piece_id] = []
            piece_groups[piece_id].append(piece)
        
        for piece_id, pieces in piece_groups.items():
            f.write(f"\nTipo: {piece_id}\n")
            f.write(f"Dimensões: {pieces[0]['width']} x {pieces[0]['height']} mm\n")
            f.write(f"Quantidade: {len(pieces)}\n")
            f.write("Posições:\n")
            
            for i, piece in enumerate(pieces, 1):
                f.write(f"  {i}. Posição ({piece['x']}, {piece['y']})\n")
        
        f.write("\n" + "=" * 50 + "\n")
        f.write("Fim das Instruções\n")


def calculate_material_cost(result: CuttingResult, 
                          cost_per_area: float = 1.0) -> Dict:
    """
    Calcula custos do material
    
    Args:
        result: Resultado da otimização
        cost_per_area: Custo por unidade de área
        
    Returns:
        Dicionário com informações de custo
    """
    total_cost = result.total_area * cost_per_area
    used_cost = result.used_area * cost_per_area
    waste_cost = (result.total_area - result.used_area) * cost_per_area
    
    return {
        'total_cost': total_cost,
        'used_cost': used_cost,
        'waste_cost': waste_cost,
        'cost_efficiency': (used_cost / total_cost) * 100 if total_cost > 0 else 0,
        'cost_per_area': cost_per_area
    }
