"""
Visualização dos resultados da otimização de corte bidimensional
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from typing import List, Dict, Tuple
import random


class CuttingVisualizer:
    """Visualizador para resultados de otimização de corte"""
    
    def __init__(self, stock_width: int, stock_height: int):
        self.stock_width = stock_width
        self.stock_height = stock_height
        self.colors = self._generate_colors()
    
    def _generate_colors(self) -> List[str]:
        """Gera cores para as peças"""
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
                 '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
        return colors
    
    def visualize_cutting_plan(self, pieces_placed: List[Dict], 
                             title: str = "Plano de Corte Otimizado",
                             save_path: str = None) -> None:
        """
        Visualiza o plano de corte
        
        Args:
            pieces_placed: Lista de peças posicionadas
            title: Título do gráfico
            save_path: Caminho para salvar a imagem
        """
        fig, ax = plt.subplots(1, 1, figsize=(12, 8))
        
        # Desenhar o material base
        stock_rect = patches.Rectangle((0, 0), self.stock_width, self.stock_height, 
                                     linewidth=2, edgecolor='black', facecolor='lightgray')
        ax.add_patch(stock_rect)
        
        # Desenhar as peças
        piece_types = {}
        for piece in pieces_placed:
            piece_id = piece['id'].split('_rot')[0]  # Remover sufixo de rotação
            if piece_id not in piece_types:
                piece_types[piece_id] = len(piece_types)
            
            color_idx = piece_types[piece_id] % len(self.colors)
            color = self.colors[color_idx]
            
            rect = patches.Rectangle((piece['x'], piece['y']), 
                                   piece['width'], piece['height'],
                                   linewidth=1, edgecolor='black', 
                                   facecolor=color, alpha=0.7)
            ax.add_patch(rect)
            
            # Adicionar texto com dimensões
            center_x = piece['x'] + piece['width'] / 2
            center_y = piece['y'] + piece['height'] / 2
            ax.text(center_x, center_y, f"{piece['width']}x{piece['height']}", 
                   ha='center', va='center', fontsize=8, fontweight='bold')
        
        # Configurar o gráfico
        ax.set_xlim(0, self.stock_width)
        ax.set_ylim(0, self.stock_height)
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        ax.set_xlabel('Largura (mm)')
        ax.set_ylabel('Altura (mm)')
        ax.set_title(title)
        
        # Adicionar legenda
        legend_elements = []
        for piece_id, color_idx in piece_types.items():
            color = self.colors[color_idx]
            legend_elements.append(patches.Patch(color=color, label=f'Peça {piece_id}'))
        
        ax.legend(handles=legend_elements, loc='upper right')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        plt.show()
    
    def visualize_waste_analysis(self, result_data: Dict, 
                               save_path: str = None) -> None:
        """
        Visualiza análise de desperdício
        
        Args:
            result_data: Dados do resultado da otimização
            save_path: Caminho para salvar a imagem
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Gráfico de pizza - Área utilizada vs desperdício
        labels = ['Área Utilizada', 'Desperdício']
        sizes = [result_data['used_area'], 
                result_data['total_area'] - result_data['used_area']]
        colors = ['#4ECDC4', '#FF6B6B']
        
        ax1.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
        ax1.set_title('Distribuição da Área')
        
        # Gráfico de barras - Estatísticas
        stats_labels = ['Área Total', 'Área Utilizada', 'Desperdício']
        stats_values = [result_data['total_area'], 
                       result_data['used_area'],
                       result_data['total_area'] - result_data['used_area']]
        
        bars = ax2.bar(stats_labels, stats_values, color=['#85C1E9', '#4ECDC4', '#FF6B6B'])
        ax2.set_title('Análise de Área')
        ax2.set_ylabel('Área (mm²)')
        
        # Adicionar valores nas barras
        for bar, value in zip(bars, stats_values):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{value:,}', ha='center', va='bottom')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        plt.show()
    
    def create_animation(self, pieces_placed: List[Dict], 
                        save_path: str = None) -> None:
        """
        Cria uma animação do processo de corte (simplificada)
        
        Args:
            pieces_placed: Lista de peças posicionadas
            save_path: Caminho para salvar a animação
        """
        from matplotlib.animation import FuncAnimation
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Configurar o gráfico
        ax.set_xlim(0, self.stock_width)
        ax.set_ylim(0, self.stock_height)
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        ax.set_title('Animação do Corte')
        
        # Desenhar material base
        stock_rect = patches.Rectangle((0, 0), self.stock_width, self.stock_height, 
                                     linewidth=2, edgecolor='black', facecolor='lightgray')
        ax.add_patch(stock_rect)
        
        pieces_rects = []
        
        def animate(frame):
            if frame < len(pieces_placed):
                piece = pieces_placed[frame]
                color_idx = frame % len(self.colors)
                
                rect = patches.Rectangle((piece['x'], piece['y']), 
                                       piece['width'], piece['height'],
                                       linewidth=1, edgecolor='black', 
                                       facecolor=self.colors[color_idx], alpha=0.7)
                ax.add_patch(rect)
                pieces_rects.append(rect)
                
                # Adicionar texto
                center_x = piece['x'] + piece['width'] / 2
                center_y = piece['y'] + piece['height'] / 2
                ax.text(center_x, center_y, f"{piece['width']}x{piece['height']}", 
                       ha='center', va='center', fontsize=8, fontweight='bold')
            
            return pieces_rects
        
        anim = FuncAnimation(fig, animate, frames=len(pieces_placed) + 1, 
                           interval=500, repeat=False)
        
        if save_path:
            anim.save(save_path, writer='pillow', fps=2)
        
        plt.show()
    
    def export_to_svg(self, pieces_placed: List[Dict], 
                     output_path: str) -> None:
        """
        Exporta o plano de corte para SVG
        
        Args:
            pieces_placed: Lista de peças posicionadas
            output_path: Caminho do arquivo SVG
        """
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Desenhar material base
        stock_rect = patches.Rectangle((0, 0), self.stock_width, self.stock_height, 
                                     linewidth=2, edgecolor='black', facecolor='lightgray')
        ax.add_patch(stock_rect)
        
        # Desenhar peças
        piece_types = {}
        for piece in pieces_placed:
            piece_id = piece['id'].split('_rot')[0]
            if piece_id not in piece_types:
                piece_types[piece_id] = len(piece_types)
            
            color_idx = piece_types[piece_id] % len(self.colors)
            color = self.colors[color_idx]
            
            rect = patches.Rectangle((piece['x'], piece['y']), 
                                   piece['width'], piece['height'],
                                   linewidth=1, edgecolor='black', 
                                   facecolor=color, alpha=0.7)
            ax.add_patch(rect)
        
        ax.set_xlim(0, self.stock_width)
        ax.set_ylim(0, self.stock_height)
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        ax.set_title('Plano de Corte - SVG')
        
        plt.savefig(output_path, format='svg', dpi=300, bbox_inches='tight')
        plt.close()


