import {createHash, randomUUID} from 'node:crypto';
import {copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';

const SOURCE_ROOT = fileURLToPath(new URL('../', import.meta.url));
const RELEASE_SOURCES = ['studio', 'vendor/three', 'assets/player', 'visual-demo.html'];
const VERSION_PATTERN = /^[a-f0-9]{7,40}$/;
const json = value => JSON.stringify(value, null, 2) + '\n';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const relativeName = (root, target) => path.relative(root, target).split(path.sep).join('/');

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return !relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

async function exists(target) {
  try { return await lstat(target); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function safeDirectory(target) {
  const stat = await exists(target);
  if (!stat) { await mkdir(target); return; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Unsafe output directory: ${target}`);
}

async function copyTree(source, destination) {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not publishable: ${source}`);
  if (stat.isDirectory()) {
    await mkdir(destination, {recursive: true});
    for (const name of (await readdir(source)).sort()) {
      if (name === '.git' || name === 'node_modules') throw new Error(`Unexpected build input: ${source}/${name}`);
      await copyTree(path.join(source, name), path.join(destination, name));
    }
  } else if (stat.isFile()) {
    await mkdir(path.dirname(destination), {recursive: true});
    await copyFile(source, destination);
  } else throw new Error(`Only regular files can be published: ${source}`);
}

async function assertSourcePath(root, relative) {
  let cursor = root;
  for (const component of relative.split('/')) {
    cursor = path.join(cursor, component);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Symbolic links are not publishable: ${cursor}`);
  }
}

async function listFiles(root, directory = root) {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const absolute = path.join(directory, name);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not publishable: ${absolute}`);
    if (stat.isDirectory()) files.push(...await listFiles(root, absolute));
    else if (stat.isFile()) files.push(relativeName(root, absolute));
    else throw new Error(`Unsupported release file: ${absolute}`);
  }
  return files.sort();
}

function references(source, extension) {
  const found = [];
  if (['.js', '.mjs', '.html'].includes(extension)) {
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) found.push({ref: match[1], module: true});
    for (const match of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push({ref: match[1], module: true});
    for (const match of source.matchAll(/new URL\(\s*['"]([^'"]+)['"],\s*import\.meta\.url\s*\)/g)) found.push({ref: match[1]});
  }
  if (extension === '.html') {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/gi)) found.push({ref: match[1]});
  }
  if (['.css', '.html'].includes(extension)) {
    for (const match of source.matchAll(/\burl\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) found.push({ref: match[1]});
  }
  return found;
}

/** Resolve the browser's literal local dependencies inside an immutable release. */
export async function validateReleaseReferences(releaseRoot) {
  const files = await listFiles(releaseRoot);
  const fileSet = new Set(files);
  const base = 'https://release.invalid/paperchalk-world/app/releases/abcdef0/';
  let checkedReferences = 0;
  for (const filename of files) {
    const extension = path.extname(filename).toLowerCase();
    if (!['.js', '.mjs', '.html', '.css'].includes(extension)) continue;
    const source = await readFile(path.join(releaseRoot, filename), 'utf8');
    for (const {ref, module} of references(source, extension)) {
      if (!ref || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('blob:')) continue;
      if (module && !ref.startsWith('.')) throw new Error(`Non-local module dependency in ${filename}: ${ref}`);
      if (/^(?:https?:|mailto:|tel:)/i.test(ref) || ref.startsWith('//')) continue;
      if (ref.includes('\\')) throw new Error(`Invalid release reference in ${filename}: ${ref}`);
      const url = new URL(ref, new URL(filename, base));
      if (!url.href.startsWith(base)) throw new Error(`Reference escapes its release in ${filename}: ${ref}`);
      let target;
      try { target = decodeURIComponent(url.pathname.slice(new URL(base).pathname.length)); }
      catch { throw new Error(`Invalid encoded reference in ${filename}: ${ref}`); }
      const normalized = path.posix.normalize(target);
      if (normalized.startsWith('../') || normalized.startsWith('/') || !fileSet.has(normalized)) {
        throw new Error(`Unresolved release reference in ${filename}: ${ref}`);
      }
      checkedReferences++;
    }
  }
  for (const required of ['studio/index.html', 'studio/app.js', 'studio/build-info.json', 'vendor/three/three.module.js', 'assets/player/protagonist.webp', 'visual-demo.html']) {
    if (!fileSet.has(required)) throw new Error(`Required release file is missing: ${required}`);
  }
  return {files, checkedReferences};
}

async function describeFiles(root) {
  const result = {};
  for (const filename of await listFiles(root)) {
    if (filename === 'manifest.json') continue;
    const bytes = await readFile(path.join(root, filename));
    result[filename] = {sha256: digest(bytes), bytes: bytes.length};
  }
  return result;
}

function validTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('publishedAt must be a valid date');
  return date.toISOString();
}

// Windows readers and virus scanners may briefly hold a handle without delete
// sharing. Retry the atomic rename; never unlink the working channel to force it.
export async function replaceChannelPointer(source, target, renameOperation = rename) {
  const transient = new Set(['EPERM', 'EACCES', 'EBUSY']);
  for (let attempt = 0; attempt < 10; attempt++) {
    try { await renameOperation(source, target); return; }
    catch (error) {
      if (!transient.has(error.code) || attempt === 9) throw error;
      await pause(Math.min(8 * 2 ** attempt, 128));
    }
  }
}

