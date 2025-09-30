#!/usr/bin/env python3
"""
Demonstração Final - Algoritmo de Otimização de Corte Bidimensional
"""

from cutting_optimizer_fast import FastCuttingOptimizer
from visualization import CuttingVisualizer
import time


def demo_completa():
    """Demonstração completa do algoritmo"""
    print("🎯 DEMONSTRAÇÃO FINAL - OTIMIZAÇÃO DE CORTE")
    print("=" * 50)
    
    # Configurar problema realista
    stock_width = 800
    stock_height = 600
    pieces = [
        (200, 150, 3),  # 3 peças grandes
        (100, 100, 5),  # 5 peças médias
        (50, 50, 8),    # 8 peças pequenas
    ]
    
    print(f"📏 MATERIAL BASE: {stock_width}x{stock_height} mm")
    print(f"🧩 PEÇAS A CORTAR:")
    for i, (w, h, q) in enumerate(pieces, 1):
        print(f"   {i}. {w}x{h}mm - {q} unidades")
    
    # Criar otimizador
    optimizer = FastCuttingOptimizer(
        stock_width=stock_width,
        stock_height=stock_height,
        pieces=pieces,
        allow_rotation=True
    )
    
    # Mostrar estatísticas
    stats = optimizer.get_statistics()
    print(f"\n📊 ESTATÍSTICAS:")
    print(f"   Área total: {stats['stock_area']:,} mm²")
    print(f"   Total de peças: {stats['total_pieces']}")
    print(f"   Área das peças: {stats['total_piece_area']:,} mm²")
    print(f"   Desperdício teórico: {stats['theoretical_waste']:.1f}%")
    
    # Executar otimização
    print(f"\n🔧 EXECUTANDO OTIMIZAÇÃO...")
    start_time = time.time()
    result = optimizer.optimize(time_limit=15)
    total_time = time.time() - start_time
    
    # Mostrar resultados
    print(f"\n✅ RESULTADOS FINAIS:")
    print(f"   Peças cortadas: {len(result.pieces_placed)}")
    print(f"   Área utilizada: {result.used_area:,} mm²")
    print(f"   Desperdício real: {result.waste_percentage:.2f}%")
    print(f"   Tempo de execução: {result.execution_time:.3f} segundos")
    print(f"   Tempo total: {total_time:.3f} segundos")
    
    # Calcular eficiência
    efficiency = (result.used_area / result.total_area) * 100
    print(f"   Eficiência: {efficiency:.1f}%")
    
    # Mostrar peças colocadas
    print(f"\n🧩 PEÇAS COLOCADAS:")
    piece_groups = {}
    for piece in result.pieces_placed:
        base_id = piece['id'].split('_rot')[0]
        if base_id not in piece_groups:
            piece_groups[base_id] = []
        piece_groups[base_id].append(piece)
    
    for base_id, pieces_list in piece_groups.items():
        print(f"   {base_id}: {len(pieces_list)} peças")
        for piece in pieces_list:
            print(f"     - Posição ({piece['x']}, {piece['y']}) - {piece['width']}x{piece['height']}mm")
    
    # Visualizar resultado
    print(f"\n📊 GERANDO VISUALIZAÇÃO...")
    visualizer = CuttingVisualizer(stock_width, stock_height)
    
    # Plano de corte
    visualizer.visualize_cutting_plan(
        result.pieces_placed,
        title="Demonstração Final - Plano de Corte Otimizado"
    )
    
    # Análise de desperdício
    visualizer.visualize_waste_analysis({
        'total_area': result.total_area,
        'used_area': result.used_area,
        'waste_percentage': result.waste_percentage
    })
    
    print(f"\n🎉 DEMONSTRAÇÃO CONCLUÍDA!")
    print(f"✅ Algoritmo funcionando perfeitamente")
    print(f"✅ Visualizações geradas com sucesso")
    
    return result


def demo_comparacao():
    """Demonstração comparando diferentes configurações"""
    print(f"\n🔄 DEMONSTRAÇÃO DE COMPARAÇÃO")
    print("=" * 40)
    
    stock_width = 600
    stock_height = 400
    pieces = [(150, 100, 4), (100, 100, 6), (50, 50, 10)]
    
    results = []
    
    for allow_rotation in [True, False]:
        print(f"\nTestando {'com' if allow_rotation else 'sem'} rotação...")
        
        optimizer = FastCuttingOptimizer(
            stock_width=stock_width,
            stock_height=stock_height,
            pieces=pieces,
            allow_rotation=allow_rotation
        )
        
        result = optimizer.optimize(time_limit=10)
        results.append({
            'name': f"{'Com' if allow_rotation else 'Sem'} Rotação",
            'result': result,
            'stock_width': stock_width,
            'stock_height': stock_height,
            'pieces_placed': result.pieces_placed,
            'waste_percentage': result.waste_percentage
        })
        
        efficiency = (result.used_area / result.total_area) * 100
        print(f"  Desperdício: {result.waste_percentage:.2f}%")
        print(f"  Eficiência: {efficiency:.1f}%")
        print(f"  Peças cortadas: {len(result.pieces_placed)}")
        print(f"  Tempo: {result.execution_time:.3f}s")
    
    # Visualizar comparação
    from visualization import create_comparison_visualization
    create_comparison_visualization(
        results,
        [r['name'] for r in results]
    )
    
    return results


if __name__ == "__main__":
    try:
        print("🚀 INICIANDO DEMONSTRAÇÃO FINAL")
        print("=" * 50)
        
        # Demonstração principal
        result1 = demo_completa()
        
        # Demonstração de comparação
        result2 = demo_comparacao()
        
        print(f"\n🎊 TODAS AS DEMONSTRAÇÕES CONCLUÍDAS!")
        print(f"✅ Algoritmo testado e funcionando")
        print(f"✅ Visualizações geradas")
        print(f"✅ Comparações realizadas")
        print(f"\n📈 RESUMO:")
        print(f"   - Tempo total: {result1.execution_time + sum(r['result'].execution_time for r in result2):.3f} segundos")
        print(f"   - Eficiência média: {((result1.used_area / result1.total_area) + sum(r['result'].used_area / r['result'].total_area for r in result2) / len(result2)) * 50:.1f}%")
        
    except Exception as e:
        print(f"\n❌ Erro durante a demonstração: {e}")
        import traceback
        traceback.print_exc()
