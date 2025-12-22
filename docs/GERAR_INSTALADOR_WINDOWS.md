# Como Gerar o Instalador Windows (.exe)

Este guia explica como gerar um instalador Windows completo que inclui tanto o frontend quanto o backend, sem necessidade de o usuário instalar Python ou Node.js.

## 📋 Pré-requisitos

Para gerar o instalador, você precisa ter instalado na sua máquina de desenvolvimento:

1. **Python 3.9 ou superior**
   - Baixe em: https://www.python.org/downloads/
   - Certifique-se de adicionar Python ao PATH durante a instalação

2. **Node.js 16 ou superior**
   - Baixe em: https://nodejs.org/
   - Inclui o npm automaticamente

3. **Windows 10/11** (para gerar o instalador Windows)

## 🚀 Processo de Build

### Opção 1: Script Automatizado (Recomendado)

#### No Windows:
```batch
scripts\build-windows-installer.bat
```

#### No Linux/Mac (usando WSL ou similar):
```bash
chmod +x scripts/build-windows-installer.sh
./scripts/build-windows-installer.sh
```

O script automatizado executa os seguintes passos:

1. **Build do Backend**
   - Instala PyInstaller (se necessário)
   - Instala todas as dependências Python
   - Gera `cutting-optimization-backend.exe` usando PyInstaller
   - Este executável contém o Python runtime e todas as dependências

2. **Build do Frontend**
   - Instala dependências Node.js (se necessário)
   - Faz build do React (`npm run build`)
   - Gera os arquivos estáticos da aplicação

3. **Build do Instalador**
   - Usa electron-builder para criar o instalador Windows
   - Inclui o executável do backend nos recursos
   - Gera um instalador NSIS (.exe) completo

### Opção 2: Passo a Passo Manual

Se preferir executar manualmente:

#### 1. Gerar Executável do Backend

```bash
cd backend
python build_exe_windows.py
```

Isso criará `backend/cutting-optimization-backend.exe` que contém:
- Python runtime
- Todas as dependências (numpy, scipy, pulp, ortools, matplotlib, pandas)
- Todo o código do backend

#### 2. Build do Frontend React

```bash
cd frontend
npm install  # Se ainda não instalou as dependências
npm run build
```

#### 3. Gerar Instalador Windows

```bash
cd frontend
npm run dist-win
```

O instalador será gerado em `frontend/dist/`

## 📦 Estrutura do Instalador

O instalador gerado inclui:

```
Cutting Optimization/
├── resources/
│   ├── app.asar                    # Aplicação Electron empacotada
│   ├── backend/
│   │   ├── cutting-optimization-backend.exe  # Backend standalone
│   │   ├── src/                    # Código fonte (se necessário)
│   │   └── examples/                # Exemplos de configuração
│   └── config/                      # Arquivos de configuração
├── Cutting Optimization.exe        # Executável principal
└── ...
```

## ✅ Verificação

Após gerar o instalador:

1. **Teste em uma máquina limpa**
   - Instale o Windows em uma VM ou máquina de teste
   - **NÃO** instale Python ou Node.js
   - Execute o instalador gerado
   - Verifique se a aplicação funciona corretamente

2. **Teste as funcionalidades**
   - Abra a aplicação
   - Configure um problema de corte
   - Execute a otimização
   - Verifique se os resultados são gerados corretamente

## 🔧 Solução de Problemas

### Erro: "Python não encontrado"
- Certifique-se de que Python está instalado e no PATH
- Teste executando `python --version` no terminal

### Erro: "Node.js não encontrado"
- Certifique-se de que Node.js está instalado
- Teste executando `node --version` no terminal

### Erro: "PyInstaller não encontrado"
- O script tentará instalar automaticamente
- Se falhar, instale manualmente: `pip install pyinstaller`

### Erro: "electron-builder não encontrado"
- O script tentará instalar automaticamente
- Se falhar, instale manualmente: `npm install --save-dev electron-builder`

### Executável do backend muito grande
- Isso é normal! O executável inclui Python e todas as dependências
- Tamanho típico: 100-200 MB
- O instalador final será maior devido ao Electron também

### Backend não funciona após instalação
- Verifique se `cutting-optimization-backend.exe` está em `resources/backend/`
- Verifique os logs do Electron (DevTools)
- Certifique-se de que o caminho no `electron.js` está correto

## 📝 Notas Importantes

1. **Tamanho do Instalador**
   - O instalador final pode ter 200-400 MB
   - Isso é normal pois inclui:
     - Python runtime (~50-100 MB)
     - Dependências Python (~50-100 MB)
     - Electron runtime (~100-150 MB)
     - Aplicação React (~10-20 MB)

2. **Tempo de Build**
   - Build completo pode levar 10-30 minutos
   - Depende da velocidade da sua máquina e conexão de internet

3. **Antivírus**
   - Alguns antivírus podem marcar executáveis PyInstaller como suspeitos
   - Isso é um falso positivo comum
   - Considere assinar digitalmente o executável para produção

4. **Distribuição**
   - O instalador gerado pode ser distribuído livremente
   - Não requer licenças especiais
   - O usuário final não precisa de nenhuma instalação adicional

## 🎯 Próximos Passos

Após gerar o instalador:

1. Teste em diferentes versões do Windows (10, 11)
2. Teste em máquinas com diferentes configurações
3. Considere criar um instalador assinado digitalmente para produção
4. Documente o processo de instalação para os usuários finais

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs durante o build
2. Verifique se todas as dependências estão instaladas
3. Consulte a documentação do PyInstaller e electron-builder
4. Abra uma issue no repositório do projeto

