from PIL import Image, ImageDraw
from pathlib import Path
import sys

src_dir=Path(sys.argv[1])
out_dir=Path(sys.argv[2])
out_dir.mkdir(parents=True,exist_ok=True)

for name in ['idle','crouch','jump-up','jump-down','walk']:
    im=Image.open(src_dir/f'{name}.jpg').convert('RGBA')
    if im.size!=(1152,1536):
        raise SystemExit(f'{name}: unexpected size {im.size}')

    rgb=im.convert('RGB')
    marker=(255,0,255)
    for pt in [(0,0),(1151,0),(0,1535),(1151,1535)]:
        ImageDraw.floodfill(rgb,pt,marker,thresh=52)

    mark=rgb.load()
    pix=im.load()
    for y in range(1536):
        for x in range(1152):
            r,g,b=mark[x,y]
            if r>245 and g<12 and b>245:
                pix[x,y]=(0,0,0,0)

    im=im.crop((64,0,1088,1536))
    alpha=im.getchannel('A')
    bbox=alpha.getbbox()
    if not bbox:
        raise SystemExit(f'{name}: no visible pixels after background removal')

    dy=(1536-16)-bbox[3]
    shifted=Image.new('RGBA',(1024,1536),(0,0,0,0))
    shifted.alpha_composite(im,(0,dy))
    shifted.save(out_dir/f'{name}.webp','WEBP',lossless=True,method=6,exact=True)
    print(name,(out_dir/f'{name}.webp').stat().st_size)
