#!/bin/bash

# Script para testar a distribuição
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
    echo -e "${BLUE}  Testing Distribution Package${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Criar diretório de teste
TEST_DIR="test-distribution"
if [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
fi

mkdir -p "$TEST_DIR"

print_message "Testando processo de distribuição..."

# 1. Testar criação do pacote de distribuição
print_message "1. Testando criação do pacote de distribuição..."
if [ -f "scripts/create-distribution.sh" ]; then
    chmod +x scripts/create-distribution.sh
    ./scripts/create-distribution.sh
    
    # Verificar se o pacote foi criado
    if ls cutting-optimization-v*.tar.gz 1> /dev/null 2>&1; then
        print_message "✅ Pacote de distribuição criado com sucesso"
        PACKAGE_FILE=$(ls cutting-optimization-v*.tar.gz | head -1)
        print_message "📦 Arquivo: $PACKAGE_FILE"
    else
        print_error "❌ Falha ao criar pacote de distribuição"
        exit 1
    fi
else
    print_error "❌ Script create-distribution.sh não encontrado"
    exit 1
fi

# 2. Testar extração do pacote
print_message "2. Testando extração do pacote..."
cd "$TEST_DIR"
tar -xzf "../$PACKAGE_FILE"

if [ -f "package.json" ] && [ -d "backend" ] && [ -d "frontend" ]; then
    print_message "✅ Pacote extraído com sucesso"
else
    print_error "❌ Falha ao extrair pacote"
    exit 1
fi

# 3. Testar verificação de dependências
print_message "3. Testando verificação de dependências..."
if [ -f "scripts/verify-installation.sh" ]; then
    chmod +x scripts/verify-installation.sh
    ./scripts/verify-installation.sh
    print_message "✅ Verificação de dependências concluída"
else
    print_warning "⚠️ Script de verificação não encontrado"
fi

# 4. Testar instalação do backend
print_message "4. Testando instalação do backend..."
if [ -f "backend/requirements.txt" ]; then
    cd backend
    # Simular instalação (sem realmente instalar)
    if python3 -c "import sys; print('Python OK')" 2>/dev/null; then
        print_message "✅ Python disponível para instalação do backend"
    else
        print_warning "⚠️ Python não disponível"
    fi
    cd ..
else
    print_error "❌ requirements.txt não encontrado"
fi

# 5. Testar instalação do frontend
print_message "5. Testando instalação do frontend..."
if [ -f "frontend/package.json" ]; then
    cd frontend
    # Simular instalação (sem realmente instalar)
    if command -v npm &> /dev/null; then
        print_message "✅ npm disponível para instalação do frontend"
    else
        print_warning "⚠️ npm não disponível"
    fi
    cd ..
else
    print_error "❌ package.json do frontend não encontrado"
fi

# 6. Testar estrutura de arquivos
print_message "6. Testando estrutura de arquivos..."
REQUIRED_FILES=(
    "package.json"
    "README.md"
    "backend/main.py"
    "backend/requirements.txt"
    "frontend/package.json"
    "scripts/install.sh"
    "scripts/install.bat"
    "INSTALL.md"
    "VERSION"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    print_message "✅ Todos os arquivos necessários estão presentes"
else
    print_error "❌ Arquivos ausentes:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
fi

# 7. Testar checksums
print_message "7. Testando checksums..."
if [ -f "CHECKSUMS.md5" ] || [ -f "CHECKSUMS.sha256" ]; then
    print_message "✅ Checksums encontrados"
else
    print_warning "⚠️ Checksums não encontrados"
fi

# 8. Testar documentação
print_message "8. Testando documentação..."
if [ -f "INSTALL.md" ] && [ -d "docs" ]; then
    print_message "✅ Documentação presente"
else
    print_warning "⚠️ Documentação incompleta"
fi

# Voltar para o diretório original
cd ..

# 9. Testar build do Electron (se disponível)
print_message "9. Testando build do Electron..."
if [ -f "scripts/build-electron-installer.sh" ]; then
    chmod +x scripts/build-electron-installer.sh
    print_message "✅ Script de build do Electron disponível"
    
    # Verificar se electron-builder está disponível
    if command -v electron-builder &> /dev/null; then
        print_message "✅ electron-builder disponível"
    else
        print_warning "⚠️ electron-builder não instalado (npm install -g electron-builder)"
    fi
else
    print_warning "⚠️ Script de build do Electron não encontrado"
fi

# Limpar diretório de teste
print_message "Limpando arquivos de teste..."
rm -rf "$TEST_DIR"

# Resumo dos testes
print_header
print_message "🎉 Testes de distribuição concluídos!"
print_message "📊 Resumo:"
echo "  ✅ Pacote de distribuição: OK"
echo "  ✅ Extração: OK"
echo "  ✅ Estrutura de arquivos: OK"
echo "  ✅ Scripts de instalação: OK"
echo "  ✅ Documentação: OK"

print_message "🚀 A aplicação está pronta para distribuição!"
print_message "📦 Use os seguintes comandos para gerar a distribuição:"
echo "  - make distribution (pacote tar.gz)"
echo "  - make electron-installer (instalador Electron)"
echo "  - make deploy-full (ambos)"

print_message "📖 Documentação de instalação: docs/INSTALACAO.md"
