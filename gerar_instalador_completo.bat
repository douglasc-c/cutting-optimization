@echo off
REM Script completo para gerar instalador Windows sem Python
REM Execute este script na raiz do projeto no Windows

setlocal enabledelayedexpansion

echo ========================================
echo Gerando Instalador Completo Windows
echo ========================================
echo.

REM Verificar se estamos na raiz do projeto
if not exist "backend\main.py" (
    echo ERRO: Execute este script na raiz do projeto!
    echo Deve existir: backend\main.py
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ERRO: Execute este script na raiz do projeto!
    echo Deve existir: frontend\package.json
    pause
    exit /b 1
)

echo [1/5] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado!
    echo Instale Python 3.9+ de https://www.python.org/downloads/
    pause
    exit /b 1
)
echo Python encontrado!

echo.
echo [2/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instale Node.js de https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js encontrado!

echo.
echo [3/5] Gerando executavel standalone do backend...
cd backend
if not exist "build_windows_exe.bat" (
    echo ERRO: Arquivo build_windows_exe.bat nao encontrado!
    cd ..
    pause
    exit /b 1
)

call build_windows_exe.bat
if errorlevel 1 (
    echo ERRO ao gerar executavel do backend!
    cd ..
    pause
    exit /b 1
)

REM Verificar se o executavel foi criado
if not exist "cutting-optimization-backend.exe" (
    echo ERRO: Executavel nao foi criado!
    echo Verifique os erros acima.
    cd ..
    pause
    exit /b 1
)

echo Executavel do backend gerado com sucesso!
cd ..

echo.
echo [4/5] Gerando build do React...
cd frontend

REM Instalar dependencias se necessario
if not exist "node_modules" (
    echo Instalando dependencias do frontend...
    call npm install
    if errorlevel 1 (
        echo ERRO ao instalar dependencias!
        cd ..
        pause
        exit /b 1
    )
)

echo Gerando build do React...
call npm run build
if errorlevel 1 (
    echo ERRO ao gerar build do React!
    cd ..
    pause
    exit /b 1
)

if not exist "build" (
    echo ERRO: Build do React nao foi criado!
    cd ..
    pause
    exit /b 1
)

echo Build do React gerado com sucesso!

echo.
echo [5/5] Gerando instalador Windows...
call npm run dist-win
if errorlevel 1 (
    echo ERRO ao gerar instalador!
    cd ..
    pause
    exit /b 1
)

REM Verificar se o instalador foi criado
if not exist "dist\Cutting Optimization Setup 0.1.0.exe" (
    echo AVISO: Instalador pode ter nome diferente ou estar em outro local.
    echo Verifique a pasta dist\
    cd ..
    pause
    exit /b 0
)

cd ..

echo.
echo ========================================
echo CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Instalador gerado em:
echo frontend\dist\Cutting Optimization Setup 0.1.0.exe
echo.
echo Tamanho aproximado: 220-250 MB
echo.
echo Este instalador funciona SEM Python instalado!
echo.
echo Proximos passos:
echo 1. Teste o instalador em uma maquina Windows limpa
echo 2. Verifique se tudo funciona corretamente
echo 3. Distribua para seus usuarios!
echo.
pause


