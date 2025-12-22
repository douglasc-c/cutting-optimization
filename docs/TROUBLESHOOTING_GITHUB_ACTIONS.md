# 🔧 Troubleshooting - GitHub Actions Build

## Erro: "Process completed with exit code 1"

Este erro indica que algum passo do workflow falhou. Siga estes passos para diagnosticar:

### 1. Verificar os Logs

No GitHub Actions, clique no workflow que falhou e verifique em qual step ele parou:

- **Se falhou no "Build backend executable"**:
  - Verifique se o PyInstaller instalou corretamente
  - Verifique se todas as dependências Python foram instaladas
  - Veja os logs completos do PyInstaller

- **Se falhou no "Build React app"**:
  - Verifique se as dependências npm foram instaladas
  - Verifique se há erros de compilação TypeScript/React
  - Veja os logs do `npm run build`

- **Se falhou no "Build Windows installer"**:
  - Verifique se o executável do backend existe
  - Verifique se o build do React foi criado
  - Veja os logs do electron-builder

### 2. Usar o Workflow de Debug

Execute o workflow de debug para obter mais informações:

1. Vá em: `https://github.com/SEU_USUARIO/SEU_REPO/actions`
2. Selecione "Build Windows Installer (Debug)"
3. Clique em "Run workflow"
4. Este workflow tem logs mais detalhados

### 3. Problemas Comuns

#### Problema: Executável do backend não encontrado

**Sintoma**: Erro no step "Verify backend executable"

**Solução**:
- Verifique se `build_exe_windows.py` está no diretório `backend/`
- Verifique se o PyInstaller conseguiu gerar o executável
- Veja os logs do PyInstaller para erros

#### Problema: Build do React falha

**Sintoma**: Erro no step "Build React app"

**Solução**:
- Verifique se há erros de TypeScript no código
- Verifique se todas as dependências estão no `package.json`
- Tente executar `npm run build` localmente primeiro

#### Problema: electron-builder não encontra arquivos

**Sintoma**: Erro no step "Build Windows installer"

**Solução**:
- Verifique se `backend/cutting-optimization-backend.exe` existe
- Verifique se `frontend/build/` existe
- Verifique a configuração do `extraResources` no `package.json`

### 4. Verificar Estrutura do Projeto

Certifique-se de que a estrutura está correta:

```
projeto/
├── .github/
│   └── workflows/
│       └── build-windows-installer.yml
├── backend/
│   ├── build_exe_windows.py
│   ├── main.py
│   ├── requirements.txt
│   └── src/
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
└── config/
```

### 5. Testar Localmente (Windows)

Se possível, teste localmente primeiro:

```batch
# No Windows
cd backend
python build_exe_windows.py

# Verificar se o executável foi criado
dir cutting-optimization-backend.exe

# Build do frontend
cd ..\frontend
npm install
npm run build
npm run dist-win
```

### 6. Verificar Versões

Certifique-se de que as versões são compatíveis:

- Python: 3.9+
- Node.js: 18+
- npm: 8+

### 7. Limpar e Tentar Novamente

Às vezes, limpar o cache ajuda:

1. Vá em Settings > Actions > Caches
2. Delete os caches antigos
3. Execute o workflow novamente

### 8. Contatar Suporte

Se nada funcionar:

1. Execute o workflow de debug
2. Copie os logs completos
3. Verifique se há issues conhecidas no GitHub
4. Crie uma nova issue com os logs

## Logs Úteis para Compartilhar

Se precisar de ajuda, compartilhe:

1. O step que falhou
2. Os logs completos desse step
3. A estrutura do seu projeto
4. Versões do Python e Node.js (se testou localmente)

## Comandos de Debug

Adicione estes comandos temporariamente no workflow para debug:

```yaml
- name: Debug - List files
  run: |
    Write-Host "Backend files:"
    Get-ChildItem backend -Recurse | Select-Object FullName
    Write-Host "Frontend files:"
    Get-ChildItem frontend -Recurse -Depth 2 | Select-Object FullName
```

