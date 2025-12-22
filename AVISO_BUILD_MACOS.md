# ⚠️ Aviso: Build Windows a partir do macOS

## Situação Atual

Você está tentando gerar um instalador Windows a partir do macOS. Isso é possível, mas tem limitações:

### Problemas Encontrados:
1. **Permissões do pip**: O Python do sistema macOS tem restrições de segurança
2. **Cross-compilation**: Gerar executável Windows a partir do macOS requer configuração adicional

## Soluções

### ✅ Opção 1: Executar no Windows (RECOMENDADO)

A melhor opção é executar o build diretamente em uma máquina Windows:

1. Copie o projeto para uma máquina Windows
2. Execute: `scripts\build-windows-installer.bat`
3. O instalador será gerado em `frontend\dist\`

### ✅ Opção 2: Corrigir Permissões no macOS

Se você realmente precisa fazer isso no macOS:

1. **Instalar PyInstaller manualmente:**
   ```bash
   python3 -m pip install --user pyinstaller
   ```

2. **Ou usar um ambiente virtual:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install pyinstaller
   pip install -r requirements.txt
   python build_exe_windows.py
   ```

3. **Nota importante**: PyInstaller no macOS pode gerar executáveis Windows, mas:
   - Requer Wine ou uma VM Windows para testar
   - Pode ter problemas com algumas dependências
   - Não é garantido que funcione 100%

### ✅ Opção 3: Usar Docker ou VM Windows

1. Use uma VM Windows (VirtualBox, Parallels, etc.)
2. Ou use Docker com uma imagem Windows
3. Execute o build dentro do ambiente Windows

## Recomendação Final

**Para garantir que tudo funcione corretamente, execute o build em uma máquina Windows real.**

O script `build-windows-installer.bat` foi criado especificamente para Windows e funcionará perfeitamente lá.

