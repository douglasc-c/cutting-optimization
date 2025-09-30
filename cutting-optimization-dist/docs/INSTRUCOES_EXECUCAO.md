# Instruções de Execução - Cutting Optimization

## 🚨 Problema Resolvido

O erro `Cannot read properties of undefined (reading 'optimizeCutting')` ocorre quando você tenta executar o aplicativo como uma aplicação React normal no navegador, mas ele foi projetado para funcionar como um aplicativo Electron.

## ✅ Como Executar Corretamente

### Opção 1: Usando o script principal
```bash
# No diretório raiz do projeto
npm run start:electron
```

### Opção 2: Usando o script do frontend
```bash
# No diretório frontend
cd frontend
npm run electron-dev
```

### Opção 3: Usando o script shell
```bash
# No diretório frontend
cd frontend
./start-electron.sh
```

## 🔧 Por que o erro acontecia?

1. **Aplicação Electron vs React**: O aplicativo usa Electron para comunicação com o backend Python
2. **API do Electron**: A função `optimizeCutting` só está disponível quando executada no Electron
3. **Preload Script**: O arquivo `preload.js` expõe a API do Electron para o frontend

## 📁 Estrutura dos Arquivos

```
frontend/
├── public/
│   ├── electron.js      # Processo principal do Electron
│   ├── preload.js       # Script que expõe a API
│   └── index.html       # Página principal
├── src/
│   ├── App.tsx          # Componente principal
│   ├── electron.d.ts    # Declarações de tipos
│   └── ...
└── package.json         # Configuração do projeto
```

## 🐛 Soluções Implementadas

1. **Verificação de Segurança**: Adicionada verificação se `window.electronAPI` existe
2. **Declarações de Tipos**: Criado arquivo `electron.d.ts` para TypeScript
3. **Scripts de Inicialização**: Criados scripts para facilitar a execução
4. **Logs de Debug**: Adicionados logs para identificar problemas

## 🧪 Teste da API

O aplicativo agora inclui logs de debug que mostram:
- Se a API do Electron está disponível
- Quais métodos estão disponíveis
- Se há erros na inicialização

## 📝 Comandos Úteis

```bash
# Instalar todas as dependências
npm run install:all

# Executar apenas o backend
npm run start:backend

# Executar apenas o frontend React (sem Electron)
npm run start:frontend

# Executar o aplicativo completo (Electron)
npm run start:electron

# Testar o backend
npm run test:backend
```

## 🎯 Resultado Esperado

Após executar corretamente, você deve ver:
1. Uma janela do Electron abrindo
2. O aplicativo React carregando dentro do Electron
3. Logs no console mostrando "✅ API do Electron disponível"
4. Funcionalidade completa de otimização de corte
