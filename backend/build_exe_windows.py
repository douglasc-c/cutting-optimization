#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para criar executável standalone do backend para Windows usando PyInstaller
Este script cria um executável que não requer Python instalado no sistema do usuário
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_pyinstaller():
    """Verifica se PyInstaller está instalado"""
    try:
        import PyInstaller
        return True
    except ImportError:
        return False

def install_pyinstaller():
    """Instala PyInstaller"""
    print("[*] Instalando PyInstaller...")
    try:
        # Tentar instalar normalmente primeiro
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    except subprocess.CalledProcessError:
        # Se falhar, tentar com --user
        print("[!] Tentando instalar com --user...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "pyinstaller"])
        except subprocess.CalledProcessError:
            print("[ERROR] Erro ao instalar PyInstaller.")
            print("        Por favor, instale manualmente: pip install pyinstaller")
            print("        Ou use: pip install --user pyinstaller")
            raise

def install_dependencies():
    """Instala todas as dependências do backend"""
    backend_dir = Path(__file__).parent
    requirements_file = backend_dir / "requirements.txt"
    
    print("[*] Instalando dependencias do backend...")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
    ])

def build_executable():
    """Constrói o executável standalone"""
    backend_dir = Path(__file__).parent.resolve()
    main_py = backend_dir / "main.py"
    dist_dir = backend_dir / "dist"
    build_dir = backend_dir / "build"
    
    # Verificar se main.py existe
    if not main_py.exists():
        print(f"[ERROR] Arquivo main.py nao encontrado em: {main_py}")
        return False
    
    # Limpar builds anteriores
    if dist_dir.exists():
        print("[*] Limpando builds anteriores...")
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    # Usar caminho relativo para o spec file (normalizar para Windows)
    main_py_str = str(main_py).replace('\\', '/')
    
    # Criar spec file para melhor controle
    spec_content = f"""# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    [r'{main_py_str}'],
    pathex=[],
    binaries=[],
    datas=[
        ('src', 'src'),
        ('examples', 'examples'),
    ],
    hiddenimports=[
        'src.api',
        'src.core',
        'src.core.cutting_optimizer',
        'src.core.cutting_optimizer_simple',
        'src.core.cutting_optimizer_fast',
        'src.core.cutting_optimizer_improved',
        'src.core.cutting_optimizer_smart',
        'src.core.cutting_optimizer_enhanced',
        'src.utils',
        'src.visualization',
        'numpy',
        'scipy',
        'pulp',
        'ortools',
        'matplotlib',
        'pandas',
        'json',
        'argparse',
        'pathlib',
        'typing',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='cutting-optimization-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""
    
    spec_file = backend_dir / "cutting-optimization-backend.spec"
    with open(spec_file, "w", encoding="utf-8") as f:
        f.write(spec_content)
    
    print("[*] Construindo executavel standalone...")
    print(f"[*] Diretorio: {backend_dir}")
    print(f"[*] Arquivo principal: {main_py}")
    print(f"[*] Spec file: {spec_file}")
    
    # Executar PyInstaller no diretório do backend
    subprocess.check_call([
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        str(spec_file)
    ], cwd=str(backend_dir))
    
    exe_path = dist_dir / "cutting-optimization-backend.exe"
    
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024*1024)
        print(f"\n[OK] Executavel criado com sucesso!")
        print(f"[*] Localizacao: {exe_path}")
        print(f"[*] Tamanho: {size_mb:.2f} MB")
        
        # Copiar para a raiz do backend para facilitar acesso
        target_path = backend_dir / "cutting-optimization-backend.exe"
        if target_path.exists():
            target_path.unlink()
        shutil.copy2(exe_path, target_path)
        print(f"[*] Copiado para: {target_path}")
        
        return True
    else:
        print("[ERROR] Erro: Executavel nao foi criado!")
        return False

def main():
    """Função principal"""
    print("=" * 60)
    print("BUILD DO BACKEND PARA WINDOWS")
    print("=" * 60)
    print()
    
    # Verificar Python
    print(f"Python: {sys.version}")
    print(f"Diretorio de trabalho: {Path.cwd()}")
    print()
    
    # Verificar e instalar PyInstaller
    if not check_pyinstaller():
        print("[!] PyInstaller nao encontrado")
        install_pyinstaller()
    else:
        print("[OK] PyInstaller encontrado")
    
    print()
    
    # Instalar dependências
    install_dependencies()
    print()
    
    # Construir executável
    success = build_executable()
    print()
    
    if success:
        print("=" * 60)
        print("[OK] BUILD CONCLUIDO COM SUCESSO!")
        print("=" * 60)
        print()
        print("Proximos passos:")
        print("  1. O executavel esta em: backend/cutting-optimization-backend.exe")
        print("  2. Execute o build do Electron para criar o instalador completo")
        print()
        return 0
    else:
        print("=" * 60)
        print("[ERROR] BUILD FALHOU!")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())

