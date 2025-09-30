# Guia de Instalação - Cutting Optimization

## Visão Geral

O Cutting Optimization é um sistema completo de otimização de corte bidimensional que pode ser instalado de diferentes formas dependendo do seu sistema operacional e preferências.

## Opções de Instalação

### 1. Instalador Electron (Recomendado)

O instalador Electron é a forma mais fácil de instalar e usar a aplicação. Ele cria um aplicativo nativo com interface gráfica.

#### Download
- **Windows**: `Cutting Optimization Setup.exe`
- **macOS**: `Cutting Optimization.dmg`
- **Linux**: `cutting-optimization.AppImage`

#### Instalação
1. Baixe o arquivo apropriado para seu sistema
2. Execute o instalador
3. Siga as instruções na tela
4. A aplicação será instalada e um atalho será criado

### 2. Pacote de Distribuição

Para usuários que preferem instalação manual ou desenvolvimento.

#### Download
- **Arquivo**: `cutting-optimization-v1.0.0.tar.gz`
- **Tamanho**: ~50MB (aproximadamente)

#### Pré-requisitos
- **Node.js 16+**: [Download](https://nodejs.org/)
- **Python 3.9+**: [Download](https://python.org/)
- **pip3**: Geralmente incluído com Python

#### Instalação Automática

##### Linux/macOS
```bash
# Extrair o arquivo
tar -xzf cutting-optimization-v1.0.0.tar.gz
cd cutting-optimization-v1.0.0

# Executar instalação automática
chmod +x scripts/install.sh
./scripts/install.sh
```

##### Windows
```cmd
# Extrair o arquivo (use 7-Zip ou WinRAR)
# Navegar para o diretório extraído
cd cutting-optimization-v1.0.0

# Executar instalação automática
scripts\install.bat
```

#### Instalação Manual

1. **Extrair o arquivo**:
   ```bash
   tar -xzf cutting-optimization-v1.0.0.tar.gz
   cd cutting-optimization-v1.0.0
   ```

2. **Instalar dependências do backend**:
   ```bash
   cd backend
   pip3 install -r requirements.txt
   pip3 install -e .
   cd ..
   ```

3. **Instalar dependências do frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

4. **Executar a aplicação**:
   ```bash
   cd backend
   python3 main.py --interactive
   ```

### 3. Docker (Para Desenvolvedores)

Se você tem Docker instalado:

```bash
# Clonar o repositório
git clone https://github.com/douglascesario/cutting-optimization.git
cd cutting-optimization

# Construir e executar
docker-compose up --build
```

## Verificação da Instalação

### Verificar Dependências
Execute o script de verificação:
```bash
./scripts/verify-installation.sh
```

### Testar a Aplicação
```bash
# Executar exemplo rápido
cd backend
python3 tests/test_rapido.py
```

## Executando a Aplicação

### Após Instalação Automática
- **Linux/macOS**: `cutting-optimization`
- **Windows**: `%USERPROFILE%\.cutting-optimization\run.bat`

### Após Instalação Manual
```bash
cd backend
python3 main.py --interactive
```

### Interface Web (se disponível)
- Abra o navegador em: `http://localhost:3000`

## Solução de Problemas

### Erro: "Node.js não encontrado"
- Instale Node.js 16+ do site oficial
- Reinicie o terminal após a instalação

### Erro: "Python 3 não encontrado"
- Instale Python 3.9+ do site oficial
- Certifique-se de que `python3` está no PATH

### Erro: "pip3 não encontrado"
- Reinstale Python com a opção "Add to PATH"
- Ou instale pip manualmente: `python3 -m ensurepip --upgrade`

### Erro de Permissão (Linux/macOS)
```bash
chmod +x scripts/*.sh
```

### Erro de Firewall (Windows)
- Adicione exceção no Windows Defender
- Permita acesso de rede para Python e Node.js

## Desinstalação

### Instalador Electron
- Use "Adicionar ou Remover Programas" (Windows)
- Arraste para Lixeira (macOS)
- Use o gerenciador de pacotes (Linux)

### Instalação Manual
```bash
# Remover diretório de instalação
rm -rf ~/.cutting-optimization

# Remover comando global (Linux/macOS)
sudo rm -f /usr/local/bin/cutting-optimization

# Remover atalho do desktop
rm -f ~/Desktop/Cutting-Optimization.desktop
```

## Suporte

### Documentação
- **README.md**: Visão geral do projeto
- **docs/**: Documentação completa
- **backend/README.md**: Documentação do backend
- **frontend/README.md**: Documentação do frontend

### Contato
- **GitHub**: [Issues](https://github.com/douglascesario/cutting-optimization/issues)
- **Email**: douglas@example.com

### Logs e Debug
```bash
# Executar com logs detalhados
cd backend
python3 main.py --interactive --verbose

# Verificar logs do sistema
tail -f ~/.cutting-optimization/logs/app.log
```

## Atualizações

### Verificar Versão
```bash
cd backend
python3 -c "import src; print(src.__version__)"
```

### Atualizar
1. Baixe a nova versão
2. Execute o processo de instalação novamente
3. A instalação substituirá os arquivos antigos

## Requisitos do Sistema

### Mínimos
- **RAM**: 4GB
- **Espaço**: 1GB livre
- **CPU**: Dual-core 2GHz
- **SO**: Windows 10, macOS 10.14, Ubuntu 18.04

### Recomendados
- **RAM**: 8GB+
- **Espaço**: 2GB+ livre
- **CPU**: Quad-core 3GHz+
- **SO**: Windows 11, macOS 12+, Ubuntu 20.04+

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo LICENSE para detalhes.
