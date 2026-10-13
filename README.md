# 🔧 Sistema de Otimização de Corte Bidimensional

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org)
[![Electron](https://img.shields.io/badge/Electron-Latest-green.svg)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Solução completa para otimização de corte de peças menores em chapas/rolos maiores, minimizando desperdício.

## 🚀 Características Principais

- **Algoritmos Avançados**: Múltiplas estratégias de otimização de corte
- **Interface Moderna**: Aplicação desktop com Electron e React
- **Visualização Interativa**: Visualizador de layout de corte em tempo real
- **Configuração Flexível**: Suporte a rotação individual de peças
- **Descrições Personalizadas**: Identificação clara de cada peça
- **Arquitetura Robusta**: Estrutura profissional e bem organizada

## 🏗️ Estrutura do Projeto

```
cutting-optimization/
├── 📁 backend/                     # Backend Python
│   ├── src/                        # Código fonte Python
│   │   ├── core/                   # Algoritmos de otimização
│   │   ├── utils/                  # Utilitários
│   │   ├── visualization/          # Visualização
│   │   └── api.py                  # API principal
│   ├── tests/                      # Testes
│   ├── examples/                   # Exemplos
│   ├── output/                     # Resultados gerados
│   ├── main.py                     # Script principal CLI
│   ├── setup.py                    # Configuração de instalação
│   ├── requirements.txt            # Dependências Python
│   └── README.md                   # Documentação do backend
├── 📁 frontend/                    # Frontend Electron
│   ├── package.json                # Configuração Node.js
│   ├── main.js                     # Processo principal Electron
│   ├── preload.js                  # Script de preload seguro
│   └── README.md                   # Documentação do frontend
├── 📁 docs/                        # Documentação geral
└── README.md                       # Esta documentação
```

## 🚀 Instalação Rápida

### Setup Completo (Recomendado)
```bash
# Clone o repositório
git clone <repository-url>
cd cutting-optimization

# Setup inicial
make setup
make install

# Iniciar aplicação
make start
```

### Instalação Manual

#### Backend Python
```bash
cd backend
pip install -r requirements.txt
pip install -e .
```

#### Frontend Electron
```bash
cd frontend
npm install
```

### Scripts de Automação
```bash
# Inicialização completa
./scripts/start.sh

# Build de produção
./scripts/build.sh

# Limpeza
./scripts/clean.sh
```

## 📖 Como Usar

### Backend - Via Linha de Comando

#### Modo Interativo
```bash
cd backend
python main.py --interactive
```

#### Via Arquivo de Configuração
```bash
cd backend
python main.py --config examples/config_example.json
```

#### Via Parâmetros
```bash
cd backend
python main.py --stock 1000 800 --pieces "200,300,2" "150,200,3"
```

### Backend - Via Código Python

```python
from backend.src.api import api

# Configurar problema
config = {
    'stock_width': 1000,
    'stock_height': 800,
    'pieces': [(200, 300, 2), (150, 200, 3), (100, 100, 5)],
    'allow_rotation': True,
    'time_limit': 60
}

# Executar otimização
result = api.optimize_cutting(
    stock_width=config['stock_width'],
    stock_height=config['stock_height'],
    pieces=config['pieces'],
    algorithm='fast',
    allow_rotation=config['allow_rotation'],
    time_limit=config['time_limit']
)

# Ver resultados
if result['success']:
    print(f"Peças cortadas: {len(result['result']['pieces_placed'])}")
    print(f"Desperdício: {result['result']['waste_percentage']:.2f}%")
```

### Frontend Electron

```bash
cd frontend
npm start
```

## 🔧 Algoritmos Disponíveis

1. **`milp`** - Programação Linear Inteira Mista (ótimo, mas lento)
2. **`simple`** - Algoritmo heurístico básico
3. **`fast`** - Algoritmo ultra-rápido (padrão)
4. **`improved`** - Algoritmo melhorado
5. **`smart`** - Algoritmo inteligente

## 🧪 Testes

### Backend - Teste Rápido
```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

### Backend - Demonstração Completa
```bash
cd backend
python tests/demo_final.py
```

### Backend - Comparação de Algoritmos
```bash
cd backend
python tests/test_final_melhorado.py
```

## 📊 Funcionalidades

### Backend
- ✅ Múltiplos algoritmos de otimização
- ✅ Visualização gráfica dos resultados
- ✅ Exportação de resultados (CSV, JSON, instruções)
- ✅ Validação de dados de entrada
- ✅ Cálculo de métricas de eficiência
- ✅ Interface de linha de comando
- ✅ API para integração

### Frontend
- ✅ Interface desktop nativa
- ✅ Comunicação segura com backend Python
- ✅ Gerenciamento de arquivos
- ✅ Visualização de resultados
- ✅ Exportação de dados

## 🎨 Visualizações

- Plano de corte visual colorido
- Análise de desperdício com gráficos
- Comparação de resultados
- Exportação para SVG

## Aproveitamento do rolo e exportação SVG

O fluxo desktop usa largura fixa e calcula o menor comprimento encontrado para todas as peças. O algoritmo combina Skyline (incluindo a estratégia anterior), MaxRects com três critérios de encaixe, diferentes ordenações e trocas locais. Cada peça mantém sua própria permissão de rotação. A busca respeita o limite de tempo e pode encerrar antes por falta de melhoria ou ao atingir um limite inferior comprovado. Uma tentativa de encaixe que falha não é tratada como prova de impossibilidade.

No modo de altura automática, desperdício e eficiência usam a área efetivamente consumida: largura do rolo × comprimento utilizado. Em chapas de altura fixa, as métricas da chapa inteira são mantidas e o aproveitamento do trecho consumido aparece separadamente. `is_optimal` no algoritmo `fast` só é verdadeiro quando o comprimento atinge o limite inferior por área e dimensões, em milímetros inteiros.

Preview e SVG usam o mesmo layout de nome e dimensões, com rotação, medição do texto, quebra de linha, fonte ajustável e margem interna. Cada peça possui um recorte de proteção e um título com o nome completo. O SVG preserva a escala física 1:1 em mm. Nomes muito extensos em peças pequenas terão fonte menor; fontes substituídas por um editor externo podem alterar a aparência, mas o recorte mantém o texto dentro da peça. As cores identificam o tipo da peça.

Os resultados mantêm as dimensões do cálculo mesmo após editar o formulário. A exportação desktop salva SVG pelo diálogo nativo e gera CSV real com unidades explícitas, descrições escapadas e codificação UTF-8.

Validação a partir da raiz:

```bash
npm run test:backend
npm run test:desktop
CI=true npm run test:frontend -- --watchAll=false --runInBand
CI=true npm run build:frontend
```

## Área de trabalho desktop

O cadastro e o plano de corte ficam em painéis lado a lado, com uma divisória ajustável por arraste ou pelas setas do teclado. Em janelas menores, os painéis se empilham. A tabela de peças permite duplicar linhas, remover e desfazer a última remoção; medidas, quantidade e encaixe na largura são validados junto ao campo.

O visualizador permite zoom pelos botões ou pela roda do mouse, deslocamento por arraste e ajuste à tela. Selecionar uma peça mostra suas medidas, posição e rotação. Também é possível usar Tab/Enter para selecionar peças e, com foco na área do plano, usar `+`/`-` para zoom, setas para deslocar e `0` para ajustar.

O resultado anterior continua disponível durante outro cálculo ou após um cancelamento. Se o cadastro mudou, um aviso identifica o plano como desatualizado. O botão Cancelar interrompe o processo Python; o tempo decorrido e a etapa aparecem sem uma porcentagem fictícia.

A recuperação automática mantém o último cadastro e plano no computador entre sessões. Ela não substitui o arquivo do projeto: o aplicativo indica alterações não salvas e solicita uma decisão antes de abrir outro projeto, criar um novo ou fechar. Salvar grava um JSON compatível com o backend; os projetos recentes ajudam a retomar arquivos já abertos.

A ação Exportar reúne SVG, CSV e JSON e oferece Abrir pasta após salvar. Cancelar um diálogo não gera um aviso de erro. PDF e tema escuro não fazem parte desta etapa.

| Ação | Atalho |
|---|---|
| Novo projeto | Ctrl/Cmd + N |
| Abrir projeto | Ctrl/Cmd + O |
| Salvar projeto | Ctrl/Cmd + S |
| Otimizar corte | Ctrl/Cmd + Enter |
| Exportar | Ctrl/Cmd + Shift + E |

A janela lembra seu tamanho, posição e estado maximizado. O menu nativo está em português, a barra de título sinaliza alterações e a aplicação trata falhas da interface oferecendo reabertura para recuperar o trabalho.

## 📈 Métricas

- Eficiência de área
- Densidade de peças
- Tempo de execução
- Desperdício percentual

## 🔍 Casos de Uso

- Indústria têxtil
- Indústria de papel
- Marcenaria
- Indústria metalúrgica
- Corte de adesivos
- Fabricação de vidros

## 🚀 Próximos Passos

1. **Frontend Completo**
   - Interface React implementada
   - Integração completa com backend
   - Design system moderno

2. **Algoritmos Avançados**
   - Algoritmo genético
   - Simulated annealing
   - Branch and bound

3. **Funcionalidades Adicionais**
   - Múltiplas chapas
   - Restrições de máquina
   - Cálculo de custos
   - Integração com CAD

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 👥 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📚 Documentação

- [Backend](./backend/README.md) - Documentação detalhada do backend
- [Frontend](./frontend/README.md) - Documentação detalhada do frontend
- [Documentação Geral](./DOCUMENTACAO.md) - Documentação completa do sistema

---

**Desenvolvido com ❤️ para otimizar o uso de materiais e reduzir desperdícios industriais.**

## Identidade visual

A marca completa aparece no cabeçalho. O símbolo do rolo e da chapa é utilizado no ícone da janela, nos atalhos, no instalador Windows, no aplicativo macOS e no favicon. O arquivo aprovado está preservado em `frontend/assets/branding/logo-original.png`; os derivados ficam em `frontend/public`.

Para regenerar os arquivos PNG, ICO e ICNS, instale Pillow e execute `npm run generate:branding`. O script mantém as proporções, as cores e a transparência da marca. O nome, a descrição e o idioma da página também refletem o Cutting Optimization. Para visualizar o novo ícone do aplicativo instalado, é necessário gerar e instalar uma nova versão.
