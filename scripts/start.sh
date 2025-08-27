#!/bin/bash

# Script de inicialização do projeto Cutting Optimization
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
    echo -e "${BLUE}  Cutting Optimization System${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Verificar dependências do Node.js
print_message "Verificando dependências do Node.js..."
if [ ! -d "node_modules" ]; then
    print_warning "Instalando dependências do Node.js..."
    npm install
else
    print_message "Dependências do Node.js já instaladas"
fi

# Verificar dependências do Python
print_message "Verificando dependências do Python..."
cd backend
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    print_warning "Criando ambiente virtual Python..."
    python3 -m venv venv
fi

# Ativar ambiente virtual se existir
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Instalar dependências Python
if [ -f "requirements.txt" ]; then
    print_message "Instalando dependências Python..."
    pip install -r requirements.txt
fi

cd ..

# Verificar se o Electron está instalado
print_message "Verificando Electron..."
if ! command -v electron &> /dev/null; then
    print_warning "Electron não encontrado. Instalando..."
    npm install -g electron
fi

print_message "Iniciando aplicação..."
npm run start:electron
