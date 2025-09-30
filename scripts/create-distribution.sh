#!/bin/bash

# Script para criar pacote de distribuição
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
    echo -e "${BLUE}  Creating Distribution Package${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

print_header

# Criar diretório de distribuição
DIST_DIR="cutting-optimization-dist"
VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
DIST_NAME="cutting-optimization-v${VERSION}"

print_message "Criando pacote de distribuição: $DIST_NAME"

# Limpar diretório anterior se existir
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
fi

mkdir -p "$DIST_DIR"

# Copiar arquivos essenciais
print_message "Copiando arquivos do projeto..."

# Arquivos de configuração
cp package.json "$DIST_DIR/"
cp package-lock.json "$DIST_DIR/" 2>/dev/null || true
cp Makefile "$DIST_DIR/"
cp README.md "$DIST_DIR/"

# Diretórios principais
cp -r backend "$DIST_DIR/"
cp -r frontend "$DIST_DIR/"
cp -r config "$DIST_DIR/"
cp -r docs "$DIST_DIR/"
cp -r scripts "$DIST_DIR/"

# Docker files
cp Dockerfile "$DIST_DIR/" 2>/dev/null || true
cp docker-compose.yml "$DIST_DIR/" 2>/dev/null || true

# Limpar arquivos desnecessários
print_message "Limpando arquivos desnecessários..."

# Remover node_modules
find "$DIST_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remover arquivos de cache Python
find "$DIST_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$DIST_DIR" -name "*.pyo" -delete 2>/dev/null || true

# Remover arquivos de build temporários
find "$DIST_DIR" -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true

# Remover arquivos de ambiente virtual
find "$DIST_DIR" -name "venv" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name ".venv" -type d -exec rm -rf {} + 2>/dev/null || true

# Remover arquivos de IDE
find "$DIST_DIR" -name ".vscode" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name ".idea" -type d -exec rm -rf {} + 2>/dev/null || true
find "$DIST_DIR" -name "*.swp" -delete 2>/dev/null || true
find "$DIST_DIR" -name "*.swo" -delete 2>/dev/null || true

# Criar arquivo de instalação personalizado
print_message "Criando script de instalação personalizado..."

cat > "$DIST_DIR/INSTALL.md" << 'EOF'
# Instalação do Cutting Optimization

## Pré-requisitos

- Node.js 16+ (https://nodejs.org/)
- Python 3.9+ (https://python.org/)
- pip3 (geralmente incluído com Python)

## Instalação

### Linux/macOS
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

### Windows
```cmd
scripts\install.bat
```

### Instalação Manual

1. Instale as dependências do backend:
```bash
cd backend
pip3 install -r requirements.txt
pip3 install -e .
```

2. Instale as dependências do frontend:
```bash
cd frontend
npm install
npm run build
```

3. Execute a aplicação:
```bash
cd backend
python3 main.py --interactive
```

## Uso

Após a instalação, execute:
- Linux/macOS: `cutting-optimization`
- Windows: `%USERPROFILE%\.cutting-optimization\run.bat`

## Documentação

Consulte a pasta `docs/` para documentação completa.
EOF

# Criar script de verificação
cat > "$DIST_DIR/verify-installation.sh" << 'EOF'
#!/bin/bash
echo "Verificando instalação do Cutting Optimization..."

# Verificar Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js $(node -v) encontrado"
else
    echo "❌ Node.js não encontrado"
fi

# Verificar Python
if command -v python3 &> /dev/null; then
    echo "✅ Python $(python3 --version) encontrado"
else
    echo "❌ Python 3 não encontrado"
fi

# Verificar pip
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 encontrado"
else
    echo "❌ pip3 não encontrado"
fi

echo "Verificação concluída!"
EOF

chmod +x "$DIST_DIR/verify-installation.sh"

# Criar arquivo de versão
echo "$VERSION" > "$DIST_DIR/VERSION"

# Criar checksums
print_message "Gerando checksums..."
cd "$DIST_DIR"
find . -type f -name "*.py" -o -name "*.js" -o -name "*.json" -o -name "*.md" | sort | xargs md5sum > CHECKSUMS.md5 2>/dev/null || {
    find . -type f -name "*.py" -o -name "*.js" -o -name "*.json" -o -name "*.md" | sort | xargs shasum -a 256 > CHECKSUMS.sha256 2>/dev/null || true
}
cd ..

# Criar arquivo tar.gz
print_message "Criando arquivo de distribuição..."
tar -czf "${DIST_NAME}.tar.gz" -C "$DIST_DIR" .

# Criar arquivo zip (para Windows)
if command -v zip &> /dev/null; then
    print_message "Criando arquivo ZIP..."
    cd "$DIST_DIR"
    zip -r "../${DIST_NAME}.zip" . -x "*.DS_Store" "*.git*"
    cd ..
fi

# Mostrar informações do pacote
print_message "✅ Pacote de distribuição criado com sucesso!"
print_message "📦 Arquivos gerados:"
echo "  - ${DIST_NAME}.tar.gz"
if [ -f "${DIST_NAME}.zip" ]; then
    echo "  - ${DIST_NAME}.zip"
fi
echo "  - $DIST_DIR/ (diretório)"

# Mostrar tamanho dos arquivos
if [ -f "${DIST_NAME}.tar.gz" ]; then
    SIZE=$(du -h "${DIST_NAME}.tar.gz" | cut -f1)
    print_message "📏 Tamanho do pacote: $SIZE"
fi

print_message "🚀 Para distribuir, envie o arquivo .tar.gz ou .zip"
print_message "📖 Instruções de instalação estão em: $DIST_DIR/INSTALL.md"
