"""Generate learned sprites, native 71×95 card mockups, and a contact sheet."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image,ImageDraw
import torch

from .model import PixelVAE
from .palette import PALETTE,quantize
from .data import load_manifest,WIDTH,HEIGHT


def card_frame(icon:Image.Image) -> Image.Image:
    """Programmatic *layout*, not a learned picture: 71×95 card test only."""
    p=[tuple(x) for x in PALETTE]
    card=Image.new("RGB",(71,95),p[0]);d=ImageDraw.Draw(card)
    d.rectangle((1,1,69,93),fill=p[1],outline=p[4],width=1)
    d.rectangle((3,3,67,91),fill=p[2]);d.rectangle((7,7,63,80),fill=p[0])
    card.paste(icon.resize((48,72),Image.Resampling.NEAREST),(11,8))
    d.rectangle((7,82,63,89),fill=p[1]);d.line((12,85,59,85),fill=p[4])
    return card


def run(checkpoint:Path,out:Path,count:int=12,seed:int=73,
        manifest:Path|None=None) -> list[Path]:
    if count<1 or count>128:
        raise ValueError("count must be 1..128")
    torch.set_num_threads(2)
    ck=torch.load(checkpoint,map_location="cpu",weights_only=True)
    net=PixelVAE(int(ck["latent_size"]))
    net.load_state_dict(ck["model"]);net.eval()
    torch.manual_seed(seed)
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    if manifest is not None:
        data=load_manifest(manifest)
        val=[r for r in data if r["split"]=="val"]
        val_tensor=torch.from_numpy(np.stack([x["image"] for x in val]).astype(np.float32)/255).permute(0,3,1,2)
        with torch.no_grad():
            mus,_=net.encode(val_tensor)
        # Latent-space interpolation of examples (learned recombination), plus
        # a small perturbation. These are not pure independent samples.
        pairs=torch.randint(0,len(mus),(count,2))
        weights=torch.rand(count,1)
        z=mus[pairs[:,0]]*weights+mus[pairs[:,1]]*(1-weights)+0.12*torch.randn(count,net.latent_size)
        mode="latent interpolation of permitted validation samples"
    else:
        z=torch.randn(count,net.latent_size)
        mode="prior samples"
    with torch.no_grad():
        arr=(net.decode(z).permute(0,2,3,1).numpy()*255).clip(0,255).astype(np.uint8)
    paths=[];cards=[]
    for i,img in enumerate(arr):
        rgb=quantize(img)
        sprite=Image.fromarray(rgb,"RGB");path=out/f"sprite_{i:02d}.png";sprite.save(path)
        paths.append(path)
        card=card_frame(sprite);card.save(out/f"card_{i:02d}.png");cards.append(card)
    columns=min(4,len(cards));rows=(len(cards)+columns-1)//columns
    sheet=Image.new("RGB",(columns*79+8,rows*103+8),tuple(PALETTE[0]))
    for i,card in enumerate(cards):sheet.paste(card,(8+(i%columns)*79,8+(i//columns)*103))
    sheet.resize((sheet.width*3,sheet.height*3),Image.Resampling.NEAREST).save(out/"contact_sheet_3x.png")
    (out/"generation.json").write_text(json.dumps({"mode":mode,"seed":seed,"sprite_size":[WIDTH,HEIGHT],
    "card_size":[71,95],"count":count,"note":"Experimental learning test; visual quality unverified by humans."},indent=2),encoding="utf-8")
    return paths


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--checkpoint",type=Path,required=True)
    p.add_argument("--out",type=Path,default=Path(".pixel-runs/samples"))
    p.add_argument("--count",type=int,default=12)
    p.add_argument("--seed",type=int,default=73)
    p.add_argument("--manifest",type=Path)
    args=p.parse_args()
    print(f"Generated {len(run(args.checkpoint,args.out,args.count,args.seed,args.manifest))} sprites")

if __name__=="__main__":main()
