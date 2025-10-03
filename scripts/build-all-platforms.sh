#!/bin/bash

# Script para construir instaladores para todas as plataformas
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
    echo -e "${BLUE}  Building All Platforms${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Ir para o diretório frontend
cd frontend

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    print_message "Instalando dependências do frontend..."
    npm install
fi

# Build do React
print_message "Construindo aplicação React..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "build" ]; then
    print_error "Build do React falhou"
    exit 1
fi

# Detectar sistema operacional atual
OS=$(uname -s)
print_message "Sistema operacional detectado: $OS"

# Função para construir para uma plataforma específica
build_platform() {
    local platform=$1
    local platform_name=$2
    
    print_message "Construindo para $platform_name..."
    
    case $platform in
        "mac")
            npm run dist-mac
            ;;
        "win")
            npm run dist-win
            ;;
        "linux")
            npm run dist-linux
            ;;
        "all")
            npm run dist
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        print_message "✅ Build para $platform_name concluído com sucesso!"
    else
        print_error "❌ Falha no build para $platform_name"
        return 1
    fi
}

# Perguntar quais plataformas construir
print_message "Escolha as plataformas para construir:"
echo "1) Apenas a plataforma atual ($OS)"
echo "2) Todas as plataformas"
echo "3) macOS"
echo "4) Windows"
echo "5) Linux"
echo "6) macOS + Windows"
echo "7) macOS + Linux"
echo "8) Windows + Linux"

read -p "Digite sua escolha (1-8): " choice

case $choice in
    1)
        # Plataforma atual
        case $OS in
            Darwin*)
                build_platform "mac" "macOS"
                ;;
            Linux*)
                build_platform "linux" "Linux"
                ;;
            MINGW*|CYGWIN*|MSYS*)
                build_platform "win" "Windows"
                ;;
            *)
                print_warning "Sistema operacional não reconhecido, tentando build genérico..."
                build_platform "all" "Genérico"
                ;;
        esac
        ;;
    2)
        # Todas as plataformas
        build_platform "all" "Todas as plataformas"
        ;;
    3)
        # macOS
        build_platform "mac" "macOS"
        ;;
    4)
        # Windows
        build_platform "win" "Windows"
        ;;
    5)
        # Linux
        build_platform "linux" "Linux"
        ;;
    6)
        # macOS + Windows
        build_platform "mac" "macOS"
        build_platform "win" "Windows"
        ;;
    7)
        # macOS + Linux
        build_platform "mac" "macOS"
        build_platform "linux" "Linux"
        ;;
    8)
        # Windows + Linux
        build_platform "win" "Windows"
        build_platform "linux" "Linux"
        ;;
    *)
        print_error "Escolha inválida"
        exit 1
        ;;
esac

# Verificar se o build foi bem-sucedido
if [ -d "dist" ]; then
    print_message "✅ Instaladores Electron criados com sucesso!"
    print_message "📦 Arquivos gerados em: frontend/dist/"
    
    # Listar arquivos gerados
    print_message "Arquivos de instalação:"
    ls -la dist/
    
    # Mostrar tamanho dos arquivos
    print_message "Tamanhos dos arquivos:"
    du -h dist/*
    
    # Mostrar informações sobre cada arquivo
    print_message "Detalhes dos instaladores:"
    for file in dist/*; do
        if [ -f "$file" ]; then
            echo "  📄 $(basename "$file") - $(du -h "$file" | cut -f1)"
        fi
    done
    
else
    print_error "Falha ao criar instaladores Electron"
    exit 1
fi

# Voltar para o diretório raiz
cd ..

print_message "🎉 Processo de build concluído!"
print_message "📁 Instaladores disponíveis em: frontend/dist/"
print_message "🚀 Os usuários podem instalar executando os arquivos gerados"

# Mostrar instruções de instalação
print_message "📖 Instruções para usuários:"
echo "  • Windows: Execute o arquivo .exe"
echo "  • macOS: Abra o arquivo .dmg e arraste para Applications"
echo "  • Linux: Execute o arquivo .AppImage ou instale o .deb/.rpm"


