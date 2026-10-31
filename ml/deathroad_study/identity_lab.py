"""Death Road to Canada CHARACTER-BY-CHARACTER study. Research-only, no sprite redistribution.

This is a small actual categorical pixel model, NOT a diffusion model. Do not
confuse 30 promotional figures with the game's many combinatorial characters.
Trains an independent palette + contextual color distribution for every slot.
The original reference, its crops and reconstructed sprites NEVER enter output.
"""
from __future__ import annotations
import argparse, hashlib, io, json, math, pathlib, random, urllib.request
from collections import Counter, defaultdict
import numpy as np
from PIL import Image, ImageDraw

REFERENCE="https://steam.pics/fons/db0537a54863457a0e983e91c004fd07.png"
COUNT=30
def load_reference(url: str=REFERENCE) -> Image.Image:
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 PixelCharacterResearch/1.0"})
    with urllib.request.urlopen(req,timeout=25) as f:
        raw=f.read(4_000_001)
    if len(raw)>4_000_000: raise ValueError("reference too large")
    image=Image.open(io.BytesIO(raw)).convert("RGBA")
    if image.width<180 or image.height<180: raise ValueError("reference too small")
    return image

def slots(image: Image.Image, cols=6, rows=5):
    """Crop only in RAM; never write the source or the proprietary tiles."""
    for r in range(rows):
        for c in range(cols):
            x0=round(c*image.width/cols); x1=round((c+1)*image.width/cols)
            y0=round(r*image.height/rows); y1=round((r+1)*image.height/rows)
            yield r*cols+c+1,image.crop((x0,y0,x1,y1))

def canonical_pixels(cell: Image.Image, size=24) -> np.ndarray:
    data=np.array(cell.convert("RGBA"),dtype=np.uint8)
    rgb=data[:,:,:3]
    # The publicly displayed reference has a solid black backdrop.
    bg=np.median(np.concatenate([rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]]),axis=0)
    dist=np.max(abs(rgb.astype(np.int16)-bg.astype(np.int16)),axis=2)
    fg=(data[:,:,3]>=128)&(dist>26)&(rgb.max(axis=2)>28)
    ys,xs=np.where(fg)
    if len(xs)<16: raise ValueError("sprite slot has too little visible structure")
    x0=max(0,int(xs.min())-2);x1=min(cell.width,int(xs.max())+3)
    y0=max(0,int(ys.min())-2);y1=min(cell.height,int(ys.max())+3)
    crop=rgb[y0:y1,x0:x1]
    visible=fg[y0:y1,x0:x1]
    pw,ph=crop.shape[1],crop.shape[0]
    factor=min((size-2)/pw,(size-2)/ph)
    tw=max(1,round(pw*factor));th=max(1,round(ph*factor))
    rgba=np.zeros((ph,pw,4),np.uint8);rgba[:,:,:3]=crop;rgba[:,:,3]=visible*255
    scaled=np.array(Image.fromarray(rgba,"RGBA").resize((tw,th),Image.Resampling.NEAREST))
    out=np.zeros((size,size,4),np.uint8)
    ox=(size-tw)//2;oy=(size-th)//2
    out[oy:oy+th,ox:ox+tw]=scaled
    return out

def palette_kmeans(pixels: np.ndarray, k=7, iterations=12):
    fg=pixels[pixels[:,:,3]==255,:3].astype(np.float64)
    if len(fg)==0:raise ValueError("empty foreground")
    # K-means is real learned quantization, not a hand-labelled palette.
    unique=np.unique(fg,axis=0)
    q=min(k,len(unique))
    ordered=np.array(sorted(unique.tolist(),key=lambda a:(a[0]*3+a[1]*5+a[2]*2,tuple(a))))
    centroids=ordered[np.linspace(0,len(ordered)-1,q,dtype=int)].astype(float)
    for _ in range(iterations):
        idx=((fg[:,None,:]-centroids[None,:,:])**2).sum(axis=2).argmin(axis=1)
        updates=np.array([fg[idx==j].mean(axis=0) if np.any(idx==j) else centroids[j] for j in range(q)])
        if np.array_equal(updates,centroids):break
        centroids=updates
    d=((pixels[:,:,:3].astype(float)[:,:,None,:]-centroids[None,None,:,:])**2).sum(axis=3)
    indices=np.where(pixels[:,:,3]>0,d.argmin(axis=2)+1,0).astype(np.uint8)
    return centroids,indices