def create_comparison_visualization(results: List[Dict], 
                                  titles: List[str],
                                  save_path: str = None) -> None:
    """
    Cria visualização comparativa de diferentes resultados
    
    Args:
        results: Lista de resultados de otimização
        titles: Títulos para cada resultado
        save_path: Caminho para salvar a imagem
    """
    n_results = len(results)
    fig, axes = plt.subplots(1, n_results, figsize=(6 * n_results, 8))
    
    if n_results == 1:
        axes = [axes]
    
    for i, (result, title) in enumerate(zip(results, titles)):
        ax = axes[i]
        
        # Desenhar material base
        stock_width = result['stock_width']
        stock_height = result['stock_height']
        
        stock_rect = patches.Rectangle((0, 0), stock_width, stock_height, 
                                     linewidth=2, edgecolor='black', facecolor='lightgray')
        ax.add_patch(stock_rect)
        
        # Desenhar peças
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
        piece_types = {}
        
        for piece in result['pieces_placed']:
            piece_id = piece['id'].split('_rot')[0]
            if piece_id not in piece_types:
                piece_types[piece_id] = len(piece_types)
            
            color_idx = piece_types[piece_id] % len(colors)
            color = colors[color_idx]
            
            rect = patches.Rectangle((piece['x'], piece['y']), 
                                   piece['width'], piece['height'],
                                   linewidth=1, edgecolor='black', 
                                   facecolor=color, alpha=0.7)
            ax.add_patch(rect)
        
        ax.set_xlim(0, stock_width)
        ax.set_ylim(0, stock_height)
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        ax.set_title(f'{title}\nDesperdício: {result["waste_percentage"]:.1f}%')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    
    plt.show()
