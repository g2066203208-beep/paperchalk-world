#!/usr/bin/env python3
"""Auto-register all game-imported character sprites for the DEV paint editor.

Nothing is moved, resized or recompressed. Characters may have separate
name-front.webp and name-back.png assets, or a single name.webp.
"""
import json
import pathlib
import re

from build_l2d_library import build as build_l2d_library

ROOT=pathlib.Path(__file__).resolve().parents[1]
ART=ROOT/'site'/'assets'/'characters'
OUTPUT=ROOT/'site'/'characters.catalog.json'
KNOWN={'protagonist':'女主角','char-002':'女二号'}

def discover():
    entries={}
    for f in sorted(ART.rglob('*')):
        if not f.is_file() or f.suffix.lower() not in ('.png','.webp','.jpg','.jpeg'):
            continue
        stem=f.stem
        if f.parent!=ART:
            # Canonical nested art. Ignore reference sheets.
            if stem.lower() not in ('front','back'):continue
            char_id,face=f.parent.relative_to(ART).as_posix(),stem.lower()
        else:
            match=re.match(r'^(.*?)[-_](front|back)$',stem,re.I)
            if match:
                char_id,face=match.group(1),match.group(2).lower()
            else:
                char_id,face=stem,'front'
        if char_id=='char-016':continue  # Never resurrect removed male-second import.
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}',char_id):
            print('Skip unsupported filename:',f.name)
            continue
        row=entries.setdefault(char_id,{'id':char_id,'label':KNOWN.get(char_id,char_id),'front':'','back':''})
        # Paths must resolve from the main game page.
        row[face]='./assets/characters/'+f.relative_to(ART).as_posix()
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
            if ident=='char-016':continue
            if ident not in entries:
                entries[ident]={'id':ident,'label':str(title or ident),
                    'front':'','back':'','draft':True,'state':data.get('recordState','concept_only')}
        except (ValueError,TypeError,KeyError,OSError) as e:
            print('Skip invalid character profile',doc.name,str(e))
    for row in entries.values():
        if not row.get('front') and not row.get('back'):
            row['draft']=True
        ident=row['id']
        movie_dir=ROOT/'site/assets/l2d'
        clips={}
        manifest=movie_dir/ident/'manifest.json'
        if manifest.exists():
            data=json.loads(manifest.read_text(encoding='utf-8'))
            for face in ('front','back'):
                info=data.get(face)
                if info and (ROOT/'site'/info['file'].removeprefix('./')).exists():
                    clips[face]={'url':info['file'],'crop':info['crop'],
                                 'frames':info['frames'],'fps':info['fps']}
        elif ident=='protagonist':
            for face in ('front','back'):
                if (movie_dir/'v4'/(face+'.webp')).exists():
                    clips[face]={'url':'./assets/l2d/v4/'+face+'.webp',
                      'crop':{'x':351,'y':9,'w':335,'h':1013},'frames':128,'fps':20}
        if clips:
            row['clips']=clips
            row['animated']={face:True for face in clips}
    # Integrate every validated, self-contained L2D bundle into the SAME
    # catalog used by the game and the all-character editor. Existing slots,
    # animation clips and source PNGs remain unmodified.
    modules = build_l2d_library()['modules']
    for module in modules:
        ident = module['id']
        if ident=='char-016':continue
        # Explicit guard against replacing the already-approved female leads.
        if ident in ('protagonist','char-002'):
            raise ValueError(f'L2D module {ident} is protected; use an internal source-rig alias')
        # Original PSD module is an internal implementation of the ONE
        # existing CHAR-002, not another game character.
        if ident == 'char-002-psd-v1':
            continue
        row = entries.setdefault(ident,{
            'id':ident,'label':module['label'],'front':'','back':''
        })
        row['label'] = module['label']
        row['familyId'] = module.get('familyId', ident)
        row['variantCategory'] = module.get('variantCategory', 'default')
        row['actions'] = module.get('actions', [])
        row.pop('draft',None)
        row['l2dModule']=module['views']
        row['assetVersion']=module['version']
        clips=row.setdefault('clips',{})
        animated=row.setdefault('animated',{})
        for face, spec in module['views'].items():
            row[face]=spec['portrait']
            animated[face]=True
            if spec.get('clip'):
                clips[face]=spec['clip']
            else:
                # Never leave an outdated baked V4 when publishing a real
                # independent ArtMesh module of the same actor and view.
                clips.pop(face,None)
        if not clips:row.pop('clips',None)
    # The protagonist retains its approved separate original artwork backup.
    for ident, path, provenance in [
        ('protagonist','./assets/l2d/v4/protagonist-original-parts.zip','original-psd')
    ]:
        row=entries.get(ident)
        if not row:continue
        if (ROOT/'site'/path.removeprefix('./')).is_file():
            row['l2dModule']={
                face:{'renderer':'v4-webp','sourceParts':{'url':path,'provenance':provenance},
                      **({'clip':row.get('clips',{}).get(face)} if row.get('clips',{}).get(face) else {})}
                for face in ('front','back') if row.get(face)
            }
    # FIX: The ORIGINAL heroine must actually sway, without asking players
    # to switch to a different actor. The V4 files and all original PNGs
    # remain untouched/recoverable; only the game's default playback selects
    # the real independent 17/8-part skeleton. Editor still retains V4 tools.
    heroine=entries.get('protagonist')
    articulated=next((m for m in modules if m['id']=='protagonist-rig-v1'),None)
    if heroine and articulated:
        for face,view in articulated['views'].items():
            if face not in heroine['l2dModule'] or view.get('renderer')!='part-mesh':
                continue
            old=heroine['l2dModule'][face]
            old.update({'renderer':'part-mesh',
                        'rig':{**view['rig'],'sourceCharacterId':'protagonist-rig-v1'},
                        'originalV4':old.get('clip')})
        heroine['motionPreference']='independent-bones-no-breath'

    # CHAR-002's user-supplied original Photoshop document is authoritative.
    # Its 24 records contain 17 original visible layers; two disjoint arms are split into 18 playing meshes.
    # Never reuse the old 7-region composites or their baked V4 fallback.
    secondary=entries.get('char-002')
    original_psd=next((m for m in modules if m['id']=='char-002-psd-v1'),None)
    if secondary:
        if not original_psd:
            raise ValueError('Female-two authentic uploaded PSD module was not built')
        view=original_psd['views'].get('front')
        if not view or view.get('renderer')!='part-mesh' or view['rig']['partCount']!=18:
            raise ValueError('Female-two original PSD must provide 18 meshes including two independent arms')
        secondary['front']=view['portrait']
        secondary['l2dModule']={'front':{
            **view,
            'rig':{**view['rig'],'sourceCharacterId':'char-002-psd-v1'}
        }}
        secondary.pop('clips',None)
        secondary['animated']={'front':True}
        secondary['sourcePsdLayerRecords']=24
        secondary['motionPreference']='original-psd-anatomical-idle'
    return {'version':3,'characters':list(entries.values())}

if __name__=='__main__':
    value=discover()
    OUTPUT.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Character editor catalog:',len(value['characters']),'characters')
