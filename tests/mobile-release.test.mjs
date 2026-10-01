import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {buildMobileRelease, replaceChannelPointer, validateReleaseReferences} from '../tools/build-mobile-release.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const timestamp = '2026-10-01T08:00:00.000Z';
const firstVersion = 'a'.repeat(40);
const nextVersion = 'b'.repeat(40);

async function fixture(t) {
  const temporary = await mkdtemp(path.join(tmpdir(), 'paperchalk-mobile-release-'));
  t.after(() => rm(temporary, {recursive: true, force: true}));
  const sourceRoot = path.join(temporary, 'source');
  const output = path.join(temporary, 'site');
  const files = {
    'studio/index.html': '<link rel="stylesheet" href="./studio.css"><script type="module" src="./app.js"></script><a href="../visual-demo.html">Demo</a>',
    'studio/studio.css': 'body { margin: 0; }',
    'studio/app.js': "import {scene} from './rendering/index.js';\nexport {scene};",
    'studio/rendering/index.js': "import * as THREE from '../../vendor/three/three.module.js';\nexport const scene = new URL('../../assets/player/protagonist.webp', import.meta.url);",
    'vendor/three/three.module.js': "export * from './three.core.js';",
    'vendor/three/three.core.js': 'export const mock = true;',
    'assets/player/protagonist.webp': 'fixture image',
    'visual-demo.html': "<script type=\"module\">import * as THREE from './vendor/three/three.module.js';</script>",
  };
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(sourceRoot, name)), {recursive: true});
    await writeFile(path.join(sourceRoot, name), content);
  }
  return {temporary, sourceRoot, output, version: firstVersion, publishedAt: timestamp};
}

const pointerPath = options => path.join(options.output, 'app/channel.json');

