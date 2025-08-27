# Documentação - Algoritmo de Otimização de Corte Bidimensional

## 📋 Visão Geral

Este projeto implementa uma solução para o problema clássico de **otimização de corte bidimensional (2D Cutting Stock Problem)**, muito utilizado em indústrias como têxtil, papel, adesivo, madeira, vidro e metal.

### 🎯 Objetivo
Encaixar peças menores em uma dimensão maior (rolo, chapa, bobina) de forma a reduzir ao máximo o desperdício de material.

## 🏗️ Arquitetura do Sistema

### Módulos Principais

#### 1. `cutting_optimizer.py` - Algoritmo MILP
- **Tecnologia**: Programação Linear Inteira Mista (MILP)
- **Solver**: PuLP + CBC
- **Características**:
  - Garante otimalidade (quando converge)
  - Suporte a rotação de peças
  - Restrições de corte guilhotina
  - Ideal para problemas pequenos a médios

#### 2. `cutting_optimizer_simple.py` - Algoritmo Heurístico
- **Tecnologia**: Heurísticas de posicionamento
- **Características**:
  - Execução rápida
  - Não garante otimalidade
  - Ideal para problemas grandes
  - Heurística de "canto inferior esquerdo"

#### 3. `visualization.py` - Visualização
- **Tecnologia**: Matplotlib
- **Funcionalidades**:
  - Plano de corte visual
  - Análise de desperdício
  - Comparação de resultados
  - Exportação para SVG

#### 4. `utils.py` - Utilitários
- **Funcionalidades**:
  - Carregamento/salvamento de configurações
  - Validação de dados
  - Cálculo de métricas de eficiência
  - Exportação de resultados

## 🚀 Como Usar

### Instalação

```bash
# Instalar dependências
pip install -r requirements.txt
```

### Uso Básico

#### 1. Via Script Principal
```bash
# Modo interativo
python3 main.py --interactive

# Via arquivo de configuração
python3 main.py --config examples/config_example.json

# Via linha de comando
python3 main.py --stock 1000 800 --pieces "200,300,2" "150,200,3"
```

#### 2. Via Código Python
```python
from cutting_optimizer_simple import SimpleCuttingOptimizer

# Configurar problema
optimizer = SimpleCuttingOptimizer(
    stock_width=1000,
    stock_height=800,
    pieces=[(200, 300, 2), (150, 200, 3), (100, 100, 5)],
    allow_rotation=True
)

# Executar otimização
result = optimizer.optimize(time_limit=60)

# Ver resultados
print(f"Desperdício: {result.waste_percentage:.2f}%")
print(f"Peças cortadas: {len(result.pieces_placed)}")
```

### 3. Teste Rápido
```bash
python3 test_simple.py
```

## 📊 Estrutura de Dados

### Configuração de Entrada
```python
{
    "stock_width": 1000,      # Largura do material base (mm)
    "stock_height": 800,      # Altura do material base (mm)
    "pieces": [               # Lista de peças
        [200, 300, 2],        # [largura, altura, quantidade]
        [150, 200, 3],
        [100, 100, 5]
    ],
    "allow_rotation": true,   # Permite rotação das peças
    "guillotine_cut": true,   # Restringe a cortes guilhotina
    "time_limit": 300         # Limite de tempo (segundos)
}
```

### Resultado da Otimização
```python
CuttingResult(
    pieces_placed=[           # Lista de peças posicionadas
        {
            'id': 'piece_0',
            'x': 0,           # Posição X
            'y': 0,           # Posição Y
            'width': 200,     # Largura
            'height': 300,    # Altura
            'area': 60000     # Área
        }
    ],
    stock_used=1,             # Número de chapas utilizadas
    waste_percentage=25.5,    # Percentual de desperdício
    execution_time=2.34,      # Tempo de execução
    is_optimal=True,          # Se a solução é ótima
    total_area=800000,        # Área total do material
    used_area=595000          # Área utilizada
)
```

## 🔧 Algoritmos Implementados

### 1. Algoritmo MILP (Programação Linear Inteira Mista)

**Vantagens:**
- Garante otimalidade quando converge
- Considera todas as restrições
- Suporte completo a rotação

**Desvantagens:**
- Tempo de execução exponencial
- Limitado a problemas pequenos
- Requer mais memória

**Aplicação:** Problemas com até 10-15 peças

### 2. Algoritmo Heurístico

