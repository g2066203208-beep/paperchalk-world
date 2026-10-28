import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('new baseline is standalone, with no inherited app paths', () => {
  for (const oldPath of ['src', 'android', 'examples', 'study', 'screenshots', 'package.json', 'style.css', 'style-study.html']) {
    assert.equal(existsSync(oldPath), false, `old path remains: ${oldPath}`);
  }
});

test('reset page is present and clearly not a gameplay demo', () => {
  const html = readFileSync('site/index.html', 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /旧项目的代码、素材、模型和设计均未继承/);
  assert.match(html, /不是游戏演示/);
});
