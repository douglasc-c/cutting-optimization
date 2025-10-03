# Makefile para o projeto de otimização de corte bidimensional
# Autor: Douglas Cesário
# Versão: 1.0.0

.PHONY: help install install-backend install-frontend test test-backend test-frontend start start-backend start-frontend clean build dist setup validate

# Comandos principais
help: ## Mostra esta ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Configuração inicial do projeto
	@echo "🚀 Configurando projeto..."
	@chmod +x scripts/*.sh
	@echo "✅ Scripts configurados"

validate: ## Valida a estrutura do projeto
	@echo "🔍 Validando projeto..."
	@./scripts/validate.sh

install: install-backend install-frontend ## Instala todas as dependências

install-backend: ## Instala dependências do backend
	@echo "📦 Instalando dependências do backend..."
	cd backend && pip3 install -r requirements.txt && pip3 install -e .

install-frontend: ## Instala dependências do frontend
	@echo "📦 Instalando dependências do frontend..."
	cd frontend && npm install

test: test-backend test-frontend ## Executa todos os testes

test-backend: ## Executa testes do backend
	@echo "🧪 Executando testes do backend..."
	cd backend && pip3 install -e . && python3 tests/test_rapido.py

test-frontend: ## Executa testes do frontend
	@echo "🧪 Executando testes do frontend..."
	cd frontend && npm test

start: ## Inicia o aplicativo completo
	@echo "🚀 Iniciando aplicativo..."
	@./scripts/start.sh

start-backend: ## Inicia o backend em modo interativo
	@echo "🚀 Iniciando backend..."
	cd backend && python3 main.py --interactive

start-frontend: ## Inicia o frontend Electron
	@echo "🚀 Iniciando frontend..."
	cd frontend && npm run electron-dev

build: ## Build do projeto completo
	@echo "🔨 Build do projeto..."
	@./scripts/build.sh

dist: ## Distribuição do frontend
	@echo "📦 Criando distribuição..."
	cd frontend && npm run dist

clean: ## Limpa arquivos temporários
	@echo "🧹 Limpando arquivos temporários..."
	@./scripts/clean.sh

# Comandos de desenvolvimento
dev-backend: ## Modo desenvolvimento do backend
	@echo "🔧 Modo desenvolvimento do backend..."
	cd backend && python3 main.py --interactive

dev-frontend: ## Modo desenvolvimento do frontend
	@echo "🔧 Modo desenvolvimento do frontend..."
	cd frontend && npm start

# Comandos de documentação
docs: ## Gera documentação
	@echo "📚 Gerando documentação..."
	@echo "Documentação disponível em:"
	@echo "  - README.md (principal)"
	@echo "  - backend/README.md (backend)"
	@echo "  - frontend/README.md (frontend)"
	@echo "  - DOCUMENTACAO.md (completa)"

# Comandos de verificação
check: ## Verifica a estrutura do projeto
	@echo "🔍 Verificando estrutura do projeto..."
	@echo "✅ Backend: $(shell test -d backend && echo "OK" || echo "FALTANDO")"
	@echo "✅ Frontend: $(shell test -d frontend && echo "OK" || echo "FALTANDO")"
	@echo "✅ Tests: $(shell test -d backend/tests && echo "OK" || echo "FALTANDO")"
	@echo "✅ Examples: $(shell test -d backend/examples && echo "OK" || echo "FALTANDO")"

# Comandos de exemplo
example: ## Executa exemplo rápido
	@echo "🎯 Executando exemplo rápido..."
	cd backend && pip3 install -e . && python3 tests/test_rapido.py

demo: ## Executa demonstração completa
	@echo "🎯 Executando demonstração completa..."
	cd backend && pip3 install -e . && python3 tests/demo_final.py

# Comandos de backup
backup: ## Cria backup do projeto
	@echo "💾 Criando backup..."
	tar -czf cutting-optimization-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz --exclude=node_modules --exclude=__pycache__ --exclude=*.pyc .

# Comandos de distribuição
distribution: ## Cria pacote de distribuição
	@echo "📦 Criando pacote de distribuição..."
	@chmod +x scripts/create-distribution.sh
	@./scripts/create-distribution.sh

electron-installer: ## Cria instalador Electron
	@echo "🔨 Criando instalador Electron..."
	@chmod +x scripts/build-electron-installer.sh
	@./scripts/build-electron-installer.sh

electron-all: ## Cria instaladores para todas as plataformas
	@echo "🔨 Criando instaladores para todas as plataformas..."
	@chmod +x scripts/build-all-platforms.sh
	@./scripts/build-all-platforms.sh

electron-mac: ## Cria instalador para macOS
	@echo "🍎 Criando instalador para macOS..."
	@cd frontend && npm run dist-mac

electron-win: ## Cria instalador para Windows
	@echo "🪟 Criando instalador para Windows..."
	@cd frontend && npm run dist-win

electron-linux: ## Cria instalador para Linux
	@echo "🐧 Criando instalador para Linux..."
	@cd frontend && npm run dist-linux

install-linux: ## Instala no Linux/macOS
	@echo "🐧 Instalando no Linux/macOS..."
	@chmod +x scripts/install.sh
	@./scripts/install.sh

install-windows: ## Instala no Windows
	@echo "🪟 Instalando no Windows..."
	@scripts/install.bat

# Comandos de deploy
deploy: build dist ## Deploy completo
	@echo "🚀 Deploy completo realizado!"
	@echo "Arquivos de distribuição em: frontend/dist/"

deploy-full: build distribution electron-installer ## Deploy completo com todos os formatos
	@echo "🚀 Deploy completo realizado!"
	@echo "Arquivos de distribuição:"
	@echo "  - Pacote: cutting-optimization-v*.tar.gz"
	@echo "  - Instalador Electron: frontend/dist/"
