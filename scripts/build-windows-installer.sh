#!/bin/bash
# Script para gerar instalador Windows completo (.exe)
# Inclui tanto o frontend Electron quanto o backend Python empacotado
# O usuário final não precisa instalar Python ou Node.js

set -e

echo "========================================"
echo "BUILD DO INSTALADOR WINDOWS COMPLETO"
echo "========================================"
echo ""

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📁 Diretório do projeto: $PROJECT_ROOT"
echo ""

# ========================================
# PASSO 1: Build do Backend (PyInstaller)
# ========================================
echo "========================================"
echo "PASSO 1: Gerando executável do backend"
echo "========================================"
echo ""

cd backend

# Verificar se Python está disponível
if ! command -v python3 &> /dev/null; then
    echo "❌ ERRO: Python3 não encontrado!"
    echo "Por favor, instale Python 3.9 ou superior e tente novamente."
    exit 1
fi

echo "✅ Python encontrado"
python3 --version
echo ""

# Executar script de build do backend
echo "🔨 Executando build do backend..."
python3 build_exe_windows.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO: Falha ao gerar executável do backend!"
    exit 1
fi

echo ""
echo "✅ Executável do backend gerado com sucesso!"
echo ""

# ========================================
# PASSO 2: Build do Frontend (React)
# ========================================
echo "========================================"
echo "PASSO 2: Build do frontend React"
echo "========================================"
echo ""

cd ../frontend

# Verificar se Node.js está disponível
if ! command -v node &> /dev/null; then
    echo "❌ ERRO: Node.js não encontrado!"
    echo "Por favor, instale Node.js 16 ou superior e tente novamente."
    exit 1
fi

echo "✅ Node.js encontrado"
node --version
npm --version
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ ERRO: Falha ao instalar dependências!"
        exit 1
    fi
fi

echo ""
echo "🔨 Executando build do React..."
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO: Falha ao fazer build do React!"
    exit 1
fi

echo ""
echo "✅ Build do React concluído!"
echo ""

# ========================================
# PASSO 3: Build do Electron (Instalador)
# ========================================
echo "========================================"
echo "PASSO 3: Gerando instalador Windows"
echo "========================================"
echo ""

# Verificar se electron-builder está instalado
if ! npm list electron-builder &> /dev/null; then
    echo "📦 Instalando electron-builder..."
    npm install --save-dev electron-builder
fi

echo ""
echo "🔨 Gerando instalador Windows..."
echo "   Isso pode levar alguns minutos..."
echo ""

npm run dist-win

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO: Falha ao gerar instalador!"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ INSTALADOR GERADO COM SUCESSO!"
echo "========================================"
echo ""
echo "📦 O instalador está em: frontend/dist/"
echo ""
echo "📝 Próximos passos:"
echo "   1. Encontre o arquivo .exe em frontend/dist/"
echo "   2. Este instalador inclui tudo necessário"
echo "   3. O usuário não precisa instalar Python ou Node.js"
echo ""
echo "🎉 Pronto para distribuição!"
echo ""

