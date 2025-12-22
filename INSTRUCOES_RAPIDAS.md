# 🚀 Instruções Rápidas - Gerar Instalador Windows

## Para gerar o instalador Windows completo:

### No Windows:
```batch
scripts\build-windows-installer.bat
```

### No Linux/Mac (usando WSL):
```bash
./scripts/build-windows-installer.sh
```

### Ou usando npm:
```bash
npm run build:windows-installer
```

## O que acontece:

1. ✅ Gera executável standalone do backend (`cutting-optimization-backend.exe`)
   - Inclui Python runtime e todas as dependências
   - Não precisa Python instalado no Windows do usuário

2. ✅ Faz build do frontend React
   - Compila a aplicação React para produção

3. ✅ Gera instalador Windows (.exe)
   - Inclui Electron + React + Backend empacotado
   - Instalador NSIS completo e profissional

## Resultado:

O instalador estará em: `frontend/dist/Cutting Optimization Setup X.X.X.exe`

Este arquivo pode ser distribuído para qualquer usuário Windows - **não precisa instalar nada além do próprio instalador!**

## Requisitos para Build:

- Python 3.9+ (apenas para gerar o instalador)
- Node.js 16+ (apenas para gerar o instalador)
- Windows 10/11 (para gerar instalador Windows)

## Documentação Completa:

Veja [docs/GERAR_INSTALADOR_WINDOWS.md](docs/GERAR_INSTALADOR_WINDOWS.md) para mais detalhes.

