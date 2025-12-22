@echo off
REM Script para gerar instalador Windows completo (.exe)
REM Inclui tanto o frontend Electron quanto o backend Python empacotado
REM O usuário final não precisa instalar Python ou Node.js

setlocal enabledelayedexpansion

echo ========================================
echo BUILD DO INSTALADOR WINDOWS COMPLETO
echo ========================================
echo.

REM Obter diretório do script
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

REM Mudar para o diretório raiz do projeto
cd /d "%PROJECT_ROOT%"

echo 📁 Diretório do projeto: %PROJECT_ROOT%
echo.

REM ========================================
REM PASSO 1: Build do Backend (PyInstaller)
REM ========================================
echo ========================================
echo PASSO 1: Gerando executável do backend
echo ========================================
echo.

cd backend

REM Verificar se Python está disponível
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Python não encontrado!
    echo Por favor, instale Python 3.9 ou superior e tente novamente.
    pause
    exit /b 1
)

echo ✅ Python encontrado
python --version
echo.

REM Executar script de build do backend
echo 🔨 Executando build do backend...
python build_exe_windows.py

if errorlevel 1 (
    echo.
    echo ❌ ERRO: Falha ao gerar executável do backend!
    pause
    exit /b 1
)

echo.
echo ✅ Executável do backend gerado com sucesso!
echo.

REM ========================================
REM PASSO 2: Build do Frontend (React)
REM ========================================
echo ========================================
echo PASSO 2: Build do frontend React
echo ========================================
echo.

cd ..\frontend

REM Verificar se Node.js está disponível
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Node.js não encontrado!
    echo Por favor, instale Node.js 16 ou superior e tente novamente.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
node --version
npm --version
echo.

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo 📦 Instalando dependências do frontend...
    call npm install
    if errorlevel 1 (
        echo ❌ ERRO: Falha ao instalar dependências!
        pause
        exit /b 1
    )
)

echo.
echo 🔨 Executando build do React...
call npm run build

if errorlevel 1 (
    echo.
    echo ❌ ERRO: Falha ao fazer build do React!
    pause
    exit /b 1
)

echo.
echo ✅ Build do React concluído!
echo.

REM ========================================
REM PASSO 3: Build do Electron (Instalador)
REM ========================================
echo ========================================
echo PASSO 3: Gerando instalador Windows
echo ========================================
echo.

REM Verificar se electron-builder está instalado
call npm list electron-builder >nul 2>&1
if errorlevel 1 (
    echo 📦 Instalando electron-builder...
    call npm install --save-dev electron-builder
)

echo.
echo 🔨 Gerando instalador Windows...
echo    Isso pode levar alguns minutos...
echo.

call npm run dist-win

if errorlevel 1 (
    echo.
    echo ❌ ERRO: Falha ao gerar instalador!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ INSTALADOR GERADO COM SUCESSO!
echo ========================================
echo.
echo 📦 O instalador está em: frontend\dist\
echo.
echo 📝 Próximos passos:
echo    1. Encontre o arquivo .exe em frontend\dist\
echo    2. Este instalador inclui tudo necessário
echo    3. O usuário não precisa instalar Python ou Node.js
echo.
echo 🎉 Pronto para distribuição!
echo.
pause

