# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['/Users/douglascesario/frontend/cutting-optimization/backend/main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('src', 'src'),
        ('examples', 'examples'),
    ],
    hiddenimports=[
        'src.api',
        'src.core',
        'src.core.cutting_optimizer',
        'src.core.cutting_optimizer_simple',
        'src.core.cutting_optimizer_fast',
        'src.core.cutting_optimizer_improved',
        'src.core.cutting_optimizer_smart',
        'src.core.cutting_optimizer_enhanced',
        'src.utils',
        'src.visualization',
        'numpy',
        'scipy',
        'pulp',
        'ortools',
        'matplotlib',
        'pandas',
        'json',
        'argparse',
        'pathlib',
        'typing',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='cutting-optimization-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
