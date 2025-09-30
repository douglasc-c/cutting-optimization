#!/bin/bash

# Script de instalação para Linux/macOS
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
    echo -e "${BLUE}  Cutting Optimization Installer${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Verificar dependências do sistema
print_message "Verificando dependências do sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado. Instale Node.js 16+ primeiro."
    print_message "Visite: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js versão 16+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

print_message "✅ Node.js $(node -v) encontrado"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 não encontrado. Instale Python 3.9+ primeiro."
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
print_message "✅ Python $PYTHON_VERSION encontrado"

# Verificar pip
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 não encontrado. Instale pip3 primeiro."
    exit 1
fi

print_message "✅ pip3 encontrado"

# Instalar dependências do backend
print_message "Instalando dependências do backend..."
cd backend
pip3 install -r requirements.txt
pip3 install -e .
cd ..

# Instalar dependências do frontend
print_message "Instalando dependências do frontend..."
cd frontend
npm install
cd ..

# Build do frontend
print_message "Construindo frontend..."
cd frontend
npm run build
cd ..

# Criar diretório de instalação
INSTALL_DIR="$HOME/.cutting-optimization"
print_message "Criando diretório de instalação: $INSTALL_DIR"

mkdir -p "$INSTALL_DIR"
cp -r backend "$INSTALL_DIR/"
cp -r frontend/build "$INSTALL_DIR/frontend/"
cp -r config "$INSTALL_DIR/"
cp -r docs "$INSTALL_DIR/"

# Criar script de execução
cat > "$INSTALL_DIR/run.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
cd backend
python3 main.py --interactive
EOF

chmod +x "$INSTALL_DIR/run.sh"

# Criar atalho no desktop (se possível)
if [ -d "$HOME/Desktop" ]; then
    cat > "$HOME/Desktop/Cutting-Optimization.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Cutting Optimization
Comment=Sistema de otimização de corte bidimensional
Exec=$INSTALL_DIR/run.sh
Icon=applications-graphics
Terminal=true
Categories=Graphics;Engineering;
EOF
    chmod +x "$HOME/Desktop/Cutting-Optimization.desktop"
    print_message "✅ Atalho criado no desktop"
fi

# Criar comando global
sudo ln -sf "$INSTALL_DIR/run.sh" /usr/local/bin/cutting-optimization 2>/dev/null || {
    print_warning "Não foi possível criar comando global (sudo necessário)"
    print_message "Você pode executar a aplicação com: $INSTALL_DIR/run.sh"
}

print_message "✅ Instalação concluída com sucesso!"
print_message "📁 Instalado em: $INSTALL_DIR"
print_message "🚀 Execute com: cutting-optimization (ou $INSTALL_DIR/run.sh)"
print_message "📖 Documentação em: $INSTALL_DIR/docs/"
