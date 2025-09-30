# 📁 Estrutura do Projeto Cutting Optimization

## 🏗️ Visão Geral da Arquitetura

```
cutting-optimization/
├── 📁 backend/                 # Backend Python
│   ├── 📁 src/                # Código fonte principal
│   │   ├── 📁 core/           # Algoritmos de otimização
│   │   ├── 📁 utils/          # Utilitários
│   │   └── 📁 visualization/  # Visualização
│   ├── 📁 tests/              # Testes automatizados
│   ├── 📁 examples/           # Exemplos de uso
│   ├── 📁 docs/               # Documentação do backend
│   ├── 📁 scripts/            # Scripts auxiliares
│   ├── 📁 config/             # Configurações
│   └── 📁 output/             # Saídas geradas
├── 📁 frontend/               # Frontend React + Electron
│   ├── 📁 src/                # Código fonte React
│   │   ├── 📁 components/     # Componentes React
│   │   └── 📁 utils/          # Utilitários frontend
│   ├── 📁 public/             # Arquivos públicos
│   ├── 📁 build/              # Build de produção
│   ├── 📁 docs/               # Documentação do frontend
│   ├── 📁 scripts/            # Scripts auxiliares
│   └── 📁 config/             # Configurações
├── 📁 docs/                   # Documentação geral
├── 📁 scripts/                # Scripts de automação
├── 📁 config/                 # Configurações globais
└── 📁 output/                 # Saídas gerais
```

## 🔧 Componentes Principais

### Backend (Python)
- **Algoritmos de Otimização**: Implementações de diferentes estratégias de corte
- **API**: Interface para comunicação com o frontend
- **Utilitários**: Funções auxiliares e helpers
- **Visualização**: Geração de gráficos e relatórios

### Frontend (React + Electron)
- **Interface de Usuário**: Componentes React para interação
- **Visualizador**: Componente para mostrar o layout de corte
- **Comunicação**: IPC para comunicação com o backend
- **Configuração**: Interface para configurar parâmetros

## 📋 Scripts de Automação

### Scripts Principais
- `scripts/start.sh`: Inicialização completa do projeto
- `scripts/build.sh`: Build de produção
- `scripts/clean.sh`: Limpeza de arquivos temporários

### Comandos Make
- `make setup`: Configuração inicial
- `make install`: Instalação de dependências
- `make start`: Inicialização do aplicativo
- `make build`: Build do projeto
- `make clean`: Limpeza
- `make test`: Execução de testes

## ⚙️ Configurações

### Arquivos de Configuração
- `config/project.json`: Configurações gerais do projeto
- `config/development.json`: Configurações de desenvolvimento
- `backend/requirements.txt`: Dependências Python
- `frontend/package.json`: Dependências Node.js

## 🧪 Testes

### Estrutura de Testes
- `backend/tests/`: Testes unitários e de integração
- `frontend/src/**/*.test.*`: Testes dos componentes React
- Cobertura mínima: 80%

## 📦 Build e Deploy

### Processo de Build
1. **Frontend**: Build do React para produção
2. **Backend**: Verificação de testes e criação de pacote
3. **Electron**: Empacotamento da aplicação

### Artefatos Gerados
- `frontend/build/`: Build do React
- `frontend/dist/`: Distribuição Electron
- `backend/dist/`: Pacote Python (se aplicável)

## 🔒 Segurança e Boas Práticas

### Git Ignore
- Arquivos temporários e de build
- Dependências (node_modules, __pycache__)
- Arquivos de configuração sensíveis
- Logs e arquivos de debug

### Estrutura de Commits
- Commits convencionais (feat, fix, docs, etc.)
- Mensagens descritivas e claras
- Separação lógica de mudanças

## 📚 Documentação

### Arquivos de Documentação
- `README.md`: Documentação principal
- `docs/DOCUMENTACAO.md`: Documentação completa
- `docs/ESTRUTURA_PROJETO.md`: Este arquivo
- `backend/README.md`: Documentação do backend
- `frontend/README.md`: Documentação do frontend

## 🚀 Fluxo de Desenvolvimento

### Setup Inicial
```bash
git clone <repository>
cd cutting-optimization
make setup
make install
```

### Desenvolvimento
```bash
make start          # Inicia o aplicativo
make test           # Executa testes
make build          # Build de produção
```

### Manutenção
```bash
make clean          # Limpa arquivos temporários
./scripts/clean.sh  # Limpeza completa
```

## 📊 Monitoramento e Logs

### Logs de Desenvolvimento
- Logs do backend em `backend/logs/`
- Logs do frontend no console do Electron
- Logs de build em `output/`

### Métricas de Qualidade
- Cobertura de testes
- Tempo de build
- Tamanho dos artefatos
- Performance da otimização
