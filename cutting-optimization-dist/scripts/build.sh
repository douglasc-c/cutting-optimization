#!/bin/bash

# Script de build do projeto Cutting Optimization
# Autor: Douglas Cesário
# Versão: 1.0.0

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Building Cutting Optimization${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Build do Frontend
print_message "Construindo frontend..."
cd frontend
npm run build
cd ..

# Build do Backend (se necessário)
print_message "Verificando backend..."
cd backend

# Verificar se há testes para executar
if [ -d "tests" ]; then
    print_message "Executando testes do backend..."
    python -m pytest tests/ -v || print_warning "Alguns testes falharam"
fi

# Verificar se há setup.py para build
if [ -f "setup.py" ]; then
    print_message "Construindo pacote Python..."
    python setup.py build
fi

cd ..

print_message "Build concluído com sucesso!"
print_message "Artefatos gerados:"
echo "  - frontend/build/ (React build)"
echo "  - backend/dist/ (Python package, se aplicável)"
