'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const canonicalPath = 'docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md';
const canonical = read(canonicalPath);
const sections = canonical.split(/## (?:一、|二、)/);

test('canonical office-worker turnaround retains user-approved 3-view layout', () => {
  assert.equal(sections.length, 3);
  const [front, side, back] = [
    'LEFT FIGURE: Front view.',
    'CENTER FIGURE: Left-facing side profile.',
    'RIGHT FIGURE: Back view.'
  ];
  const three = sections[1];
  for (const label of [front, side, back]) assert.ok(three.includes(label), label);
  assert.ok(three.indexOf(front) < three.indexOf(side));
  assert.ok(three.indexOf(side) < three.indexOf(back));
  assert.match(three, /exactly three full-body drawings/i);
  assert.match(three, /@akipekostyle, <lora:akipekoanima_v1_1:0\.65>/);
});

test('four-view variant keeps base directions and only adds a sustainable frontal idle', () => {
  const four = sections[2];
  const labels = [
    'FIRST FIGURE, FAR LEFT: Front view.',
    'SECOND FIGURE, LEFT CENTER: Left-facing side profile.',
    'THIRD FIGURE, RIGHT CENTER: Back view.',
    'FOURTH FIGURE, FAR RIGHT: Front view, special idle pose.'
  ];
  for (const label of labels) assert.ok(four.includes(label), label);
  for (let i = 1; i < labels.length; i++) assert.ok(four.indexOf(labels[i - 1]) < four.indexOf(labels[i]));
  assert.match(four, /occasionally tapping the fingers/i);
  assert.match(four, /same complete business suit/i);
  const negative = four.split('### Negative Prompt')[1].split('\x60\x60\x60text')[1].split('\x60\x60\x60')[0];
  assert.doesNotMatch(negative, /two frontal figures|(?:^|, )fourth figure(?:,|$)/i);
  assert.match(negative, /fifth figure/);
});

test('failed trial prompt docs are retired without deleting the approved M003 source', () => {
  const retired = [
    'docs/NPC_ANIMA_FAST_PRODUCTION_WORKFLOW_V1_20261108.md',
    'docs/NPC-M001_ANIMA_FOUR_POSE_PROMPT_V3_20261108.md',
    'docs/NPC-M001_ANIMA_FOUR_POSE_PERSONALITY_V4_20261108.md',
    'docs/NPC-M001_ANIMA_FOUR_POSE_PERSONALITY_V5_20261108.md'
  ];
  for (const old of retired) assert.equal(fs.existsSync(path.join(root, old)), false, old);
  assert.equal(fs.existsSync(path.join(root, 'docs/NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md')), true);
  assert.match(read('AGENTS.md'), /NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108/);
});
