#!/bin/bash
# Script para gerar instalador Windows usando GitHub Actions
# Este script envia o código para o GitHub e executa o build no Windows

set -e

echo "========================================"
echo "BUILD REMOTO DO INSTALADOR WINDOWS"
echo "Usando GitHub Actions"
echo "========================================"
echo ""

# Verificar se git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ ERRO: Git não encontrado!"
    echo "Por favor, instale Git: https://git-scm.com/"
    exit 1
fi

# Verificar se gh (GitHub CLI) está instalado
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI não encontrado"
    echo "Instalando GitHub CLI..."
    echo "Por favor, instale manualmente: https://cli.github.com/"
    echo ""
    echo "Ou você pode:"
    echo "1. Fazer push do código para o GitHub"
    echo "2. Ir em Actions no GitHub"
    echo "3. Executar o workflow 'Build Windows Installer' manualmente"
    exit 1
fi

# Verificar se está em um repositório git
if [ ! -d ".git" ]; then
    echo "⚠️  Não é um repositório Git"
    echo "Inicializando repositório Git..."
    git init
    git add .
    git commit -m "Initial commit"
    echo ""
    echo "Por favor, crie um repositório no GitHub e configure o remote:"
    echo "  git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Há mudanças não commitadas"
    read -p "Deseja fazer commit? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[YySs]$ ]]; then
        git add .
        git commit -m "chore: preparar build Windows"
    else
        echo "Por favor, faça commit das mudanças antes de continuar"
        exit 1
    fi
fi

# Verificar se há um remote configurado
if ! git remote | grep -q origin; then
    echo "⚠️  Nenhum remote 'origin' configurado"
    echo "Por favor, configure o remote:"
    echo "  git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git"
    exit 1
fi

echo "📤 Fazendo push para o GitHub..."
git push origin main || git push origin master

echo ""
echo "🚀 Disparando workflow no GitHub Actions..."
gh workflow run "Build Windows Installer.yml" || {
    echo ""
    echo "⚠️  Não foi possível disparar o workflow automaticamente"
    echo ""
    echo "Por favor:"
    echo "1. Acesse: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
    echo "2. Clique em 'Build Windows Installer'"
    echo "3. Clique em 'Run workflow'"
    echo ""
}

echo ""
echo "✅ Build iniciado no GitHub Actions!"
echo ""
echo "📋 Próximos passos:"
echo "1. Acompanhe o progresso em: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo "2. Quando concluir, baixe o instalador na aba 'Artifacts'"
echo "3. O instalador estará em formato .exe pronto para distribuição"
echo ""

