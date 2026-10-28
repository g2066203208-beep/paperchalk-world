import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('only a blank hosted site and Android WebView remain', () => {
  const page = readFileSync('site/index.html', 'utf8');
  const native = readFileSync('android/app/src/main/java/com/paperchalk/lampkeep/MainActivity.java', 'utf8');
  assert.match(page, /<main id="app">/);
  assert.match(native, /https:\/\/g2066203208-beep\.github\.io\/paperchalk-world\//);
  assert.match(native, /WebSettings\.LOAD_NO_CACHE/);
  assert.match(native, /System\.currentTimeMillis\(\)/);
  assert.doesNotMatch(native, /addJavascriptInterface|ExportBridge/);
  for (const old of ['src', 'examples', 'study', 'screenshots', 'style.css', 'style-study.html', 'package.json']) {
    assert.equal(existsSync(old), false, 'legacy path remains: ' + old);
  }
});

test('web deploy and APK build workflows exist', () => {
  assert.equal(existsSync('.github/workflows/ci.yml'), true);
  assert.equal(existsSync('.github/workflows/apk.yml'), true);
});
