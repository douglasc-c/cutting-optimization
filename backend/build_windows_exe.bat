@echo off
REM Script para gerar executável standalone do backend para Windows
REM Execute este script no Windows após instalar PyInstaller

echo ========================================
echo Building Windows Standalone Executable
echo ========================================
echo.

REM Verificar se PyInstaller está instalado
python -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo PyInstaller nao encontrado. Instalando...
    python -m pip install pyinstaller
)

echo.
echo Instalando dependencias do backend...
python -m pip install -r requirements.txt

echo.
echo Gerando executavel standalone...
echo.

REM Criar executável standalone
pyinstaller --onefile ^
    --name=cutting-optimization-backend ^
    --console ^
    --clean ^
    --noconfirm ^
    --add-data "src;src" ^
    --add-data "examples;examples" ^
    --hidden-import src.api ^
    --hidden-import src.core ^
    --hidden-import src.utils ^
    --hidden-import src.visualization ^
    --hidden-import numpy ^
    --hidden-import scipy ^
    --hidden-import pulp ^
    --hidden-import ortools ^
    --hidden-import matplotlib ^
    --hidden-import pandas ^
    --hidden-import json ^
    --hidden-import argparse ^
    --hidden-import pathlib ^
    main.py

if errorlevel 1 (
    echo.
    echo ERRO: Falha ao gerar executavel!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Executavel gerado com sucesso!
echo ========================================
echo.
echo Arquivo gerado: dist\cutting-optimization-backend.exe
echo.
echo Copiando para raiz do backend...
copy dist\cutting-optimization-backend.exe cutting-optimization-backend.exe

echo.
echo ========================================
echo Concluido!
echo ========================================
echo.
echo O arquivo cutting-optimization-backend.exe esta pronto
echo para ser incluido no instalador Electron.
echo.
pause



