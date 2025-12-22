# 🪟 Gerar Instalador Windows a partir do macOS

Como desenvolvedor no macOS, você precisa gerar um instalador Windows (.exe) para seu cliente. Existem várias opções:

## ✅ Opção 1: GitHub Actions (RECOMENDADO - Gratuito)

Esta é a melhor opção: use GitHub Actions para fazer o build automaticamente em uma máquina Windows na nuvem.

### Passo a Passo:

1. **Criar repositório no GitHub** (se ainda não tiver):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```

2. **Instalar GitHub CLI** (opcional, facilita o processo):
   ```bash
   brew install gh
   gh auth login
   ```

3. **Executar build remoto**:
   ```bash
   chmod +x scripts/build-windows-remote.sh
   ./scripts/build-windows-remote.sh
   ```

4. **Ou executar manualmente no GitHub**:
   - Acesse: `https://github.com/SEU_USUARIO/SEU_REPO/actions`
   - Clique em "Build Windows Installer"
   - Clique em "Run workflow"
   - Selecione a branch e clique em "Run workflow"

5. **Baixar o instalador**:
   - Após o build concluir (5-15 minutos)
   - Vá na aba "Artifacts"
   - Baixe o arquivo `.exe`

### Vantagens:
- ✅ Gratuito (até 2000 minutos/mês)
- ✅ Não precisa de máquina Windows
- ✅ Automatizado
- ✅ Pode ser agendado ou executado manualmente

---

## ✅ Opção 2: VM Windows (Local)

Use uma máquina virtual Windows no seu Mac.

### Requisitos:
- **Parallels Desktop** (pago) ou **VMware Fusion** (pago) ou **VirtualBox** (gratuito)
- Imagem ISO do Windows 10/11

### Passo a Passo:

1. **Instalar VM**:
   - Baixe VirtualBox: https://www.virtualbox.org/
   - Baixe Windows ISO: https://www.microsoft.com/software-download/windows10

2. **Configurar VM**:
   - Crie uma nova VM com Windows
   - Aloque pelo menos 4GB RAM e 50GB disco

3. **Instalar ferramentas**:
   - Na VM Windows, instale Python 3.9+ e Node.js 16+
   - Clone ou copie seu projeto

4. **Executar build**:
   ```batch
   scripts\build-windows-installer.bat
   ```

### Vantagens:
- ✅ Controle total
- ✅ Pode testar localmente
- ✅ Não depende de internet (após setup)

### Desvantagens:
- ❌ Requer licença Windows
- ❌ Consome recursos do Mac
- ❌ Setup inicial demorado

---

## ✅ Opção 3: Docker com Windows Container

Use Docker para rodar um container Windows.

### Requisitos:
- Docker Desktop com suporte a containers Windows
- Windows 10/11 Pro ou Enterprise (para Hyper-V)

### Passo a Passo:

1. **Habilitar containers Windows no Docker Desktop**

2. **Criar Dockerfile Windows**:
   ```dockerfile
   FROM mcr.microsoft.com/windows/servercore:ltsc2022
   # ... configuração do ambiente
   ```

3. **Build no container**:
   ```bash
   docker build -t cutting-optimization-build .
   docker run -v ${PWD}:/app cutting-optimization-build
   ```

### Vantagens:
- ✅ Isolado
- ✅ Reproduzível

### Desvantagens:
- ❌ Requer Windows Pro/Enterprise
- ❌ Containers Windows são grandes
- ❌ Mais complexo

---

## ✅ Opção 4: Serviços de Build Remoto

Use serviços pagos de build remoto.

### Opções:
- **AppVeyor** (gratuito para projetos open source)
- **CircleCI** (2000 minutos grátis/mês)
- **GitLab CI/CD** (gratuito)

### Exemplo com AppVeyor:

1. Criar conta em: https://www.appveyor.com/
2. Conectar repositório GitHub
3. Adicionar `appveyor.yml`:
   ```yaml
   image: Visual Studio 2019
   build_script:
     - cd backend
     - python build_exe_windows.py
     - cd ../frontend
     - npm install
     - npm run build
     - npm run dist-win
   artifacts:
     - path: frontend/dist/*.exe
   ```

---

## ✅ Opção 5: Máquina Windows Remota (Cloud)

Alugue uma máquina Windows na nuvem.

### Serviços:
- **AWS EC2** (Windows Server)
- **Azure Virtual Machines**
- **Google Cloud Compute Engine**

### Passo a Passo:

1. Criar instância Windows na nuvem
2. Conectar via RDP
3. Instalar Python e Node.js
4. Clonar projeto
5. Executar build

### Vantagens:
- ✅ Poder de processamento dedicado
- ✅ Paga apenas pelo uso

### Desvantagens:
- ❌ Custo (cerca de $0.10-0.50/hora)
- ❌ Requer configuração

---

## 🎯 Recomendação Final

**Para a maioria dos casos, use GitHub Actions (Opção 1)**:
- É gratuito
- Fácil de configurar
- Automatizado
- Não precisa de máquina Windows
- Funciona perfeitamente para este caso

## 📋 Checklist Rápido

- [ ] Código no GitHub
- [ ] Workflow configurado (já está em `.github/workflows/`)
- [ ] Executar workflow manualmente ou via script
- [ ] Aguardar build (5-15 minutos)
- [ ] Baixar instalador da aba Artifacts
- [ ] Testar instalador em máquina Windows
- [ ] Distribuir para cliente

## 🔧 Troubleshooting

### Workflow falha no GitHub Actions
- Verifique os logs na aba Actions
- Certifique-se de que todas as dependências estão no `requirements.txt`
- Verifique se o `package.json` está correto

### Instalador não funciona no Windows do cliente
- Teste em uma VM Windows primeiro
- Verifique se o executável do backend foi incluído
- Verifique os logs do Electron (DevTools)

### Build muito lento
- Normal, pode levar 10-30 minutos
- Depende da velocidade da máquina virtual do GitHub

## 📞 Próximos Passos

1. Escolha uma opção acima
2. Configure conforme instruções
3. Execute o build
4. Teste o instalador
5. Distribua para o cliente

**Boa sorte! 🚀**

