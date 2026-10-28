import csv

import numpy as np
from PIL import Image
import pytest
import torch

from pixel_ml.data import build_dataset,load_manifest,WIDTH,HEIGHT
from pixel_ml.model import PixelVAE,loss_fn
from pixel_ml.palette import PALETTE,quantize
from pixel_ml.sample import card_frame
from pixel_ml.quality import inspect_image


def test_bootstrap_manifest_and_splits(tmp_path):
    manifest=build_dataset(tmp_path/"d",count=24,seed=12)
    data=load_manifest(manifest)
    assert len(data)==24
    assert {r["split"] for r in data}=={"train","val"}
    assert all(r["image"].shape==(HEIGHT,WIDTH,3) for r in data)


def test_reject_bad_source_license(tmp_path):
    manifest=build_dataset(tmp_path/"d",count=12,seed=9)
    with manifest.open(newline="",encoding="utf-8") as f:
        rows=list(csv.DictReader(f));columns=rows[0].keys()
    rows[0]["license"]="unknown"
    with manifest.open("w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=columns);writer.writeheader();writer.writerows(rows)
    with pytest.raises(ValueError,match="license"):
        load_manifest(manifest)


def test_trainable_forward_backprop():
    torch.manual_seed(5)
    net=PixelVAE();x=torch.rand(2,3,HEIGHT,WIDTH)
    recon,mu,logvar=net(x)
    assert recon.shape==x.shape
    loss,mse,kl=loss_fn(recon,x,mu,logvar)
    assert torch.isfinite(loss)
    loss.backward()
    assert net.fc.weight.grad is not None
    assert net.encoder[0].weight.grad is not None


def test_palette_projection_and_card_size(tmp_path):
    image=np.random.default_rng(2).integers(0,256,(HEIGHT,WIDTH,3),dtype=np.uint8)
    rgb=quantize(image)
    assert len(np.unique(rgb.reshape(-1,3),axis=0)) <= len(PALETTE)
    sprite=Image.fromarray(rgb)
    card=card_frame(sprite)
    assert card.size==(71,95)
    path=tmp_path/"test.png";sprite.save(path)
    assert inspect_image(path)["passes"]