def contextual_model(index: np.ndarray, classes: int):
    """Train one Laplace-smoothed discrete graphical pixel model per identity.

    Local context = (left pixel, pixel above, vertical quarter), rather than
    trivial one-to-one copy of the original image. Fit a sample counts table
    and compute non-oracle masked reconstruction error. One still is NOT
    evidence of pose generalization or identity consistency across animation.
    """
    h,w=index.shape
    total=np.ones(classes+1,dtype=float)
    counts=defaultdict(lambda:np.ones(classes+1,dtype=float))
    observations=[]
    for y in range(h):
        for x in range(w):
            token=int(index[y,x])
            left=int(index[y,x-1]) if x else 0
            up=int(index[y-1,x]) if y else 0
            context=(left,up,int(y*4/h))
            total[token]+=1;counts[context][token]+=1
            observations.append((context,token))
    rng=np.random.default_rng(21031)
    subset=rng.choice(len(observations),size=min(160,len(observations)),replace=False)
    # In-sample contextual NLL; explicitly NOT called a held-out generalization score.
    loss=0
    for n in subset:
        ctx,label=observations[int(n)]
        p=counts[ctx]/counts[ctx].sum()
        loss-=math.log(max(1e-10,p[label]))
    return {"prior":np.round(total/total.sum(),4).tolist(),
            "contexts":len(counts),"train_context_nll":round(loss/len(subset),5)}

def study(image: Image.Image, source: str):
    entries=[]
    for ident,cell in slots(image):
        native=canonical_pixels(cell)
        centers,tokens=palette_kmeans(native)
        stats=contextual_model(tokens,len(centers))
        yy,xx=np.where(tokens!=0)
        count=len(xx)
        entries.append({
          "identity_id":f"DR2C-VISUAL-{ident:03d}",
          "grid":[(ident-1)//6,(ident-1)%6],
          "source_slot":ident,
          "model":"per-character categorical-neighborhood + k-means",
          "native_grid":[24,24],
          "foreground_pixels":count,
          "bbox":([int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1] if count else None),
          "palette_cluster_count":len(centers),
          "palette_rgb_learned":np.rint(centers).astype(int).tolist(),
          "model_statistics":stats,
          "game_asset_approved":False
        })
    return {"experiment":"DR2C-30-visual-study-v1","status":"reference-analysis-not-production-assets",
      "license_note":"Third-party commercial-game art: source and crops intentionally not included in outputs.",
      "source_url":source,"source_sha256":"redacted-not-artifact",
      "records":entries,"records_count":len(entries),
      "limitations":["One still pose per visual slot; cannot learn missing animations.",
                     "Independent 24px statistical pixel models, not diffusion or GAN.",
                     "Does not represent all randomized/custom/updated game characters.",
                     "No source sprite images or verbatim copies redistributed."]}

def original_demo():
    """Deterministic original placeholder geometry, NOT Death Road characters."""
    sheet=Image.new("RGBA",(6*96,5*96),(0,0,0,255))
    dr=ImageDraw.Draw(sheet)
    for i in range(30):
        cx=(i%6)*96+48;cy=(i//6)*96+48
        c=((45+i*31)%160+50,(65+i*53)%140+65,(75+i*23)%130+70)
        dr.ellipse((cx-10-i%5,cy-30,cx+9+i%5,cy-9),fill=c)
        dr.rectangle((cx-8,cy-7,cx+8,cy+16),fill=tuple(max(20,x-35) for x in c))
        dr.rectangle((cx-6,cy+17,cx-1,cy+28),fill=c)
        dr.rectangle((cx+2,cy+17,cx+7,cy+28),fill=c)
        dr.rectangle((cx-6,cy-24,cx-4,cy-22),fill=(10,14,25))
        dr.rectangle((cx+4,cy-24,cx+6,cy-22),fill=(10,14,25))
        if i%3==0:dr.polygon([(cx-16,cy-31),(cx,cy-40),(cx+16,cy-31)],fill=c)
        if i%4==1:dr.rectangle((cx-20,cy-13,cx-17,cy+3),fill=c)
    return sheet

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--mode",choices=["reference","demo"],required=True)
    ap.add_argument("--output",default="artifacts/dr2c-research")
    ap.add_argument("--source",default=REFERENCE)
    ns=ap.parse_args()
    src=load_reference(ns.source) if ns.mode=="reference" else original_demo()
    data=study(src,ns.source if ns.mode=="reference" else "Original code-generated demonstration")
    data["input_kind"]=ns.mode
    out=pathlib.Path(ns.output);out.mkdir(parents=True,exist_ok=True)
    (out/"model-study.json").write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"status":data["status"],"mode":ns.mode,"identities":data["records_count"],
          "models_fitted":len(data["records"]),"source_images_saved":0},ensure_ascii=False))
    if ns.mode=="demo":
        # Render ONLY original placeholders, clearly labelled as synthetic.
        src.convert("RGB").save(out/"ORIGINAL_PLACEHOLDERS-not-DR2C.png")

if __name__=="__main__":main()
