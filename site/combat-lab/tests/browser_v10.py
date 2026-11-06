from pathlib import Path
import re
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        html=(base/'index.html').read_text(encoding='utf8')
        html=re.sub(r'<script[^>]*src=[^>]*></script>','',html).replace('<link rel="stylesheet" href="styles.css">','')
        page.set_content(html)
        page.add_style_tag(content=(base/'styles.css').read_text(encoding='utf8'))
        for name in ['engine.js','campaign.js','ui.js']:
            page.add_script_tag(content=(base/name).read_text(encoding='utf8'))
        if width<700: page.locator("#setupToggle").click()
        page.locator('#teamCheckbox').check()
        page.locator('#encounterSelect').select_option('surround')
        page.evaluate('window.__TIMEGRID_DEBUG__.newGame({seed:3351})')
        if width<700: page.locator('#setupToggle').click()
        assert page.locator('.dual-row').count()==8,('row',page.locator('.dual-row').count())
        assert page.locator('.dual-header').count()==1
        assert page.locator('.dual-big').count()==80
        assert page.locator('.threat-chip').count()>0,'need actual threat warnings'
        assert page.locator('.dual-cue').count()==8
        assert page.locator('.dual-small.active').count()>0
        assert not errors,errors
        path=base/f'v10_{width}.png';page.screenshot(path=str(path),full_page=False)
        print('render',width,'threats',page.locator('.threat-chip').count(),'saved',path.name)
        # One-tap guard if a defensive card is in hand: if not, at least click navigates.
        t=page.locator('.threat-chip').first
        t.click()
        assert not errors, errors
    browser.close()