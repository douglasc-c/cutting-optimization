#!/bin/bash

# Script de validação do projeto Cutting Optimization
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
    echo -e "${BLUE}  Validando Cutting Optimization${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para verificar se um arquivo existe
file_exists() {
    [ -f "$1" ]
}

# Função para verificar se um diretório existe
dir_exists() {
    [ -d "$1" ]
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Contador de erros
errors=0
warnings=0

print_message "Verificando estrutura do projeto..."

# Verificar diretórios principais
required_dirs=("backend" "frontend" "docs" "scripts" "config")
for dir in "${required_dirs[@]}"; do
    if dir_exists "$dir"; then
        print_message "✅ Diretório $dir existe"
    else
        print_error "❌ Diretório $dir não encontrado"
        ((errors++))
    fi
done

# Verificar arquivos principais
required_files=("package.json" "Makefile" ".gitignore" "README.md")
for file in "${required_files[@]}"; do
    if file_exists "$file"; then
        print_message "✅ Arquivo $file existe"
    else
        print_error "❌ Arquivo $file não encontrado"
        ((errors++))
    fi
done

# Verificar scripts
print_message "Verificando scripts..."
if file_exists "scripts/start.sh" && [ -x "scripts/start.sh" ]; then
    print_message "✅ Script start.sh existe e é executável"
else
    print_error "❌ Script start.sh não existe ou não é executável"
    ((errors++))
fi

if file_exists "scripts/build.sh" && [ -x "scripts/build.sh" ]; then
    print_message "✅ Script build.sh existe e é executável"
else
    print_error "❌ Script build.sh não existe ou não é executável"
    ((errors++))
fi

if file_exists "scripts/clean.sh" && [ -x "scripts/clean.sh" ]; then
    print_message "✅ Script clean.sh existe e é executável"
else
    print_error "❌ Script clean.sh não existe ou não é executável"
    ((errors++))
fi

# Verificar backend
print_message "Verificando backend..."
if dir_exists "backend/src"; then
    print_message "✅ Diretório backend/src existe"
else
    print_error "❌ Diretório backend/src não encontrado"
    ((errors++))
fi

if file_exists "backend/requirements.txt"; then
    print_message "✅ requirements.txt existe"
else
    print_error "❌ requirements.txt não encontrado"
    ((errors++))
fi

if file_exists "backend/main.py"; then
    print_message "✅ main.py existe"
else
    print_error "❌ main.py não encontrado"
    ((errors++))
fi

# Verificar frontend
print_message "Verificando frontend..."
if file_exists "frontend/package.json"; then
    print_message "✅ package.json do frontend existe"
else
    print_error "❌ package.json do frontend não encontrado"
    ((errors++))
fi

if dir_exists "frontend/src"; then
    print_message "✅ Diretório frontend/src existe"
else
    print_error "❌ Diretório frontend/src não encontrado"
    ((errors++))
fi

# Verificar dependências do sistema
print_message "Verificando dependências do sistema..."

if command_exists "node"; then
    node_version=$(node --version)
    print_message "✅ Node.js encontrado: $node_version"
else
    print_error "❌ Node.js não encontrado"
    ((errors++))
fi

if command_exists "npm"; then
    npm_version=$(npm --version)
    print_message "✅ npm encontrado: $npm_version"
else
    print_error "❌ npm não encontrado"
    ((errors++))
fi

if command_exists "python3"; then
    python_version=$(python3 --version)
    print_message "✅ Python3 encontrado: $python_version"
else
    print_error "❌ Python3 não encontrado"
    ((errors++))
fi

if command_exists "pip3"; then
    print_message "✅ pip3 encontrado"
else
    print_error "❌ pip3 não encontrado"
    ((errors++))
fi

# Verificar configurações
print_message "Verificando configurações..."
if file_exists "config/project.json"; then
    print_message "✅ project.json existe"
else
    print_warning "⚠️ project.json não encontrado"
    ((warnings++))
fi

if file_exists "config/development.json"; then
    print_message "✅ development.json existe"
else
    print_warning "⚠️ development.json não encontrado"
    ((warnings++))
fi

# Verificar documentação
print_message "Verificando documentação..."
if file_exists "docs/ESTRUTURA_PROJETO.md"; then
    print_message "✅ ESTRUTURA_PROJETO.md existe"
else
    print_warning "⚠️ ESTRUTURA_PROJETO.md não encontrado"
    ((warnings++))
fi

# Verificar .gitignore
print_message "Verificando .gitignore..."
if file_exists ".gitignore"; then
    if grep -q "node_modules" .gitignore; then
        print_message "✅ .gitignore inclui node_modules"
    else
        print_warning "⚠️ .gitignore não inclui node_modules"
        ((warnings++))
    fi
    
    if grep -q "__pycache__" .gitignore; then
        print_message "✅ .gitignore inclui __pycache__"
    else
        print_warning "⚠️ .gitignore não inclui __pycache__"
        ((warnings++))
    fi
else
    print_error "❌ .gitignore não encontrado"
    ((errors++))
fi

# Resumo
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  RESUMO DA VALIDAÇÃO${NC}"
echo -e "${BLUE}================================${NC}"

if [ $errors -eq 0 ]; then
    print_message "✅ Validação concluída com sucesso!"
    if [ $warnings -gt 0 ]; then
        print_warning "⚠️ $warnings avisos encontrados"
    fi
    exit 0
else
    print_error "❌ $errors erros encontrados"
    if [ $warnings -gt 0 ]; then
        print_warning "⚠️ $warnings avisos encontrados"
    fi
    exit 1
fi
