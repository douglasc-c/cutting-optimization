@echo off
REM Script de instalação para Windows
REM Autor: Douglas Cesário
REM Versão: 1.0.0

setlocal enabledelayedexpansion

echo ================================
echo   Cutting Optimization Installer
echo ================================
echo.

REM Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERROR] Execute este script na raiz do projeto
    pause
    exit /b 1
)

echo [INFO] Verificando dependências do sistema...

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js não encontrado. Instale Node.js 16+ primeiro.
    echo [INFO] Visite: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] ✅ Node.js !NODE_VERSION! encontrado

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 não encontrado. Instale Python 3.9+ primeiro.
    echo [INFO] Visite: https://python.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [INFO] ✅ !PYTHON_VERSION! encontrado

REM Verificar pip
pip --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pip não encontrado. Instale pip primeiro.
    pause
    exit /b 1
)

echo [INFO] ✅ pip encontrado

REM Instalar dependências do backend
echo [INFO] Instalando dependências do backend...
cd backend
pip install -r requirements.txt
pip install -e .
cd ..

REM Instalar dependências do frontend
echo [INFO] Instalando dependências do frontend...
cd frontend
npm install
cd ..

REM Build do frontend
echo [INFO] Construindo frontend...
cd frontend
npm run build
cd ..

REM Criar diretório de instalação
set INSTALL_DIR=%USERPROFILE%\.cutting-optimization
echo [INFO] Criando diretório de instalação: !INSTALL_DIR!

if not exist "!INSTALL_DIR!" mkdir "!INSTALL_DIR!"
xcopy /E /I /Y backend "!INSTALL_DIR!\backend"
xcopy /E /I /Y frontend\build "!INSTALL_DIR!\frontend"
xcopy /E /I /Y config "!INSTALL_DIR!\config"
xcopy /E /I /Y docs "!INSTALL_DIR!\docs"

REM Criar script de execução
echo @echo off > "!INSTALL_DIR!\run.bat"
echo cd /d "%%~dp0" >> "!INSTALL_DIR!\run.bat"
echo cd backend >> "!INSTALL_DIR!\run.bat"
echo python main.py --interactive >> "!INSTALL_DIR!\run.bat"
echo pause >> "!INSTALL_DIR!\run.bat"

REM Criar atalho no desktop
set DESKTOP=%USERPROFILE%\Desktop
if exist "!DESKTOP!" (
    echo [INFO] ✅ Atalho criado no desktop
    echo [InternetShortcut] > "!DESKTOP!\Cutting Optimization.url"
    echo URL=file:///!INSTALL_DIR!\run.bat >> "!DESKTOP!\Cutting Optimization.url"
    echo IconFile=!INSTALL_DIR!\run.bat >> "!DESKTOP!\Cutting Optimization.url"
    echo IconIndex=0 >> "!DESKTOP!\Cutting Optimization.url"
)

echo.
echo [INFO] ✅ Instalação concluída com sucesso!
echo [INFO] 📁 Instalado em: !INSTALL_DIR!
echo [INFO] 🚀 Execute com: "!INSTALL_DIR!\run.bat"
echo [INFO] 📖 Documentação em: !INSTALL_DIR!\docs\
echo.
pause
