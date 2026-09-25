from PIL import Image
from pathlib import Path

SRC=Path('assets/player')
OUT=SRC/'runtime'
OUT.mkdir(parents=True,exist_ok=True)

for name in ['idle','crouch','jump-up','jump-down','walk']:
    src=SRC/f'{name}.webp'
    im=Image.open(src).convert('RGBA')
    if im.size!=(1024,1536):
        raise SystemExit(f'{name}: unexpected source size {im.size}')
    im=im.resize((384,576),Image.Resampling.LANCZOS)
    out=OUT/f'{name}.webp'
    im.save(out,'WEBP',quality=90,method=6,exact=True)
    print(name,im.size,out.stat().st_size)
