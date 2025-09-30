"""
Exemplo de uso do algoritmo de otimização de corte bidimensional
"""

from cutting_optimizer import CuttingOptimizer
from visualization import CuttingVisualizer
from utils import CuttingConfig, generate_test_cases, calculate_efficiency_metrics
import time


def example_simple_cutting():
    """Exemplo simples de otimização de corte"""
    print("=== EXEMPLO SIMPLES DE CORTE ===")
    
    # Configurar o problema
    stock_width = 1000  # mm
    stock_height = 800  # mm
    pieces = [
        (200, 300, 2),  # 2 peças de 200x300mm
        (150, 200, 3),  # 3 peças de 150x200mm
        (100, 100, 5)   # 5 peças de 100x100mm
    ]
    
    # Criar otimizador
    optimizer = CuttingOptimizer(
        stock_width=stock_width,
        stock_height=stock_height,
        pieces=pieces,
        allow_rotation=True,
        guillotine_cut=True
    )
    
    # Mostrar estatísticas do problema
    stats = optimizer.get_statistics()
    print(f"Material base: {stats['stock_dimensions'][0]}x{stats['stock_dimensions'][1]} mm")
    print(f"Área total: {stats['stock_area']:,} mm²")
    print(f"Total de peças: {stats['total_pieces']}")
    print(f"Área das peças: {stats['total_piece_area']:,} mm²")
    print(f"Desperdício teórico: {stats['theoretical_waste']:.1f}%")
    
    # Executar otimização
    print("\nExecutando otimização...")
    result = optimizer.optimize(time_limit=60)
    
    # Mostrar resultados
    print(f"\nResultados:")
    print(f"Peças cortadas: {len(result.pieces_placed)}")
    print(f"Área utilizada: {result.used_area:,} mm²")
    print(f"Desperdício: {result.waste_percentage:.2f}%")
    print(f"Tempo de execução: {result.execution_time:.2f} segundos")
    print(f"Solução ótima: {'Sim' if result.is_optimal else 'Não'}")
    
    # Visualizar resultado
    visualizer = CuttingVisualizer(stock_width, stock_height)
    visualizer.visualize_cutting_plan(
        result.pieces_placed,
        title="Exemplo Simples - Plano de Corte"
    )
    
    # Mostrar análise de desperdício
    visualizer.visualize_waste_analysis({
        'total_area': result.total_area,
        'used_area': result.used_area,
        'waste_percentage': result.waste_percentage
    })
    
    return result


def example_comparison():
    """Exemplo comparando diferentes configurações"""
    print("\n=== COMPARAÇÃO DE CONFIGURAÇÕES ===")
    
    # Configurações para comparar
    configs = [
        {
            'name': 'Com Rotação',
            'allow_rotation': True,
            'guillotine_cut': True
        },
        {
            'name': 'Sem Rotação',
            'allow_rotation': False,
            'guillotine_cut': True
        }
    ]
    
    stock_width = 1200
    stock_height = 800
    pieces = [(300, 200, 3), (150, 100, 8), (200, 150, 4)]
    
    results = []
    
    for config in configs:
        print(f"\nTestando: {config['name']}")
        
        optimizer = CuttingOptimizer(
            stock_width=stock_width,
            stock_height=stock_height,
            pieces=pieces,
            allow_rotation=config['allow_rotation'],
            guillotine_cut=config['guillotine_cut']
        )
        
        result = optimizer.optimize(time_limit=60)
        results.append({
            'name': config['name'],
            'result': result,
            'stock_width': stock_width,
            'stock_height': stock_height,
            'pieces_placed': result.pieces_placed,
            'waste_percentage': result.waste_percentage
        })
        
        print(f"Desperdício: {result.waste_percentage:.2f}%")
        print(f"Tempo: {result.execution_time:.2f}s")
    
    # Visualizar comparação
    visualizer = CuttingVisualizer(stock_width, stock_height)
    
    # Criar visualização comparativa
    from visualization import create_comparison_visualization
    create_comparison_visualization(
        results,
        [r['name'] for r in results],
        title="Comparação de Configurações"
    )
    
    return results


def example_test_cases():
    """Executa casos de teste predefinidos"""
    print("\n=== CASOS DE TESTE ===")
    
    test_cases = generate_test_cases()
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- Caso de Teste {i}: {test_case.name} ---")
        
        # Validar se as peças cabem no material
        from utils import validate_pieces_fit_stock
        validation = validate_pieces_fit_stock(
            test_case.stock_width,
            test_case.stock_height,
            test_case.pieces
        )
        
        if validation['has_oversized_pieces']:
            print("⚠️  Peças maiores que o material base encontradas!")
            continue
        
        if not validation['fits_in_area']:
            print("⚠️  Área total das peças excede o material base!")
            continue
        
        # Criar otimizador
        optimizer = CuttingOptimizer(
            stock_width=test_case.stock_width,
            stock_height=test_case.stock_height,
            pieces=test_case.pieces,
            allow_rotation=test_case.allow_rotation,
            guillotine_cut=test_case.guillotine_cut
        )
        
        # Executar otimização
        start_time = time.time()
        result = optimizer.optimize(time_limit=test_case.time_limit)
        total_time = time.time() - start_time
        
        # Calcular métricas de eficiência
        efficiency = calculate_efficiency_metrics(result)
        
        # Mostrar resultados
        print(f"Material: {test_case.stock_width}x{test_case.stock_height} mm")
        print(f"Peças cortadas: {len(result.pieces_placed)}")
        print(f"Eficiência de área: {efficiency['area_efficiency']:.1f}%")
        print(f"Desperdício: {result.waste_percentage:.2f}%")
        print(f"Tempo total: {total_time:.2f}s")
        print(f"Ótimo: {'Sim' if result.is_optimal else 'Não'}")
        
        # Visualizar se não for muito complexo
        if len(result.pieces_placed) <= 20:
            visualizer = CuttingVisualizer(test_case.stock_width, test_case.stock_height)
            visualizer.visualize_cutting_plan(
                result.pieces_placed,
                title=f"Teste: {test_case.name}"
            )


def example_export_results():
    """Exemplo de exportação de resultados"""
    print("\n=== EXPORTAÇÃO DE RESULTADOS ===")
    
    # Configurar problema
    stock_width = 1000
    stock_height = 800
    pieces = [(200, 300, 2), (150, 200, 3), (100, 100, 5)]
    
    optimizer = CuttingOptimizer(stock_width, stock_height, pieces)
    result = optimizer.optimize(time_limit=60)
    
    # Exportar resultados
    from utils import save_results_to_csv, export_cutting_instructions
    
    save_results_to_csv(result, "resultado_corte.csv")
    export_cutting_instructions(result, "instrucoes_corte.txt")
    
    print("Resultados exportados:")
    print("- resultado_corte.csv")
    print("- instrucoes_corte.txt")
    
    # Mostrar instruções
    print("\nPrimeiras linhas das instruções:")
    with open("instrucoes_corte.txt", 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i < 10:  # Mostrar apenas as primeiras 10 linhas
                print(line.rstrip())
            else:
                break


if __name__ == "__main__":
    print("ALGORITMO DE OTIMIZAÇÃO DE CORTE BIDIMENSIONAL")
    print("=" * 50)
    
    try:
        # Executar exemplos
        example_simple_cutting()
        example_comparison()
        example_test_cases()
        example_export_results()
        
        print("\n✅ Todos os exemplos executados com sucesso!")
        
    except Exception as e:
        print(f"\n❌ Erro durante a execução: {e}")
        import traceback
        traceback.print_exc()
