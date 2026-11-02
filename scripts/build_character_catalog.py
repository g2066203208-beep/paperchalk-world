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
    # The registry includes character profiles with no approved image too.
    # Expose them to the unified authoring studio as named empty projects;
    # never hallucinate art or treat a concept-only profile as an NPC in game.
    profile_root=ROOT/'docs'/'characters'
    for doc in sorted(profile_root.glob('CHAR-*.profile.json')):
        try:
            data=json.loads(doc.read_text(encoding='utf-8'))
            identity=data.get('fields',{}).get('identity',{})
            ident=(identity.get('canonicalId') or {}).get('value') or data.get('canonicalId')
            title=(identity.get('displayName') or {}).get('value') or ident
            if not isinstance(ident,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}',ident):
                continue
            if ident not in entries:
                entries[ident]={'id':ident,'label':str(title or ident),
                    'front':'','back':'','draft':True,'state':data.get('recordState','concept_only')}
        except (ValueError,TypeError,KeyError,OSError) as e:
            print('Skip invalid character profile',doc.name,str(e))
    for row in entries.values():
        if not row.get('front') and not row.get('back'):
            row['draft']=True
    return {'version':2,'characters':list(entries.values())}

if __name__=='__main__':
    value=discover()
    OUTPUT.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Character editor catalog:',len(value['characters']),'characters')
