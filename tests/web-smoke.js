const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/game.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredIds = [
  "uiShell","pageMenu","pageAuth","pageSettings",
  "continueBtn","enterBtn","authBtn","settingsBtn",
  "loginForm","registerForm","worldMenuBtn",
  "joystickZone","joystick",
  "backpackBtn","backpackOverlay","backpackFrame","backpackSlots",
  "inventoryUse","inventoryDrop",
  "playerHealthHud","playerHealthBar",
  "mapTrack","terrainTrack","mapObjectTrack","mapLandmarkTrack","mapDebugTrack","mapNotice","interactBtn",
  "entityTrack","pixiEntityLayer","enemy","enemy2","enemyHealthFill","enemy2HealthFill","jumpBtn","attackBtn",
  "playerHurtboxDebug","playerAttackDebug","enemyHurtboxDebug","enemyAttackDebug",
  "debugHitboxBtn","debugRangeBtn","debugAiBtn","debugMapColliderBtn","debugSpawnBtn","debugCameraBtn",
  "debugToggleBtn","debugPanel","debugCommandForm","debugCommandInput","debugOutput"
];

for (const id of requiredIds) {
  assert(html.includes('id="' + id + '"'), "Missing required UI element: " + id);
}

assert(/href=["']\.\/styles\/game\.css(?:\?[^"']*)?["']/.test(html), "External game stylesheet missing");
assert(/src=["']\.\/src\/game\.js(?:\?[^"']*)?["']/.test(html), "External game runtime missing");
assert(/src=["']\.\/src\/renderers\/pixi-dynamic-renderer\.mjs(?:\?[^"']*)?["']/.test(html), "Pixi dynamic renderer module missing");
assert(fs.existsSync("src/renderers/pixi-dynamic-renderer.mjs"), "Pixi renderer source missing");
assert(fs.existsSync("vendor/pixi/pixi-8.21.0.mjs"), "Pinned PixiJS vendor missing");
assert(fs.existsSync("vendor/pixi/LICENSE"), "PixiJS license missing");
new vm.Script(game);
assert(
  /const\s+settingsBtn\s*=\s*document\.getElementById\(['"]settingsBtn['"]\)/.test(game),
  "settingsBtn is used but not declared"
);
assert(game.includes("enterBtn.addEventListener"), "Enter-world listener missing");
assert(game.includes("registerForm.addEventListener"), "Register listener missing");
assert(game.includes("loginForm.addEventListener"), "Login listener missing");
assert(game.includes("joystickZone.addEventListener('pointerdown'"), "Dynamic joystick pointerdown missing");
assert(game.includes("joystickZone.addEventListener('pointermove'"), "Dynamic joystick pointermove missing");
assert(game.includes("function updateJoystick"), "Analog joystick update function missing");
assert(game.includes("function movementAxis"), "Analog movement axis missing");
assert(game.includes("JOY_DEADZONE"), "Joystick deadzone missing");
assert(game.includes("maxSpeed*magnitude"), "Analog speed scaling missing");
assert(game.includes("INVENTORY_CAPACITY=20"), "20-slot inventory missing");
assert(game.includes("PLAYER_MAX_HP=10"), "Default 10-point health system missing");
assert(game.includes("window.PaperchalkHealth"), "Health control API missing");
assert(game.includes("window.PaperchalkCombat"), "Combat API missing");
assert(game.includes("window.PaperchalkMap"), "Map API missing");
assert(game.includes("window.PaperchalkRuntime"), "Renderer-neutral runtime contract missing");
assert(game.includes("refreshRuntimeFrameState"), "Allocation-free renderer frame state missing");
assert(
  game.includes("const WORLD_ZONE_WIDTH=6000") &&
  game.includes("const WORLD_ZONE_COUNT=20") &&
  game.includes("const MAP_WIDTH=WORLD_ZONE_WIDTH*WORLD_ZONE_COUNT"),
  "120000px network world definition missing"
);
assert(game.includes("const MAP_TERRAIN=["), "Terrain data missing");
assert(game.includes("const MAP_OBJECTS=["), "Map object data missing");
assert(game.includes("const ENEMY_SPAWNS=["), "Enemy spawn data missing");
assert(game.includes("const MAP_NPCS=["), "Map NPC data missing");
assert(game.includes("function interactWithNpc"), "NPC interaction logic missing");
assert(game.includes("function nearbyNpc"), "NPC proximity logic missing");
assert(game.includes("e.code==='KeyE'"), "NPC keyboard interaction missing");
assert(game.includes("function movePlayerHorizontal"), "Terrain horizontal collision missing");
assert(game.includes("function updatePlayerVertical"), "Platform vertical collision missing");
assert(game.includes("function updateCamera"), "Camera follow missing");
assert(game.includes("function breakMapObject"), "Breakable object logic missing");
assert(game.includes("function collectPickup"), "Pickup logic missing");
assert(game.includes("playerWorldX"), "Player world coordinate missing");
assert(game.includes("save.playerWorldX=playerWorldX"), "Player map position persistence missing");
assert(game.includes("save.mapState="), "Map-state persistence missing");
assert(game.includes("function jumpPlayer"), "Jump mechanic missing");
assert(game.includes("function startPlayerAttack"), "Player attack missing");
assert(game.includes("function updateCombat"), "Realtime combat update missing");
assert(game.includes("function rectsOverlap"), "AABB overlap function missing");
assert(game.includes("getPlayerAttackBox"), "Player attack hitbox missing");
assert(game.includes("getEnemyHurtbox"), "Enemy hurtbox missing");
assert(game.includes("KeyJ"), "Keyboard attack key missing");
assert(
  game.includes("writeTransform(entityTrack,'entity',mapT)") ||
  game.includes("entityTrack.style.transform"),
  "World entity track transform missing"
);
assert(game.includes("e.state='patrol'"), "Enemy patrol state missing");
assert(game.includes("dist<=700"), "Enemy chase radius missing");
assert(html.includes('data-debug-action="hitboxes"'), "Hitbox debug panel button missing");
assert(html.includes('data-debug-action="attackRange"'), "Attack range debug panel button missing");
assert(html.includes('data-debug-action="enemyAI"'), "Enemy AI debug panel button missing");
assert(html.includes('data-debug-action="mapColliders"'), "Terrain collider debug button missing");
assert(html.includes('data-debug-action="spawnZones"'), "Enemy spawn-zone debug button missing");
assert(html.includes('data-debug-action="cameraDebug"'), "Camera debug button missing");
assert(html.includes('data-debug-action="teleportStart"'), "Map teleport debug controls missing");
assert(!game.includes("e.code==='F2'"), "Debug panel must not depend on F2 hotkey");
assert(!game.includes("e.code==='F3'"), "Hitbox debug must live inside debug panel, not F3");
assert(html.includes("assets/enemies/rag-drifter.svg"), "Enemy art missing");
assert(fs.existsSync("assets/enemies/rag-drifter.svg"), "Enemy SVG asset missing");
assert(css.includes("@keyframes hp-sewn-heal"), "Health heal pop animation missing");
assert(game.includes("order*45"), "Staggered heal timing missing");
assert(game.includes("window.PaperchalkDebug"), "In-game debug API missing");
assert(game.includes("function runDebugCommand"), "Debug command parser missing");
assert(html.includes('data-debug-action="damage1"'), "Debug -1 HP shortcut missing");
assert(game.includes("save.playerHp=playerHp"), "Health persistence missing");
assert(game.includes("assets/ui/health/hp-cell.webp"), "Normal health segment asset missing");
assert(game.includes("assets/ui/health/hp-tail.webp"), "Tail health segment asset missing");
assert(game.includes("async function paperUIFrom"), "Reusable paper UI transition missing");
assert(game.includes("window.PaperUITransition={openFrom:paperUIFrom}"), "Reusable UI transition API missing");
assert(html.includes("assets/ui/transitions/paper-ball.webp"), "Paper ball transition asset missing");
assert(html.includes("assets/ui/transitions/paper-unfold.webp"), "Paper unfold transition asset missing");
assert(game.includes("paperUIFrom(e.currentTarget,()=>showPage('settings')"), "Settings must use reusable paper transition");
assert(game.includes("paperUIFrom(e.currentTarget,()=>openUI(true),uiShell)"), "World menu must use reusable paper transition");
assert(game.includes("paperUIFrom(triggerEl,revealBackpack,backpackFrame)"), "Backpack must use reusable paper transition");
assert(html.includes("backpack-ui-v2.webp"), "Approved HD backpack panel missing");
assert(html.includes("inventory-grid"), "Inventory clickable grid missing");
assert(!html.includes("rope-left.png"), "Old rope decoration should not be used");


// Unified midground atlas must be present and decode as a WEBP file.
const atlasParts = [0,1,2,3].map(i =>
  fs.readFileSync('assets/midground-preview/p' + i + '.txt', 'utf8').trim()
);
const atlasBase64 = atlasParts.join('');
assert(atlasBase64.length === 24120, 'Unexpected midground atlas base64 length');
const atlasBytes = Buffer.from(atlasBase64, 'base64');
assert(atlasBytes.slice(0,4).toString('ascii') === 'RIFF', 'Midground atlas is not RIFF');
assert(atlasBytes.slice(8,12).toString('ascii') === 'WEBP', 'Midground atlas is not WEBP');
assert(game.includes('loadMidgroundAtlas'), 'Midground atlas loader missing');
assert(game.includes('spritePosition'), 'Midground sprite positioning missing');
assert(!game.includes("./assets/props/grass-rock.webp?v=2"), 'Old mixed-style prop asset still referenced');

console.log("WEB_SMOKE_PASS");
