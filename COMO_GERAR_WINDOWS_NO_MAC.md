# 🚀 Como Gerar Instalador Windows a partir do Mac

## Solução Recomendada: GitHub Actions (Gratuito)

### Passo 1: Preparar o Repositório

```bash
# Se ainda não tem Git configurado:
git init
git add .
git commit -m "Preparar build Windows"

# Se já tem repositório no GitHub:
git push origin main
```

### Passo 2: Executar Build no GitHub

**Opção A - Via Interface Web (Mais Fácil):**

1. Acesse: `https://github.com/SEU_USUARIO/SEU_REPO/actions`
2. Clique em **"Build Windows Installer"** no menu lateral
3. Clique em **"Run workflow"**
4. Selecione a branch (geralmente `main`)
5. Clique em **"Run workflow"** novamente
6. Aguarde 10-15 minutos
7. Baixe o instalador na aba **"Artifacts"**

**Opção B - Via GitHub CLI:**

```bash
# Instalar GitHub CLI (se não tiver)
brew install gh
gh auth login

# Executar workflow
gh workflow run "Build Windows Installer.yml"
```

### Passo 3: Baixar o Instalador

1. Vá em: `https://github.com/SEU_USUARIO/SEU_REPO/actions`
2. Clique no workflow que acabou de executar
3. Role até o final da página
4. Na seção **"Artifacts"**, clique em **"windows-installer"**
5. Baixe o arquivo `.exe`

### Pronto! 🎉

O arquivo `.exe` baixado é o instalador completo que seu cliente pode usar no Windows!

---

## Alternativas

### Opção 2: VM Windows (Local)

Se você tem Parallels, VMware ou VirtualBox:

1. Instale Windows na VM
2. Instale Python 3.9+ e Node.js 16+
3. Copie o projeto para a VM
4. Execute: `scripts\build-windows-installer.bat`

### Opção 3: Serviços Pagos

- **AppVeyor** - Gratuito para open source
- **CircleCI** - 2000 minutos grátis/mês
- **AWS/Azure** - Máquina Windows na nuvem (~$0.10/hora)

---

## 📋 Checklist

- [ ] Código no GitHub
- [ ] Workflow configurado (já está criado!)
- [ ] Executar workflow no GitHub Actions
- [ ] Aguardar build (10-15 min)
- [ ] Baixar instalador
- [ ] Testar em Windows
- [ ] Enviar para cliente

---

## ❓ Dúvidas?

Veja a documentação completa em: `docs/BUILD_WINDOWS_FROM_MAC.md`

