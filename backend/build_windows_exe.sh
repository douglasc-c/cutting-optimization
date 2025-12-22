#!/bin/bash
# Script para gerar executável standalone do backend para Windows
# Execute este script no Windows usando Git Bash ou WSL

set -e

echo "========================================"
echo "Building Windows Standalone Executable"
echo "========================================"
echo ""

# Verificar se PyInstaller está instalado
if ! python -m pip show pyinstaller &> /dev/null; then
    echo "PyInstaller não encontrado. Instalando..."
    python -m pip install pyinstaller
fi

echo ""
echo "Instalando dependências do backend..."
python -m pip install -r requirements.txt

echo ""
echo "Gerando executável standalone..."
echo ""

# Criar executável standalone
pyinstaller --onefile \
    --name=cutting-optimization-backend \
    --console \
    --clean \
    --noconfirm \
    --add-data "src;src" \
    --add-data "examples;examples" \
    --hidden-import src.api \
    --hidden-import src.core \
    --hidden-import src.utils \
    --hidden-import src.visualization \
    --hidden-import numpy \
    --hidden-import scipy \
    --hidden-import pulp \
    --hidden-import ortools \
    --hidden-import matplotlib \
    --hidden-import pandas \
    --hidden-import json \
    --hidden-import argparse \
    --hidden-import pathlib \
    main.py

if [ $? -ne 0 ]; then
    echo ""
    echo "ERRO: Falha ao gerar executável!"
    exit 1
fi

echo ""
echo "========================================"
echo "Executável gerado com sucesso!"
echo "========================================"
echo ""
echo "Arquivo gerado: dist/cutting-optimization-backend.exe"
echo ""
echo "Copiando para raiz do backend..."
cp dist/cutting-optimization-backend.exe cutting-optimization-backend.exe

echo ""
echo "========================================"
echo "Concluído!"
echo "========================================"
echo ""
echo "O arquivo cutting-optimization-backend.exe está pronto"
echo "para ser incluído no instalador Electron."
echo ""

