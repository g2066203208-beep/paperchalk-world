#!/usr/bin/env python3
"""Auto-register all game-imported character sprites for the DEV paint editor.

Nothing is moved, resized or recompressed. Characters may have separate
name-front.webp and name-back.png assets, or a single name.webp.
"""
import json
import pathlib
import re

ROOT=pathlib.Path(__file__).resolve().parents[1]
ART=ROOT/'site'/'assets'/'characters'
OUTPUT=ROOT/'site'/'characters.catalog.json'
KNOWN={'protagonist':'女主角'}

def discover():
    entries={}
    for f in sorted(ART.iterdir()):
        if not f.is_file() or f.suffix.lower() not in ('.png','.webp','.jpg','.jpeg'):
            continue
        stem=f.stem
        match=re.match(r'^(.*?)[-_](front|back)$',stem,re.I)
        if match:
            char_id,face=match.group(1),match.group(2).lower()
        else:
            char_id,face=stem,'front'
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}',char_id):
            print('Skip unsupported filename:',f.name)
            continue
        row=entries.setdefault(char_id,{'id':char_id,'label':KNOWN.get(char_id,char_id),'front':'','back':''})
        # Paths must resolve from the main game page.
        row[face]='./assets/characters/'+f.name
    return {'version':1,'characters':list(entries.values())}

if __name__=='__main__':
    value=discover()
    OUTPUT.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Character editor catalog:',len(value['characters']),'characters')
