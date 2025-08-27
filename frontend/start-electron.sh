#!/bin/bash

# Script para iniciar o aplicativo Electron
echo "🚀 Iniciando Cutting Optimization..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório frontend/"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Iniciar o aplicativo Electron
echo "⚡ Iniciando aplicativo Electron..."
npm run electron-dev
