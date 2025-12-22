# 🪟 Gerar Instalador Windows

## Resumo Rápido

Para gerar o instalador Windows (.exe) completo que inclui frontend e backend:

### Windows:
```batch
scripts\build-windows-installer.bat
```

### Linux/Mac:
```bash
./scripts/build-windows-installer.sh
```

## O que o instalador inclui?

✅ **Frontend Electron + React** - Interface completa  
✅ **Backend Python empacotado** - Executável standalone (não precisa Python instalado)  
✅ **Todas as dependências** - Tudo empacotado em um único instalador  

## Requisitos para Build

- Python 3.9+
- Node.js 16+
- Windows 10/11 (para gerar instalador Windows)

## Resultado

Após o build, você encontrará o instalador em:
```
frontend/dist/Cutting Optimization Setup X.X.X.exe
```

Este instalador pode ser distribuído para qualquer usuário Windows - **não precisa instalar Python ou Node.js**!

## Documentação Completa

Para mais detalhes, consulte: [docs/GERAR_INSTALADOR_WINDOWS.md](docs/GERAR_INSTALADOR_WINDOWS.md)

