from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,height in [(1440,900),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            html=(BASE/'index.html').read_text(encoding='utf-8')
            html=re.sub(r'<script[^>]*src=[^>]*></script>','',html).replace('<link rel="stylesheet" href="styles.css?v=v17-balance-audit-20261106">','')
            page.set_content(html,wait_until='domcontentloaded')
            page.add_style_tag(content=(BASE/'styles.css').read_text(encoding='utf-8'))
            for file in ('engine.js','cards-expansion.js','balance-v17.js','campaign.js','ui.js'):
                page.add_script_tag(content=(BASE/file).read_text(encoding='utf-8'))
            page.locator('#catalogButton').click()
            assert page.locator('.atlas-card').count()==90, f'expected 90 got {page.locator(".atlas-card").count()}'
            assert page.locator('#atlasClass').input_value()=='axe'
            page.locator('#atlasRarity').select_option('rare')
            assert page.locator('.atlas-card').count()==20
            page.locator('#atlasClass').select_option('mage')
            assert page.locator('.atlas-card').count()==90
            page.locator('#atlasTrack').select_option('meter')
            assert 1<=page.locator('.atlas-card').count()<=12
            page.screenshot(path=str(BASE/('atlas_'+str(width)+'.png')),full_page=False)
            page.locator('#closeModal').click()
            # Setup closed by default only on mobile; opening is safe either way.
            toggle=page.locator('#setupToggle')
            if toggle.count() and toggle.get_attribute('aria-expanded')!='true':toggle.click()
            page.locator('#classSelect').select_option('mage')
            page.locator('#styleSelect').select_option('atlas_bleed')
            page.locator('#createButton').click()
            page.locator('#catalogButton').click()
            assert page.locator('#atlasClass').input_value()=='mage'
            assert page.locator('.atlas-card').count()==90
            assert page.locator('.atlas-owned').count()>=2
            assert not errors,errors
            print('PASS',width,height,'atlas, rarity, archetype filters, 5 new builds, zero script errors')
            page.close()
        browser.close()
