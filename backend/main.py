#!/usr/bin/env python3
"""
Script principal para execução do algoritmo de otimização de corte bidimensional
"""

import argparse
import json
import sys
from pathlib import Path

from src.api import api


def main():
    parser = argparse.ArgumentParser(
        description="Algoritmo de Otimização de Corte Bidimensional",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python main.py --config examples/config_example.json
  python main.py --stock 1000 800 --pieces "200,300,2" "150,200,3"
  python main.py --interactive
        """
    )
    
    # Opções de entrada
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        '--config', '-c',
        type=str,
        help='Arquivo de configuração JSON'
    )
    input_group.add_argument(
        '--stock', '-s',
        nargs=2,
        type=int,
        metavar=('WIDTH', 'HEIGHT'),
        help='Dimensões do material base (largura altura)'
    )
    input_group.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Modo interativo'
    )
    
    # Parâmetros adicionais
    parser.add_argument(
        '--pieces', '-p',
        nargs='+',
        type=str,
        help='Lista de peças no formato "largura,altura,quantidade"'
    )
    parser.add_argument(
        '--no-rotation',
        action='store_true',
        help='Desabilitar rotação das peças'
    )
    parser.add_argument(
        '--no-guillotine',
        action='store_true',
        help='Desabilitar restrição de corte guilhotina'
    )
    parser.add_argument(
        '--time-limit', '-t',
        type=int,
        default=300,
        help='Limite de tempo para otimização em segundos (padrão: 300)'
    )
    
    # Opções de saída
    parser.add_argument(
        '--output-dir', '-o',
        type=str,
        default='output',
        help='Diretório de saída (padrão: output)'
    )
    parser.add_argument(
        '--no-visualization',
        action='store_true',
        help='Desabilitar visualização gráfica'
    )
    parser.add_argument(
        '--export-csv',
        action='store_true',
        help='Exportar resultados em CSV'
    )
    parser.add_argument(
        '--export-instructions',
        action='store_true',
        help='Exportar instruções de corte'
    )
    parser.add_argument(
        '--json-output',
        action='store_true',
        help='Retornar resultado em formato JSON'
    )
    
    args = parser.parse_args()
    
    # Criar diretório de saída
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Carregar configuração
        if args.config:
            response = api.load_config(args.config)
            if not response['success']:
                print(f"Erro ao carregar configuração: {response['error']}")
                sys.exit(1)
            config = response['config']
        elif args.stock:
            # Configurar a partir dos argumentos da linha de comando
            stock_width, stock_height = args.stock
            
            if not args.pieces:
                print("Erro: --pieces é obrigatório quando usando --stock")
                sys.exit(1)
            
            pieces = []
            for piece_str in args.pieces:
                try:
                    parts = piece_str.split(',')
                    if len(parts) == 3:
                        width, height, quantity = map(int, parts)
                        pieces.append((width, height, quantity, True, f"Peça {len(pieces) + 1}"))  # Com rotação por padrão
                    elif len(parts) == 4:
                        width, height, quantity, allow_rotation = map(int, parts[:3] + [parts[3] == '1'])
                        pieces.append((width, height, quantity, allow_rotation, f"Peça {len(pieces) + 1}"))
                    elif len(parts) == 5:
                        width, height, quantity, allow_rotation, description = map(int, parts[:4]) + [parts[4]]
                        pieces.append((width, height, quantity, allow_rotation, description))
                    else:
                        print(f"Erro: formato inválido para peça '{piece_str}'. Use 'largura,altura,quantidade' ou 'largura,altura,quantidade,rotação' ou 'largura,altura,quantidade,rotação,descrição'")
                        sys.exit(1)
                except ValueError:
                    print(f"Erro: formato inválido para peça '{piece_str}'. Use 'largura,altura,quantidade' ou 'largura,altura,quantidade,rotação' ou 'largura,altura,quantidade,rotação,descrição'")
                    sys.exit(1)
            
            config = {
                'stock_width': stock_width,
                'stock_height': stock_height,
                'pieces': pieces,
                'allow_rotation': not args.no_rotation,
                'time_limit': args.time_limit,
                'optimization_mode': 'refined',
                'name': 'Configuração via linha de comando'
            }
        else:
            # Modo interativo
            config = interactive_config()
        
        # Executar otimização
        if not args.json_output:
            print(f"\n🔧 EXECUTANDO OTIMIZAÇÃO...")
            print(f"Limite de tempo: {config['time_limit']} segundos")
        
        selected_algorithm = config.get('algorithm', 'fast')
        selected_time_limit = int(config.get('time_limit', args.time_limit))
        selected_optimization_mode = config.get('optimization_mode', 'refined')
        # No fluxo do Electron (--json-output), priorizamos resposta estável e rápida.
        if args.json_output:
            selected_algorithm = 'fast'
            selected_time_limit = max(1, selected_time_limit)

        result = api.optimize_cutting(
            stock_width=config['stock_width'],
            stock_height=config['stock_height'],
            pieces=config['pieces'],
            algorithm=selected_algorithm,
            time_limit=selected_time_limit,
            optimization_mode=selected_optimization_mode
        )
        
        if not result['success']:
            print(f"Erro na otimização: {result['error']}")
            sys.exit(1)
        
        # Retornar resultado em JSON se solicitado
        if args.json_output:
            print(json.dumps(result, indent=2))
        else:
            # Mostrar resultados
            print(f"\n✅ RESULTADOS")
            print(f"Algoritmo usado: {result['algorithm']}")
            print(f"Peças cortadas: {len(result['result']['pieces_placed'])}")
            print(f"Área utilizada: {result['result']['used_area']:,} mm²")
            print(f"Desperdício: {result['result']['waste_percentage']:.2f}%")
            print(f"Tempo de execução: {result['result']['execution_time']:.2f} segundos")
            print(f"Solução ótima: {'Sim' if result['result']['is_optimal'] else 'Não'}")
            print(f"Eficiência de área: {result['efficiency_metrics']['area_efficiency']:.1f}%")
            
            # Visualização
            if not args.no_visualization:
                print(f"\n📊 GERANDO VISUALIZAÇÕES...")
                viz_result = api.generate_visualization(result, str(output_dir))
                if viz_result['success']:
                    print(f"Visualizações salvas em: {output_dir}")
                else:
                    print(f"Erro ao gerar visualizações: {viz_result['error']}")
            
            # Exportar resultados
            if args.export_csv or args.export_instructions:
                print(f"\n💾 EXPORTANDO RESULTADOS...")
                save_result = api.save_results(result, str(output_dir), args.export_csv, args.export_instructions)
                if save_result['success']:
                    for file_type, file_path in save_result['saved_files'].items():
                        print(f"{file_type.upper()} salvo em: {file_path}")
                else:
                    print(f"Erro ao salvar resultados: {save_result['error']}")
            
            print(f"\n🎉 Otimização concluída com sucesso!")
        
    except KeyboardInterrupt:
        print("\n\n❌ Otimização interrompida pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro durante a execução: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def interactive_config():
    """Configuração interativa"""
    print("🔧 CONFIGURAÇÃO INTERATIVA")
    print("=" * 40)
    
    # Dimensões do material base
    print("\n📏 DIMENSÕES DO MATERIAL BASE")
    stock_width = int(input("Largura (mm): "))
    stock_height = int(input("Altura (mm): "))
    
    # Peças
    print("\n🧩 PEÇAS A SEREM CORTADAS")
    pieces = []
    
    while True:
        try:
            piece_input = input("Peça (largura,altura,quantidade) ou 'fim' para terminar: ").strip()
            
            if piece_input.lower() in ['fim', 'f', '']:
                break
            
            parts = piece_input.split(',')
            if len(parts) == 3:
                width, height, quantity = map(int, parts)
                pieces.append((width, height, quantity, True, f"Peça {len(pieces) + 1}"))  # Com rotação por padrão
                print(f"Adicionada: {width}x{height}mm, quantidade: {quantity}, com rotação")
            elif len(parts) == 4:
                width, height, quantity, allow_rotation = map(int, parts[:3] + [parts[3] == '1'])
                pieces.append((width, height, quantity, allow_rotation, f"Peça {len(pieces) + 1}"))
                rotation_status = "com rotação" if allow_rotation else "sem rotação"
                print(f"Adicionada: {width}x{height}mm, quantidade: {quantity}, {rotation_status}")
            elif len(parts) == 5:
                width, height, quantity, allow_rotation, description = map(int, parts[:4]) + [parts[4]]
                pieces.append((width, height, quantity, allow_rotation, description))
                rotation_status = "com rotação" if allow_rotation else "sem rotação"
                print(f"Adicionada: {width}x{height}mm, quantidade: {quantity}, {rotation_status}, descrição: {description}")
            else:
                print("Formato inválido. Use: largura,altura,quantidade ou largura,altura,quantidade,rotação ou largura,altura,quantidade,rotação,descrição")
                continue
            
        except ValueError:
            print("Formato inválido. Use: largura,altura,quantidade")
        except KeyboardInterrupt:
            break
    
    if not pieces:
        print("Erro: Nenhuma peça foi definida")
        sys.exit(1)
    
    # Opções
    print("\n⚙️  OPÇÕES")
    allow_rotation = input("Permitir rotação das peças? (s/n, padrão: s): ").strip().lower() != 'n'
    guillotine_cut = input("Usar corte guilhotina? (s/n, padrão: s): ").strip().lower() != 'n'
    
    try:
        time_limit = int(input("Limite de tempo em segundos (padrão: 300): ") or "300")
    except ValueError:
        time_limit = 300
    
    # Criar objeto de configuração
    config = {
        'stock_width': stock_width,
        'stock_height': stock_height,
        'pieces': pieces,
        'allow_rotation': allow_rotation,
        'time_limit': time_limit,
        'name': 'Configuração Interativa'
    }
    
    return config


if __name__ == "__main__":
    main()