**Vantagens:**
- Execução rápida
- Escalável para problemas grandes
- Baixo uso de memória

**Desvantagens:**
- Não garante otimalidade
- Resultados podem variar

**Aplicação:** Problemas com 20+ peças

## 📈 Métricas de Performance

### Eficiência de Área
```
Eficiência = (Área Utilizada / Área Total) × 100
```

### Densidade de Peças
```
Densidade = Número de Peças / (Área Total / 10000)  # peças/m²
```

### Tempo de Execução
- **MILP**: 1-300 segundos (dependendo do problema)
- **Heurístico**: 0.1-30 segundos

## 🎨 Visualizações Disponíveis

### 1. Plano de Corte
- Representação visual do material base
- Peças coloridas por tipo
- Coordenadas e dimensões

### 2. Análise de Desperdício
- Gráfico de pizza: área utilizada vs desperdício
- Gráfico de barras: estatísticas detalhadas

### 3. Comparação de Resultados
- Comparação lado a lado de diferentes configurações
- Métricas de eficiência

## 📁 Estrutura de Arquivos

```
cutting-optimization/
├── cutting_optimizer.py          # Algoritmo MILP
├── cutting_optimizer_simple.py   # Algoritmo heurístico
├── visualization.py              # Visualizações
├── utils.py                      # Utilitários
├── main.py                       # Script principal
├── test_simple.py                # Testes rápidos
├── example.py                    # Exemplos de uso
├── requirements.txt              # Dependências
├── README.md                     # Documentação básica
├── DOCUMENTACAO.md               # Esta documentação
├── examples/                     # Exemplos de configuração
│   └── config_example.json
└── output/                       # Resultados gerados
```

## 🔍 Casos de Uso

### 1. Indústria Têxtil
- Corte de tecidos em rolos
- Otimização de padrões de corte
- Redução de desperdício

### 2. Indústria de Papel
- Corte de folhas de papel
- Otimização de bobinas
- Planejamento de produção

### 3. Marcenaria
- Corte de madeira
- Otimização de chapas
- Planejamento de móveis

### 4. Indústria Metalúrgica
- Corte de chapas metálicas
- Otimização de placas
- Redução de custos

## 🚀 Próximos Passos

### Melhorias Planejadas

1. **Algoritmos Avançados**
   - Algoritmo genético
   - Simulated annealing
   - Branch and bound

2. **Interface Gráfica**
   - Aplicação desktop com Electron
   - Interface web com React
   - Aplicação mobile

3. **Funcionalidades Adicionais**
   - Múltiplas chapas
   - Restrições de máquina
   - Cálculo de custos
   - Integração com CAD

4. **Otimizações**
   - Paralelização
   - Cache de soluções
   - Heurísticas adaptativas

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Tempo de execução muito alto**
   - Use o algoritmo heurístico
   - Reduza o número de peças
   - Aumente o limite de tempo

2. **Memória insuficiente**
   - Use o algoritmo heurístico
   - Reduza as dimensões do material
   - Divida o problema

3. **Resultados não ótimos**
   - Aumente o tempo limite
   - Use o algoritmo MILP
   - Ajuste as heurísticas

### Logs e Debug

```python
# Habilitar logs detalhados
import logging
logging.basicConfig(level=logging.DEBUG)

# Verificar configuração
print(optimizer.get_statistics())

# Validar entrada
from utils import validate_pieces_fit_stock
validation = validate_pieces_fit_stock(stock_width, stock_height, pieces)
```

## 📚 Referências

1. **Problema de Corte Bidimensional**
   - [Wikipedia - 2D Cutting Stock Problem](https://en.wikipedia.org/wiki/Cutting_stock_problem)
   - [OR-Tools Documentation](https://developers.google.com/optimization)

2. **Algoritmos de Otimização**
   - [PuLP Documentation](https://coin-or.github.io/pulp/)
   - [SciPy Optimization](https://docs.scipy.org/doc/scipy/reference/optimize.html)

3. **Visualização**
   - [Matplotlib Documentation](https://matplotlib.org/)
   - [Python Data Visualization](https://python-graph-gallery.com/)

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👥 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique esta documentação
2. Execute os testes de exemplo
3. Abra uma issue no GitHub
4. Entre em contato com a equipe

---

**Desenvolvido com ❤️ para otimizar o uso de materiais e reduzir desperdícios industriais.**
