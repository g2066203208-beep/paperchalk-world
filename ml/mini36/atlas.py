"""36 independent 24x24 palette-indexed sprites, losslessly decoded.

The source images were algorithmically reconstructed from an AI concept sheet;
these are *not* artist-authored gold training labels.
"""
import argparse,base64,hashlib,json,lzma
from pathlib import Path
import numpy as np
from PIL import Image
COUNT=36;SIDE=24;CELL=40;COLORS=15
MAGIC=b'MINI36V1'
DEFAULT=Path('site/pixel-lab/mini36/mini36-v1.lossless.lzma.b64')
EXPECTED_SHA='cd406a55ba1119cc31b7464fafd390a7622972318a0622825fcdddca911575d8'
BG=(251,235,214)
NAMES=['抽烟侦探','沉默浪人','观星老人','银发朋克少女','街头快递员','腼腆花店少女',
'拳击手','惊慌飞行员','快乐厨师','冷静指挥官','小个子女巫','暴躁铁匠',
'深海探索者','摇滚歌手','白发医师','蒸汽机械师','哥特女王','温和农夫',
'焦虑图书管理员','沙漠赏金猎人','马戏杂技演员','深夜黑客','老航海家','倦怠贵族女性',
'仿生机器人','街头速写画家','动物驯养员','蒙面急救员','疲惫公交司机','灯塔守望者',
'山地巡护员','受伤侦察员','流动摊贩','机器人修理师','流浪小提琴家','消防员']

def unpack(path=DEFAULT):
    data=lzma.decompress(base64.b64decode(Path(path).read_text('ascii').strip(),validate=True))
    if hashlib.sha256(data).hexdigest()!=EXPECTED_SHA:
        raise ValueError('Pixel data failed SHA256 check')
    unit=45+SIDE*SIDE//2
    if len(data)!=len(MAGIC)+COUNT*unit or data[:len(MAGIC)]!=MAGIC:
        raise ValueError('Invalid packed sprite format')
    sprites=[];palettes=[];tokens=[];offset=len(MAGIC)
    for i in range(COUNT):
        colors=np.frombuffer(data[offset:offset+45],np.uint8).reshape(15,3).copy();offset+=45
        packed=np.frombuffer(data[offset:offset+288],np.uint8);offset+=288
        ids=np.empty(576,np.uint8);ids[::2]=packed>>4;ids[1::2]=packed&15
        if np.any(ids>14):raise ValueError('Palette index >14')
        ids=ids.reshape(24,24)
        rgba=np.zeros((24,24,4),np.uint8);rgba[:,:,:3]=colors[ids];rgba[:,:,3]=(ids>0)*255
        sprites.append(rgba);palettes.append(colors);tokens.append(ids)
    return np.stack(sprites),np.stack(palettes),np.stack(tokens)

def export(path=DEFAULT,out='artifacts/mini36'):
    sprites,palettes,tokens=unpack(path)
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    sheet=np.zeros((240,240,4),np.uint8);sheet[:,:,:3]=BG;sheet[:,:,3]=255
    stats=[]
    for i,a in enumerate(sprites):
        r,c=divmod(i,6);name=f'R{r+1}C{c+1}'
        Image.fromarray(a,'RGBA').save(out/(name+'.png'),optimize=True)
        patch=sheet[r*CELL+8:r*CELL+32,c*CELL+8:c*CELL+32]
        opaque=a[:,:,3]==255
        patch[opaque,:3]=a[opaque,:3]
        assert np.all(np.isin(a[:,:,3],[0,255]))
        assert len(np.unique(tokens[i][tokens[i]>0]))<=14
        stats.append({'id':name,'name':NAMES[i],'size':[24,24],
          'colors':int(np.unique(tokens[i][tokens[i]>0]).size),
          'opaque_pixels':int(opaque.sum()),'transparent_pixels':int((~opaque).sum()),
          'approved_artist_gold':False})
    native=Image.fromarray(sheet,'RGBA');native.save(out/'mini36-atlas-240.png',optimize=True)
    zoom=native.resize((960,960),Image.Resampling.NEAREST)
    zoom.save(out/'mini36-atlas-960-nearest.png',optimize=True)
    assert np.array_equal(np.asarray(zoom),np.repeat(np.repeat(sheet,4,axis=0),4,axis=1))
    report={'status':'experimental indexed pixel reconstruction, NOT approved artist gold',
      'characters':36,'grid':[6,6],'sprite_grid':[24,24],'gallery_cell':[40,40],
      'logical_atlas':[240,240],'display_size':[960,960],'one_cell_one_color':True,
      'nearest_neighbor_verified':True,'pixel_data_sha256':EXPECTED_SHA,
      'concept_source_sha256':'c13119d4d2eb175b7d1efd3df950b5aeaa2a4636b3e13a779a350085491d97bf',
      'source_kind':'AI-generated concept; discrete sprites extracted algorithmically, not human-authored art',
      'method':'segmented each of 36 cells, rebuilt RGBA palette-index pixels and packed 4bit color indices',
      'sprites':stats}
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default=str(DEFAULT));p.add_argument('--out',default='artifacts/mini36')
    a=p.parse_args();print(json.dumps({k:v for k,v in export(a.data,a.out).items() if k!='sprites'},ensure_ascii=False))
