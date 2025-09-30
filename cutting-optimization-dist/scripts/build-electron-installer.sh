#!/bin/bash

# Script para criar instalador Electron
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
    echo -e "${BLUE}  Building Electron Installer${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Verificar se electron-builder está instalado
if ! command -v electron-builder &> /dev/null; then
    print_message "Instalando electron-builder..."
    npm install -g electron-builder
fi

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

# Configurar electron-builder para incluir o backend
print_message "Configurando electron-builder..."

# Criar configuração temporária do electron-builder
cat > electron-builder-config.json << 'EOF'
{
  "appId": "com.cuttingoptimization.app",
  "productName": "Cutting Optimization",
  "directories": {
    "output": "dist"
  },
  "files": [
    "build/**/*",
    "node_modules/**/*",
    "public/electron.js",
    "public/preload.js",
    "../backend/**/*",
    "../config/**/*",
    "../docs/**/*"
  ],
  "extraResources": [
    {
      "from": "../backend",
      "to": "backend"
    },
    {
      "from": "../config",
      "to": "config"
    },
    {
      "from": "../docs",
      "to": "docs"
    }
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      },
      {
        "target": "portable",
        "arch": ["x64", "ia32"]
      }
    ]
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      },
      {
        "target": "deb",
        "arch": ["x64"]
      },
      {
        "target": "rpm",
        "arch": ["x64"]
      }
    ],
    "category": "Graphics"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
EOF

# Build do Electron
print_message "Construindo instalador Electron..."

# Detectar sistema operacional
OS=$(uname -s)
case $OS in
    Darwin*)
        print_message "Construindo para macOS..."
        electron-builder --config electron-builder-config.json --mac
        ;;
    Linux*)
        print_message "Construindo para Linux..."
        electron-builder --config electron-builder-config.json --linux
        ;;
    MINGW*|CYGWIN*|MSYS*)
        print_message "Construindo para Windows..."
        electron-builder --config electron-builder-config.json --win
        ;;
    *)
        print_warning "Sistema operacional não reconhecido: $OS"
        print_message "Tentando build genérico..."
        electron-builder --config electron-builder-config.json
        ;;
esac

# Verificar se o build foi bem-sucedido
if [ -d "dist" ]; then
    print_message "✅ Instalador Electron criado com sucesso!"
    print_message "📦 Arquivos gerados em: frontend/dist/"
    
    # Listar arquivos gerados
    print_message "Arquivos de instalação:"
    ls -la dist/
    
    # Mostrar tamanho dos arquivos
    print_message "Tamanhos dos arquivos:"
    du -h dist/*
    
else
    print_error "Falha ao criar instalador Electron"
    exit 1
fi

# Limpar arquivo de configuração temporário
rm -f electron-builder-config.json

# Voltar para o diretório raiz
cd ..

print_message "🎉 Processo de build concluído!"
print_message "📁 Instaladores disponíveis em: frontend/dist/"
print_message "🚀 Os usuários podem instalar executando os arquivos gerados"
