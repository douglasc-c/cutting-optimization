#!/bin/bash
echo "Verificando instalação do Cutting Optimization..."

# Verificar Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js $(node -v) encontrado"
else
    echo "❌ Node.js não encontrado"
fi

# Verificar Python
if command -v python3 &> /dev/null; then
    echo "✅ Python $(python3 --version) encontrado"
else
    echo "❌ Python 3 não encontrado"
fi

# Verificar pip
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 encontrado"
else
    echo "❌ pip3 não encontrado"
fi

echo "Verificação concluída!"
