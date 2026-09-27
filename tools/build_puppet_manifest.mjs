#!/usr/bin/env node
/**
 * Build a PaperPuppet layered manifest from transparent PNG/WebP layers.
 *
 * Files are named <role> or <order>-<role>, for example:
 *   02-body.png, 20-face.png, 30-frontHair.png
 */
import fs from 'node:fs';
import path from 'node:path';

const ROLE_Z = Object.freeze({
  backHair: 2, bottomwear: 8, skirt: 8, legLeft: 9, legRight: 10,
  neck: 11, topwear: 12, body: 12, arms: 13, handwear: 13,
  ears: 18, earwear: 19, face: 20, eyes: 22, eyewhite: 22,
  irides: 23, eyelash: 24, eyebrow: 25, mouth: 25, nose: 25,
  neckwear: 26, headwear: 28, sideHair: 29, midHair: 29,
  frontHair: 30, ahoge: 31, whole: 20
});

const ROLE_ALIASES = new Map([
  ['back-hair', 'backHair'], ['backhair', 'backHair'],
  ['front-hair', 'frontHair'], ['fronthair', 'frontHair'],
  ['side-hair', 'sideHair'], ['sidehair', 'sideHair'],
  ['mid-hair', 'midHair'], ['midhair', 'midHair'],
  ['leg-left', 'legLeft'], ['legleft', 'legLeft'],
  ['leg-right', 'legRight'], ['legright', 'legRight'],
  ['top-wear', 'topwear'], ['bottom-wear', 'bottomwear'],
  ['eye-white', 'eyewhite']
]);

function fail(message) {
  console.error(`build_puppet_manifest: ${message}`);
  process.exitCode = 1;
}

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] || fallback) : fallback;
}

function numberArg(name, fallback) {
  const value = Number(arg(name, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeRole(raw) {
  const compact = raw.replace(/\.[^.]+$/, '').replace(/^\d+[-_]/, '');
  return ROLE_ALIASES.get(compact.toLowerCase()) ||
    Object.keys(ROLE_Z).find(role => role.toLowerCase() === compact.toLowerCase()) ||
    compact;
}

function layerFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true})
    .filter(entry => entry.isFile() && /\.(png|webp)$/i.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
}

const inputDir = path.resolve(arg('input', '.'));
const outputFile = path.resolve(arg('output', path.join(inputDir, 'manifest.json')));
const id = arg('id', path.basename(inputDir));
const width = numberArg('width', 104);
const height = numberArg('height', 156);

if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
  fail(`input directory does not exist: ${inputDir}`);
} else {
  const files = layerFiles(inputDir);
  if (!files.length) {
    fail(`no PNG or WebP layers found in ${inputDir}`);
  } else {
    const layers = files.map((file, index) => {
      const stem = path.basename(file, path.extname(file));
      const role = normalizeRole(stem);
      const z = ROLE_Z[role] ?? index;
      return {
        id: stem,
        role,
        src: `./${file.replaceAll('\\', '/')}`,
        z,
        anchor: [0.5, 1]
      };
    }).sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));

    const manifest = {
      version: 1,
      id,
      kind: 'layered',
      designSize: {w: width, h: height},
      displaySize: {w: width, h: height},
      layers
    };
    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote ${layers.length} layers to ${outputFile}`);
  }
}