test('mobile release is self-contained, hash-indexed and linked by an exact commit channel', async t => {
  const options = await fixture(t);
  await mkdir(options.output);
  await writeFile(path.join(options.output, 'index.html'), 'stable main entry');
  const result = await buildMobileRelease(options);
  assert.deepEqual(result.channel, {
    schemaVersion: 1, version: firstVersion,
    entry: `releases/${firstVersion}/studio/index.html`, publishedAt: timestamp, minShellVersion: 5,
  });
  assert.deepEqual(JSON.parse(await readFile(pointerPath(options), 'utf8')), result.channel);
  assert.equal(await readFile(path.join(options.output, 'index.html'), 'utf8'), 'stable main entry');
  assert.deepEqual(JSON.parse(await readFile(path.join(result.releaseRoot, 'studio/build-info.json'), 'utf8')), {version: firstVersion, publishedAt: timestamp, channel: 'mobile-test'});
  assert.ok(result.checkedReferences >= 8);
  for (const [name, info] of Object.entries(result.manifest.files)) {
    const bytes = await readFile(path.join(result.releaseRoot, name));
    assert.equal(info.bytes, bytes.length);
    assert.equal(info.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
  assert.deepEqual((await readdir(path.join(options.output, 'app'))).sort(), ['channel.json', 'releases']);
});

test('production studio dependency graph remains inside an immutable Pages release', async t => {
  const options = await fixture(t);
  const result = await buildMobileRelease({...options, sourceRoot: repo});
  assert.ok(Object.keys(result.manifest.files).length >= 28);
  assert.ok(result.checkedReferences >= 25);
  assert.ok(result.manifest.files['vendor/three/three.core.js']);
  await validateReleaseReferences(result.releaseRoot);
});

test('a missing dependency fails without advancing a working channel or leaving a partial release', async t => {
  const options = await fixture(t);
  await buildMobileRelease(options);
  const previous = await readFile(pointerPath(options), 'utf8');
  await writeFile(path.join(options.sourceRoot, 'studio/app.js'), "import './missing.js';");
  await assert.rejects(buildMobileRelease({...options, version: nextVersion}), /Unresolved release reference/);
  assert.equal(await readFile(pointerPath(options), 'utf8'), previous);
  assert.deepEqual(await readdir(path.join(options.output, 'app/releases')), [firstVersion]);
});

test('immutable commit contents cannot be silently replaced, while identical builds are idempotent', async t => {
  const options = await fixture(t);
  const first = await buildMobileRelease(options);
  const repeated = await buildMobileRelease({...options, publishedAt: undefined});
  assert.equal(repeated.reused, true);
  assert.deepEqual(repeated.manifest, first.manifest);
  await writeFile(path.join(options.sourceRoot, 'studio/studio.css'), 'body { color: red; }');
  await assert.rejects(buildMobileRelease(options), /already exists with different contents/);
  assert.equal(await readFile(path.join(first.releaseRoot, 'studio/studio.css'), 'utf8'), 'body { margin: 0; }');
});

test('existing release bytes are checked instead of trusting an old manifest', async t => {
  const options = await fixture(t);
  const result = await buildMobileRelease(options);
  await writeFile(path.join(result.releaseRoot, 'studio/studio.css'), 'corrupt');
  await assert.rejects(buildMobileRelease(options), /already exists with different contents/);
});

test('invalid versions and timestamps cannot create a public channel', async t => {
  const options = await fixture(t);
  for (const version of ['../main', 'ABCDEF1', '123456', 'f'.repeat(41), 'latest', 'aaaaaaa/../../../outside']) {
    await assert.rejects(buildMobileRelease({...options, version}), /version must be/);
  }
  await assert.rejects(buildMobileRelease({...options, publishedAt: 'invalid'}), /valid date/);
  await assert.rejects(readFile(pointerPath(options)), {code: 'ENOENT'});
});

test('root-relative and escaping dependencies are rejected before the channel changes', async t => {
  const options = await fixture(t);
  for (const reference of ['/assets/player/protagonist.webp', '../../../../outside.webp', '..\\outside.webp']) {
    await writeFile(path.join(options.sourceRoot, 'studio/app.js'), `export const image = new URL('${reference.replaceAll('\\', '\\\\')}', import.meta.url);`);
    await assert.rejects(buildMobileRelease(options), /Reference escapes|Invalid release reference/);
  }
  await assert.rejects(readFile(pointerPath(options)), {code: 'ENOENT'});
});

test('source junctions and output directory junctions cannot escape the supplied trees', async t => {
  const options = await fixture(t);
  const external = path.join(options.temporary, 'external');
  await mkdir(external);
  await writeFile(path.join(external, 'secret.txt'), 'never publish');
  await symlink(external, path.join(options.sourceRoot, 'studio/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildMobileRelease(options), /Symbolic links are not publishable/);
  await rm(path.join(options.sourceRoot, 'studio/linked'));
  await rm(path.join(options.output, 'app'), {recursive: true});
  await symlink(external, path.join(options.output, 'app'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildMobileRelease(options), /Unsafe output directory/);
  assert.deepEqual(await readdir(external), ['secret.txt']);
});

test('release source files cannot be polluted by a nested output site', async t => {
  const options = await fixture(t);
  for (const output of [options.sourceRoot, path.join(options.sourceRoot, 'studio/site'), path.join(options.sourceRoot, 'vendor/three/site')]) {
    await assert.rejects(buildMobileRelease({...options, output}), /separate site staging directory/);
  }
});

test('a linked ancestor of a required source is rejected too', async t => {
  const options = await fixture(t);
  const external = path.join(options.temporary, 'external-vendor');
  await mkdir(path.join(external, 'three'), {recursive: true});
  await writeFile(path.join(external, 'three/three.module.js'), 'export const external = true;');
  await rm(path.join(options.sourceRoot, 'vendor'), {recursive: true});
  await symlink(external, path.join(options.sourceRoot, 'vendor'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildMobileRelease(options), /Symbolic links are not publishable/);
  await assert.rejects(readFile(pointerPath(options)), {code: 'ENOENT'});
});

test('an output ancestor junction cannot redirect a build back into its input', async t => {
  const options = await fixture(t);
  const alias = path.join(options.temporary, 'alias');
  await symlink(path.join(options.sourceRoot, 'studio'), alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildMobileRelease({...options, output: path.join(alias, 'site')}), /separate site staging directory/);
  await assert.rejects(readFile(path.join(options.sourceRoot, 'studio/site/app/channel.json')), {code: 'ENOENT'});
});

test('a publisher lock prevents concurrent writers from racing the channel', async t => {
  const options = await fixture(t);
  await buildMobileRelease(options);
  const previous = await readFile(pointerPath(options), 'utf8');
  await writeFile(path.join(options.output, 'app/.mobile-release.lock'), 'another build');
  await assert.rejects(buildMobileRelease({...options, version: nextVersion}), /Another mobile release build is active/);
  assert.equal(await readFile(pointerPath(options), 'utf8'), previous);
});

test('temporary Windows sharing failures retry the atomic swap without removing the current channel', async t => {
  const options = await fixture(t);
  await buildMobileRelease(options);
  const pointer = pointerPath(options);
  const previous = await readFile(pointer, 'utf8');
  const pending = path.join(options.output, 'app/.new-channel.json');
  await writeFile(pending, 'new pointer');
  let attempts = 0;
  await replaceChannelPointer(pending, pointer, async (source, target) => {
    assert.equal(await readFile(target, 'utf8'), previous, 'old channel remains readable during retries');
    if (++attempts < 3) throw Object.assign(new Error('temporary sharing violation'), {code: 'EPERM'});
    await rename(source, target);
  });
  assert.equal(attempts, 3);
  assert.equal(await readFile(pointer, 'utf8'), 'new pointer');
});

test('a permanently blocked atomic swap gives up with the old channel intact', async t => {
  const options = await fixture(t);
  await buildMobileRelease(options);
  const pointer = pointerPath(options);
  const previous = await readFile(pointer, 'utf8');
  const pending = path.join(options.output, 'app/.new-channel.json');
  await writeFile(pending, 'new pointer');
  let attempts = 0;
  await assert.rejects(replaceChannelPointer(pending, pointer, async () => {
    attempts++;
    throw Object.assign(new Error('persistent sharing violation'), {code: 'EBUSY'});
  }), {code: 'EBUSY'});
  assert.equal(attempts, 10);
  assert.equal(await readFile(pointer, 'utf8'), previous);
  assert.equal(await readFile(pending, 'utf8'), 'new pointer');
});

test('readers only observe a complete old or complete new release while the pointer advances', async t => {
  const options = await fixture(t);
  await buildMobileRelease(options);
  for (let i = 0; i < 30; i++) await writeFile(path.join(options.sourceRoot, `studio/extra-${i}.txt`), String(i));
  let complete = false;
  let publicationError;
  // Handle a rejected publisher immediately while the test is polling readers.
  const publishing = buildMobileRelease({...options, version: nextVersion})
    .catch(error => { publicationError = error; })
    .finally(() => { complete = true; });
  let observations = 0;
  while (!complete) {
    const channel = JSON.parse(await readFile(pointerPath(options), 'utf8'));
    assert.ok([firstVersion, nextVersion].includes(channel.version));
    const releaseRoot = path.join(options.output, 'app/releases', channel.version);
    const manifest = JSON.parse(await readFile(path.join(releaseRoot, 'manifest.json'), 'utf8'));
    assert.equal(manifest.version, channel.version);
    await readFile(path.join(options.output, 'app', channel.entry));
    observations++;
    await yieldTurn();
  }
  await publishing;
  if (publicationError) throw publicationError;
  assert.ok(observations > 0);
  assert.equal(JSON.parse(await readFile(pointerPath(options), 'utf8')).version, nextVersion);
  assert.deepEqual((await readdir(path.join(options.output, 'app/releases'))).sort(), [firstVersion, nextVersion]);
});
