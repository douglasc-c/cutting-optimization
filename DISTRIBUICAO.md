# Guia de Distribuição - Cutting Optimization

## Visão Geral

Este guia explica como gerar a aplicação Cutting Optimization para instalação em outras máquinas. O sistema oferece múltiplas opções de distribuição para diferentes necessidades.

## Opções de Distribuição

### 1. Pacote de Distribuição (Recomendado para Desenvolvedores)

Cria um pacote compacto com todos os arquivos necessários para instalação manual.

#### Gerar Pacote
```bash
# Usando Makefile
make distribution

# Ou diretamente
./scripts/create-distribution.sh
```

#### Arquivos Gerados
- `cutting-optimization-v1.0.0.tar.gz` - Pacote principal
- `cutting-optimization-v1.0.0.zip` - Versão Windows
- `cutting-optimization-dist/` - Diretório com arquivos

#### Tamanho
- ~268KB (compactado)
- ~2MB (descompactado)

### 2. Instalador Electron (Recomendado para Usuários Finais)

Cria instaladores nativos para diferentes sistemas operacionais.

#### Pré-requisitos
```bash
# Instalar electron-builder globalmente
npm install -g electron-builder
```

#### Gerar Instaladores
```bash
# Usando Makefile
make electron-installer

# Ou diretamente
./scripts/build-electron-installer.sh
```

#### Arquivos Gerados
- **Windows**: `Cutting Optimization Setup.exe`
- **macOS**: `Cutting Optimization.dmg`
- **Linux**: `cutting-optimization.AppImage`

### 3. Deploy Completo

Gera todos os formatos de distribuição.

```bash
make deploy-full
```

## Comandos Disponíveis

### Makefile
```bash
# Distribuição
make distribution          # Pacote tar.gz/zip
make electron-installer    # Instaladores Electron
make deploy-full          # Ambos os formatos

# Instalação
make install-linux        # Instalar no Linux/macOS
make install-windows      # Instalar no Windows

# Desenvolvimento
make build               # Build do projeto
make test               # Executar testes
make clean              # Limpar arquivos temporários
```

### Scripts Diretos
```bash
# Distribuição
./scripts/create-distribution.sh      # Criar pacote
./scripts/build-electron-installer.sh # Criar instalador Electron
./scripts/test-distribution.sh        # Testar distribuição

# Instalação
./scripts/install.sh                  # Instalar Linux/macOS
./scripts/install.bat                 # Instalar Windows
```

## Estrutura do Pacote de Distribuição

```
cutting-optimization-v1.0.0/
├── package.json              # Configuração do projeto
├── README.md                 # Documentação principal
├── INSTALL.md                # Guia de instalação
├── VERSION                   # Versão do projeto
├── CHECKSUMS.md5             # Checksums dos arquivos
├── verify-installation.sh    # Script de verificação
├── backend/                  # Código Python
│   ├── main.py
│   ├── requirements.txt
│   ├── setup.py
│   └── src/
├── frontend/                 # Código React/Electron
│   ├── package.json
│   ├── build/               # Build do React
│   └── src/
├── config/                   # Configurações
├── docs/                     # Documentação
└── scripts/                  # Scripts de instalação
    ├── install.sh           # Linux/macOS
    └── install.bat          # Windows
```

## Processo de Instalação para Usuários

### Instalador Electron
1. Baixar o arquivo apropriado para o sistema
2. Executar o instalador
3. Seguir as instruções na tela
4. Aplicação instalada e pronta para uso

### Pacote de Distribuição
1. Extrair o arquivo `.tar.gz` ou `.zip`
2. Executar script de instalação:
   - **Linux/macOS**: `./scripts/install.sh`
   - **Windows**: `scripts\install.bat`
3. Aplicação instalada em `~/.cutting-optimization`

## Requisitos do Sistema

### Para Gerar Distribuição
- Node.js 16+
- Python 3.9+
- npm/pip3
- electron-builder (para instaladores Electron)

### Para Instalar
- Node.js 16+
- Python 3.9+
- pip3
- 1GB de espaço livre
- 4GB RAM

## Testando a Distribuição

### Teste Automático
```bash
./scripts/test-distribution.sh
```

### Teste Manual
1. Gerar o pacote
2. Extrair em diretório temporário
3. Executar script de instalação
4. Verificar se a aplicação funciona

## Solução de Problemas

### Erro: "electron-builder não encontrado"
```bash
npm install -g electron-builder
```

### Erro: "Permissão negada"
```bash
chmod +x scripts/*.sh
```

### Erro: "Node.js não encontrado"
- Instalar Node.js 16+ do site oficial
- Reiniciar terminal

### Erro: "Python não encontrado"
- Instalar Python 3.9+ do site oficial
- Verificar se está no PATH

## Distribuição para Usuários

### Opção 1: Instalador Electron
- **Vantagem**: Instalação simples, interface nativa
- **Desvantagem**: Arquivo maior (~100MB)
- **Ideal para**: Usuários finais, distribuição comercial

### Opção 2: Pacote de Distribuição
- **Vantagem**: Arquivo pequeno, flexível
- **Desvantagem**: Requer instalação manual
- **Ideal para**: Desenvolvedores, ambientes controlados

### Opção 3: Docker
- **Vantagem**: Ambiente isolado, fácil deploy
- **Desvantagem**: Requer Docker
- **Ideal para**: Servidores, ambientes de produção

## Versionamento

### Atualizar Versão
1. Editar `package.json` (versão do projeto)
2. Editar `backend/setup.py` (versão do backend)
3. Gerar nova distribuição
4. Atualizar documentação

### Histórico de Versões
- v1.0.0: Versão inicial com funcionalidades básicas

## Segurança

### Checksums
- MD5 e SHA256 incluídos no pacote
- Verificação automática durante instalação

### Validação
- Scripts de verificação incluídos
- Testes automáticos antes da distribuição

## Suporte

### Documentação
- `docs/INSTALACAO.md` - Guia de instalação
- `docs/DOCUMENTACAO.md` - Documentação completa
- `README.md` - Visão geral

### Contato
- GitHub Issues: [Link do repositório]
- Email: douglas@example.com

## Próximos Passos

1. **Testar em diferentes sistemas**
2. **Criar CI/CD para builds automáticos**
3. **Implementar atualizações automáticas**
4. **Adicionar assinatura digital**
5. **Criar repositório de pacotes**

---

**Nota**: Este guia assume que você está na raiz do projeto. Todos os comandos devem ser executados a partir do diretório `/Users/douglascesario/frontend/cutting-optimization/`.
