"""V0.9 visual structure + interaction regression. Uses installed Chromium + Playwright.
Run: python tests/browser_ux_v09.py"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in ((1440,900),(390,844)):
        page=browser.new_page(viewport={'width':width,'height':height})
        failures=[]
        page.on('pageerror',lambda err:failures.append(str(err)))
        html=(BASE/'index.html').read_text(encoding='utf-8')
        html=re.sub(r'<script[^>]*src=[^>]*></script>','',html).replace('<link rel="stylesheet" href="styles.css">','')
        page.set_content(html)
        page.add_style_tag(content=(BASE/'styles.css').read_text(encoding='utf-8'))
        for file in ('engine.js','campaign.js','ui.js'):
            page.add_script_tag(content=(BASE/file).read_text(encoding='utf-8'))
        page.locator('#teamCheckbox').check()
        page.locator('#encounterSelect').select_option('surround')
        page.evaluate('window.__TIMEGRID_DEBUG__.newGame({seed:123456})')
        assert page.locator('.dual-row').count()==8
        assert page.locator('.dual-big').count()==80 and page.locator('.dual-small').count()==80
        assert page.locator('.dual-hour').count()==10
        assert page.locator('.dual-header').count()==1
        assert page.locator('.dual-row .dual-person .dual-hp').count()==8
        assert page.locator('.action-ribbon').count()>=8
        assert page.locator('.action-ribbon .ribbon-part.hit').count()>0
        assert page.locator('.dual-big').first.bounding_box()['height']>page.locator('.dual-small').first.bounding_box()['height']
        assert page.evaluate('document.documentElement.scrollWidth')<=width
        # Cards are still editable beneath pointer-events:none presentation ribbons.
        picked=page.evaluate('''() => {const g=window.__TIMEGRID_DEBUG__.getGame();
            return g.actors[0].hand.map(h=>({uid:h.uid,c:window.Timegrid.CARD[h.key]})).find(x=>x.c.type==='attack')||null;}''')
        if picked:
            page.locator('#hand [data-uid="'+picked['uid']+'"]').click()
            page.locator('.enemyrow .dual-big[data-time="1"]').first.click(force=True)
            action=page.evaluate('''() => window.__TIMEGRID_DEBUG__.getGame().actors[0].actions.find(a=>a.source==='hand')''')
            assert action, 'click to place failed'
            assert page.locator('.enemyrow .action-ribbon.target-ribbon').count()>0
            page.locator('.dual-big[data-action-id="'+action['id']+'"]').first.click(force=True)
            page.locator('#removeActionButton').click()
            assert page.evaluate('''() => window.__TIMEGRID_DEBUG__.getGame().actors[0].actions.filter(a=>a.source==='hand').length''')==0
        assert not failures,failures
        print('PASS',width,'8 equal dual rows, 10 ticks, grouped bars, actor HP and card interaction')
        page.close()
    browser.close()