/** Build first, validate and seal files second, switch the public pointer last. */
export async function buildMobileRelease({sourceRoot = SOURCE_ROOT, output, version, publishedAt} = {}) {
  if (!VERSION_PATTERN.test(version ?? '')) throw new Error('version must be a lowercase hexadecimal Git commit id (7–40 characters)');
  if (typeof output !== 'string' || !output.trim()) throw new Error('An explicit output site directory is required');
  sourceRoot = await realpath(path.resolve(sourceRoot));
  let outputRoot = path.resolve(output);
  const checkOutput = () => {
    if (outputRoot === sourceRoot || RELEASE_SOURCES.some(source => isWithin(path.join(sourceRoot, source), outputRoot))) {
      throw new Error('Output must be a separate site staging directory, outside the release source trees');
    }
  };
  checkOutput();
  await mkdir(outputRoot, {recursive: true});
  await safeDirectory(outputRoot);
  outputRoot = await realpath(outputRoot);
  checkOutput();
  const appRoot = path.join(outputRoot, 'app');
  await safeDirectory(appRoot);
  const releasesRoot = path.join(appRoot, 'releases');
  await safeDirectory(releasesRoot);
  const releaseRoot = path.join(releasesRoot, version);
  const pending = path.join(releasesRoot, `.pending-${version}-${randomUUID()}`);
  const pointerTemp = path.join(appRoot, `.channel-${randomUUID()}.json`);
  const lockPath = path.join(appRoot, '.mobile-release.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Another mobile release build is active; the channel was not changed'); throw error; }
  try {
    const currentRelease = await exists(releaseRoot);
    if (currentRelease && (!currentRelease.isDirectory() || currentRelease.isSymbolicLink())) throw new Error('Unsafe existing release directory');
    const existingManifest = currentRelease ? JSON.parse(await readFile(path.join(releaseRoot, 'manifest.json'), 'utf8')) : null;
    const timestamp = validTimestamp(publishedAt ?? existingManifest?.publishedAt ?? new Date().toISOString());
    await mkdir(pending);
    for (const source of RELEASE_SOURCES) {
      await assertSourcePath(sourceRoot, source);
      await copyTree(path.join(sourceRoot, source), path.join(pending, source));
    }
    await writeFile(path.join(pending, 'studio/build-info.json'), json({version, publishedAt: timestamp, channel: 'mobile-test'}));
    const {checkedReferences} = await validateReleaseReferences(pending);
    const fileManifest = await describeFiles(pending);
    const manifest = {schemaVersion: 1, version, publishedAt: timestamp, channel: 'mobile-test', files: fileManifest};
    await writeFile(path.join(pending, 'manifest.json'), json(manifest));
    if (currentRelease) {
      if (json(existingManifest) !== json(manifest) || json(await describeFiles(releaseRoot)) !== json(fileManifest)) {
        throw new Error(`Immutable release ${version} already exists with different contents`);
      }
    } else await rename(pending, releaseRoot);

    const channel = {schemaVersion: 1, version, entry: `releases/${version}/studio/index.html`, publishedAt: timestamp, minShellVersion: 5};
    const pointer = await open(pointerTemp, 'wx');
    try { await pointer.writeFile(json(channel)); await pointer.sync(); }
    finally { await pointer.close(); }
    const previousPointer = await exists(path.join(appRoot, 'channel.json'));
    if (previousPointer?.isSymbolicLink() || previousPointer?.isDirectory()) throw new Error('Unsafe channel pointer');
    await replaceChannelPointer(pointerTemp, path.join(appRoot, 'channel.json'));
    return {channel, releaseRoot, manifest, checkedReferences, reused: Boolean(currentRelease)};
  } finally {
    // Both temporary paths were allocated under this invocation's checked output directory.
    if (!isWithin(releasesRoot, path.resolve(pending)) || !isWithin(appRoot, path.resolve(pointerTemp))) throw new Error('Refusing to clean up paths outside the output directory');
    await rm(pending, {recursive: true, force: true});
    await rm(pointerTemp, {force: true});
    await lock.close();
    await unlink(lockPath);
  }
}

function parseArguments(argv) {
  const result = {};
  const names = {'--output': 'output', '--version': 'version', '--source': 'sourceRoot', '--published-at': 'publishedAt'};
  for (let index = 0; index < argv.length; index += 2) {
    const key = names[argv[index]];
    if (!key || !argv[index + 1] || argv[index + 1].startsWith('--') || key in result) {
      throw new Error('Usage: node tools/build-mobile-release.mjs --output <site-directory> --version <commit-sha> [--source <repo>] [--published-at <ISO-date>]');
    }
    result[key] = argv[index + 1];
  }
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await buildMobileRelease(parseArguments(process.argv.slice(2)));
    console.log(JSON.stringify({version: result.channel.version, entry: result.channel.entry, files: Object.keys(result.manifest.files).length, checkedReferences: result.checkedReferences, reused: result.reused}));
  } catch (error) {
    console.error(`Mobile release not published: ${error.message}`);
    process.exitCode = 1;
  }
}
