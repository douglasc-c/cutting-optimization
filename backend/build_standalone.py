#!/usr/bin/env python3
"""
Script para criar executável standalone do backend usando PyInstaller
"""

import PyInstaller.__main__
import sys
import os
from pathlib import Path

def build_standalone():
    """Cria executável standalone do backend"""
    
    # Caminhos
    backend_dir = Path(__file__).parent
    main_py = backend_dir / 'main.py'
    spec_file = backend_dir / 'main.spec'
    
    # Verificar se PyInstaller está instalado
    try:
        import PyInstaller
    except ImportError:
        print("PyInstaller não está instalado. Instalando...")
        os.system(f"{sys.executable} -m pip install pyinstaller")
    
    # Parâmetros do PyInstaller
    args = [
        str(main_py),
        '--name=cutting-optimization-backend',
        '--onefile',  # Criar um único arquivo executável
        '--console',  # Manter console para logs
        '--clean',    # Limpar cache antes de construir
        '--noconfirm', # Não pedir confirmação
        '--add-data', f'src{os.pathsep}src',  # Incluir código fonte
        '--add-data', f'examples{os.pathsep}examples',  # Incluir exemplos
        '--hidden-import', 'src.api',
        '--hidden-import', 'src.core',
        '--hidden-import', 'src.utils',
        '--hidden-import', 'src.visualization',
        '--hidden-import', 'numpy',
        '--hidden-import', 'scipy',
        '--hidden-import', 'pulp',
        '--hidden-import', 'ortools',
        '--hidden-import', 'matplotlib',
        '--hidden-import', 'pandas',
    ]
    
    print("Construindo executável standalone do backend...")
    print(f"Comando: pyinstaller {' '.join(args)}")
    
    PyInstaller.__main__.run(args)
    
    print("\n✅ Executável criado com sucesso!")
    print(f"Localização: {backend_dir / 'dist' / 'cutting-optimization-backend.exe'}")

if __name__ == '__main__':
    build_standalone()



