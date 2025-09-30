# Dockerfile para o projeto Cutting Optimization
# Autor: Douglas Cesário
# Versão: 1.0.0

# Usar imagem base do Node.js
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    python3-dev

# Copiar arquivos de configuração
COPY package*.json ./
COPY Makefile ./
COPY scripts/ ./scripts/
COPY config/ ./config/

# Instalar dependências do Node.js
RUN npm install

# Copiar backend
COPY backend/ ./backend/

# Instalar dependências Python
RUN cd backend && pip3 install -r requirements.txt

# Copiar frontend
COPY frontend/ ./frontend/

# Instalar dependências do frontend
RUN cd frontend && npm install

# Build do frontend
RUN cd frontend && npm run build

# Expor porta
EXPOSE 3000

# Comando padrão
CMD ["make", "start"]
