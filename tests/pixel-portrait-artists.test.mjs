import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url),'utf8');
const portraits = JSON.parse(read('site/pixel-lab/pixel-portrait-artists.json'));
const secondary = JSON.parse(read('site/pixel-lab/jp-pixel-artists.json'));
const page = read('site/pixel-lab/pixel-portrait-references.html');
const index = read('site/pixel-lab/index.html');
const guide = read('docs/pixel-portrait-prompt-guide-v1.1.md');

test('curated artist index is populated and preserves older references', () => {
  assert.ok(portraits.items.length >= 12);
  assert.ok(secondary.artists.length >= 15);
  assert.ok(portraits.items.some(x => x.artist === 'Sakulibera'));
  assert.ok(portraits.items.some(x => x.artist === 'hinyari9'));
  assert.ok(portraits.items.some(x => x.artist.includes('domo')));
  assert.ok(portraits.items.some(x => x.artist.includes('Nimono')));
});

test('artist names, verified sources and training-rights protections', () => {
  const ids=new Set();
  for (const item of portraits.items) {
    assert.ok(!ids.has(item.id)); ids.add(item.id);
    assert.ok(item.artist && item.work && item.study && item.url);
    assert.match(item.url,/^https:\/\//);
    assert.equal(item.training_license,'not_verified');
    assert.equal(item.anima_artist_tag,'unverified');
    assert.ok(['JP','unknown'].includes(item.region));
    assert.ok(['fullbody','secondary','comparison'].includes(item.level));
    if (item.region==='unknown') assert.equal(item.level,'comparison');
  }
});

test('browser reference gallery and both prompt modes wired', () => {
  assert.match(page,/pixel-portrait-artists\.json/);
  assert.match(page,/data-filter="fullbody"/);
  assert.match(page,/data-filter="comparison"/);
  assert.match(page,/value="anima"/);
  assert.match(page,/value="moss"/);
  assert.match(page,/navigator\.clipboard/);
  assert.match(page,/image-rendering:pixelated/);
  assert.match(index,/pixel-portrait-references\.html/);
});

test('guide separates concept model generation from native artwork', () => {
  assert.match(guide,/Anima/);
  assert.match(guide,/MOSS/);
  assert.match(guide,/原生/);
  assert.match(guide,/训练/);
  assert.match(guide,/@tag/);
});
