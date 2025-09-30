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
