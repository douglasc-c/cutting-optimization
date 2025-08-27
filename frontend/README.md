# Frontend - Otimização de Corte Bidimensional

Frontend Electron + React para o sistema de otimização de corte bidimensional.

## 🏗️ Estrutura

```
frontend/
├── public/
│   ├── electron.js              # Processo principal Electron
│   ├── preload.js               # Script de preload seguro
│   └── index.html               # HTML base
├── src/
│   ├── App.tsx                  # Componente principal React
│   ├── App.css                  # Estilos da aplicação
│   └── index.tsx                # Ponto de entrada React
├── package.json                 # Configuração Node.js
└── README.md                    # Esta documentação
```

## 🚀 Instalação

### Dependências
```bash
npm install
```

### Desenvolvimento
```bash
# Iniciar apenas o React (navegador)
npm start

# Iniciar Electron + React (aplicação desktop)
npm run electron-dev
```

### Build para Produção
```bash
# Build do React
npm run build

# Build do Electron
npm run electron-pack
```

## 📖 Como Usar

### Desenvolvimento
```bash
# Terminal 1: Backend Python (opcional)
cd ../backend
python3 main.py --interactive

# Terminal 2: Frontend Electron
npm run electron-dev
```

### Produção
```bash
npm run electron-pack
```

## 🔧 Configuração

### package.json
- **name**: cutting-optimization-frontend
- **version**: 1.0.0
- **main**: public/electron.js
- **scripts**: start, build, electron-dev, electron-pack

### Electron
- **Versão**: 28.0.0
- **Builder**: electron-builder
- **Preload**: Habilitado para segurança
- **Context Isolation**: Habilitado

### React
- **Versão**: 18.2.0
- **TypeScript**: Habilitado
- **Scripts**: react-scripts 5.0.1

## 📊 Funcionalidades

### Interface
- ✅ Formulário de configuração do problema
- ✅ Entrada de dimensões do material base
- ✅ Gerenciamento dinâmico de peças
- ✅ Opções de otimização (rotação, tempo limite)
- ✅ Visualização de resultados em tempo real
- ✅ Exportação de configurações e resultados

### Comunicação
- ✅ API segura com backend Python
- ✅ Gerenciamento de arquivos (salvar/carregar)
- ✅ Tratamento de erros
- ✅ Feedback visual de progresso

### Design
- ✅ Interface moderna e responsiva
- ✅ Gradientes e animações
- ✅ Layout adaptativo para mobile
- ✅ Feedback visual intuitivo

## 🔌 API Electron

### IPC Handlers
- `optimize-cutting`: Executa otimização
- `save-config`: Salva configuração
- `load-config`: Carrega configuração
- `export-results`: Exporta resultados
- `get-app-version`: Versão da aplicação
- `get-app-name`: Nome da aplicação

### Preload Script
```typescript
window.electronAPI.optimizeCutting(config)
window.electronAPI.saveConfig(config)
window.electronAPI.loadConfig()
window.electronAPI.exportResults(results)
window.electronAPI.getAppVersion()
window.electronAPI.getAppName()
```

## 🎨 Interface

### Características
- **Design Moderno**: Gradientes e sombras
- **Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Intuitivo**: Formulários claros e organizados
- **Feedback Visual**: Estados de loading e erro
- **Acessível**: Contraste adequado e navegação por teclado

### Componentes
- **Configuração**: Material base, peças, opções
- **Resultados**: Métricas, peças colocadas, exportação
- **Ações**: Otimizar, salvar, carregar, exportar

## 🔒 Segurança

- **Context Isolation**: Habilitado
- **Node Integration**: Desabilitado
- **Preload Script**: APIs seguras expostas
- **Validação**: Entrada de dados validada
- **Sanitização**: Dados processados com segurança

## 📦 Build

### Configuração
- **appId**: com.cuttingoptimization.app
- **productName**: Cutting Optimization
- **directories.output**: dist
- **extraResources**: Backend Python incluído

### Plataformas
- **mac**: DMG
- **win**: NSIS
- **linux**: AppImage

## 🚀 Próximos Passos

1. **Melhorias de UX**
   - Animações de transição
   - Tooltips informativos
   - Atalhos de teclado

2. **Funcionalidades Avançadas**
   - Visualização gráfica do corte
   - Histórico de otimizações
   - Comparação de algoritmos

3. **Integração Backend**
   - Comunicação em tempo real
   - Progresso da otimização
   - Cancelamento de operações

## 🐛 Solução de Problemas

### Erro de Conexão com Backend
```bash
# Verificar se o backend está rodando
cd ../backend
python3 main.py --interactive
```

### Erro de Porta em Uso
```bash
# Matar processos na porta 3000
lsof -ti:3000 | xargs kill -9
```

### Erro de Dependências
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

**Frontend Electron + React do sistema de otimização de corte bidimensional.**
