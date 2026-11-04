"""Regression: ONE protagonist uses the approved standing art and real battle arm/axe PNGs.
Build with: python scripts/build_protagonist_part_rig.py
"""
import json
import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'site/assets/l2d/library'
BASE=ASSETS/'protagonist-rig-v1'
UNIFIED=ASSETS/'protagonist-unified-v1'
BATTLE=ASSETS/'protagonist-battle-front'
ZIP=ROOT/'site/assets/l2d/v4/protagonist-original-parts.zip'

class HeroineUnifiedTest(unittest.TestCase):
    def test_exact_standing_master_and_true_battle_overlays(self):
        raw=json.loads((BASE/'front.rig.json').read_text())
        merged=json.loads((UNIFIED/'front.rig.json').read_text())
        specs=json.loads((UNIFIED/'module.json').read_text())
        self.assertEqual(len(raw['parts']),17)
        self.assertEqual(len(merged['parts']),20)
        self.assertEqual(merged['characterFamilyId'],'protagonist')
        self.assertEqual(specs['familyId'],'protagonist')
        self.assertEqual(specs['variantCategory'],'internal')
        self.assertEqual(set(merged['parts'])-set(raw['parts']),{
            'battle_handwear_r','battle_handwear_l','battle_axe'})
        self.assertEqual(set(merged['layerOrder']),set(merged['parts']))
        self.assertEqual(len(merged['layerOrder']),20)
        self.assertLess(merged['layerOrder'].index('rear_hair'),merged['layerOrder'].index('jacket'))
        self.assertLess(merged['layerOrder'].index('jacket'),merged['layerOrder'].index('battle_axe'))
        self.assertLess(merged['layerOrder'].index('battle_handwear_l'),merged['layerOrder'].index('jacket'),
                        'character left arm/sleeve must stay BEHIND the body')
        self.assertLess(merged['layerOrder'].index('battle_handwear_r'),merged['layerOrder'].index('jacket'))
        self.assertLess(merged['layerOrder'].index('jacket'),merged['layerOrder'].index('battle_axe'))
        self.assertEqual(set(merged['gripOverlays']),{'battle_handwear_r','battle_handwear_l'})
        self.assertTrue(all(len(outline)>=12 for outline in merged['gripOverlays'].values()))
        self.assertNotIn('battle_axe',merged['gripOverlays'],
                         'only the real original hands may be repainted over the weapon')
        self.assertLess(merged['layerOrder'].index('face'),merged['layerOrder'].index('eye_white'))
        self.assertLess(merged['layerOrder'].index('eye_white'),merged['layerOrder'].index('irises'))
        self.assertLess(merged['layerOrder'].index('irises'),merged['layerOrder'].index('lashes'))
        self.assertEqual(merged['parts']['battle_axe']['parentId'],'battle_handwear_l')
        self.assertEqual((UNIFIED/'front.png').read_bytes(),(BASE/'front.png').read_bytes(),
                         'Default portrait must stay the original standing composite')
        base_module=json.loads((BASE/'module.json').read_text())
        for ident,original in raw['parts'].items():
            self.assertEqual(merged['parts'][ident],original,
                             f'{ident} standing geometry must be byte-for-byte-equivalent JSON')
            old=BASE/base_module['views']['front']['rig']['textures'][ident]
            new=UNIFIED/specs['views']['front']['rig']['textures'][ident]
            self.assertEqual(old.read_bytes(),new.read_bytes(),
                             f'{ident} standing ORIGINAL PNG may not be repainted')
        remap={'handwear_r':'battle_handwear_r','handwear_l':'battle_handwear_l',
               'axe_held':'battle_axe'}
        with ZipFile(ZIP) as z:
            source=json.loads(z.read('layers.json'))
            self.assertEqual(len(source['layers']['front']),17)
            for entry in source['layers']['front']:
                img=UNIFIED/specs['views']['front']['rig']['textures'][entry['id']]
                self.assertEqual(img.read_bytes(),z.read(entry['file']))
        battle_model=json.loads((BATTLE/'front.rig.json').read_text())
        for original,alias in remap.items():
            self.assertEqual((BATTLE/'front'/f'{original}.png').read_bytes(),
                             (UNIFIED/specs['views']['front']['rig']['textures'][alias]).read_bytes())
            for geometry in ('x','y','w','h'):
                self.assertEqual(merged['parts'][alias][geometry],
                                 battle_model['parts'][original][geometry])
        poses=merged['actionProfiles']['actions']
        self.assertEqual(merged['actionProfiles']['default'],'idle')
        self.assertEqual(poses['idle']['parts']['sleeves_and_hands']['opacity'],1)
        self.assertEqual(poses['idle']['parts']['battle_axe']['opacity'],0)
        self.assertEqual(poses['combat']['parts']['sleeves_and_hands']['opacity'],0)
        self.assertEqual(poses['combat']['parts']['battle_axe']['opacity'],1)
        self.assertNotIn('jacket',poses['combat']['parts'])
        self.assertNotIn('face',poses['combat']['parts'])
        self.assertNotIn('skirt',poses['combat']['parts'])
        self.assertNotIn('legs',poses['combat']['parts'])
        self.assertNotIn('shoes',poses['combat']['parts'])

if __name__=='__main__':
    unittest.main()
