"""Export application branding from the approved PNG without redrawing it.

Requires Pillow. Run from any directory with: python scripts/generate_branding.py
The source image is retained byte-for-byte in frontend/assets/branding.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'frontend' / 'public'
source = Image.open(ROOT / 'frontend/assets/branding/logo-original.png').convert('RGBA')
# Ignore almost invisible generation artifacts when locating the visible artwork.
bounds = source.getchannel('A').point(lambda value: 255 if value > 10 else 0).getbbox()
logo = source.crop(bounds)
logo.thumbnail((1600, 400), Image.Resampling.LANCZOS)
(PUBLIC / 'branding').mkdir(parents=True, exist_ok=True)
logo.save(PUBLIC / 'branding/logo.png', optimize=True)

# The symbol reaches x=591 at the bottom; the first letter starts at x=583
# above y=430. Exclude that letter, retaining the complete roll and cut sheet.
symbol = source.crop((75, 175, 596, 486))
alpha = symbol.getchannel('A')
for x in range(505, symbol.width):
    for y in range(255):
        alpha.putpixel((x, y), 0)
symbol.putalpha(alpha)
symbol = symbol.crop(symbol.getchannel('A').point(lambda value: 255 if value > 10 else 0).getbbox())
icon = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
symbol.thumbnail((940, 940), Image.Resampling.LANCZOS)
# Enlarge the original symbol proportionally, keeping its transparent background.
scale = min(940 / symbol.width, 940 / symbol.height)
symbol = symbol.resize((round(symbol.width * scale), round(symbol.height * scale)), Image.Resampling.LANCZOS)
icon.alpha_composite(symbol, ((1024-symbol.width)//2, (1024-symbol.height)//2))
icon.save(PUBLIC / 'icon.png', optimize=True)
icon.save(PUBLIC / 'icon.ico', sizes=[(n,n) for n in (16,24,32,48,64,128,256)])
icon.save(PUBLIC / 'icon.icns')
icon.save(PUBLIC / 'favicon.ico', sizes=[(n,n) for n in (16,24,32,48,64)])
for size in (192, 512):
    icon.resize((size,size), Image.Resampling.LANCZOS).save(PUBLIC / f'logo{size}.png', optimize=True)
print('Branding PNG, ICO, ICNS and web icons exported.')
