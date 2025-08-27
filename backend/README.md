# Backend - Otimização de Corte Bidimensional

Backend Python para o sistema de otimização de corte bidimensional.

## 🏗️ Estrutura

```
backend/
├── src/                          # Código fonte Python
│   ├── core/                     # Algoritmos de otimização
│   │   ├── cutting_optimizer.py          # Algoritmo MILP
│   │   ├── cutting_optimizer_simple.py   # Algoritmo heurístico básico
│   │   ├── cutting_optimizer_fast.py     # Algoritmo ultra-rápido
│   │   ├── cutting_optimizer_improved.py # Algoritmo melhorado
│   │   └── cutting_optimizer_smart.py    # Algoritmo inteligente
│   ├── utils/                    # Utilitários
│   │   └── utils.py
│   ├── visualization/            # Visualização
│   │   └── visualization.py
│   └── api.py                   # API principal
├── tests/                        # Testes
├── examples/                     # Exemplos
├── output/                       # Resultados gerados
├── main.py                       # Script principal CLI
├── setup.py                      # Configuração de instalação
├── requirements.txt              # Dependências Python
└── README.md                     # Esta documentação
```

## 🚀 Instalação

### Dependências
```bash
pip install -r requirements.txt
```

### Instalação do Projeto
```bash
pip install -e .
```

## 📖 Como Usar

### Via Linha de Comando

#### Modo Interativo
```bash
python main.py --interactive
```

#### Via Arquivo de Configuração
```bash
python main.py --config examples/config_example.json
```

#### Via Parâmetros
```bash
python main.py --stock 1000 800 --pieces "200,300,2" "150,200,3"
```

### Via Código Python

```python
from src.api import api

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

## 🧪 Testes

### Teste Rápido
```bash
python tests/test_rapido.py
```

### Demonstração Completa
```bash
python tests/demo_final.py
```

### Comparação de Algoritmos
```bash
python tests/test_final_melhorado.py
```

## 🔧 Algoritmos Disponíveis

1. **`milp`** - Programação Linear Inteira Mista (ótimo, mas lento)
2. **`simple`** - Algoritmo heurístico básico
3. **`fast`** - Algoritmo ultra-rápido (padrão)
4. **`improved`** - Algoritmo melhorado
5. **`smart`** - Algoritmo inteligente

## 📊 Funcionalidades

- ✅ Múltiplos algoritmos de otimização
- ✅ Visualização gráfica dos resultados
- ✅ Exportação de resultados (CSV, JSON, instruções)
- ✅ Validação de dados de entrada
- ✅ Cálculo de métricas de eficiência
- ✅ Interface de linha de comando
- ✅ API para integração

## 🎨 Visualizações

- Plano de corte visual colorido
- Análise de desperdício com gráficos
- Comparação de resultados
- Exportação para SVG

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

---

**Backend do sistema de otimização de corte bidimensional.**
