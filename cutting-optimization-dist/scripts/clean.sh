#!/bin/bash

# Script de limpeza do projeto Cutting Optimization
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
    echo -e "${BLUE}  Cleaning Cutting Optimization${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Limpar frontend
print_message "Limpando frontend..."
cd frontend
rm -rf build/
rm -rf dist/
rm -rf node_modules/
rm -rf .cache/
rm -rf .parcel-cache/
rm -f npm-debug.log*
rm -f yarn-debug.log*
rm -f yarn-error.log*
cd ..

# Limpar backend
print_message "Limpando backend..."
cd backend
rm -rf build/
rm -rf dist/
rm -rf __pycache__/
rm -rf *.egg-info/
rm -rf .pytest_cache/
rm -rf .coverage
rm -rf htmlcov/
rm -f *.pyc
rm -f *.pyo
rm -f *.pyd
rm -f .Python
rm -f pip-log.txt
rm -f pip-delete-this-directory.txt
cd ..

# Limpar arquivos temporários
print_message "Limpando arquivos temporários..."
rm -rf node_modules/
rm -f package-lock.json
rm -f yarn.lock
rm -f *.log
rm -f .DS_Store
rm -f Thumbs.db

# Limpar diretórios de output
rm -rf output/
rm -rf logs/
rm -rf temp/
rm -rf tmp/

print_message "Limpeza concluída com sucesso!"
print_warning "Para reinstalar dependências, execute: npm install"
