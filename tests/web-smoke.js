const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/game.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const renderer = fs.readFileSync("src/renderers/pixi-dynamic-renderer.mjs", "utf8");

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
  "entityTrack","pixiEntityLayer","playerFlip","playerSprite","enemy","enemy2","enemyHealthFill","enemy2HealthFill","crouchBtn","jumpBtn","attackBtn",
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
assert(/function autoMode\(\)\{[\s\S]*?return ['"]dom['"];[\s\S]*?\}/.test(renderer), "Mobile/desktop auto renderer parity missing");
assert(renderer.includes("runtime?.worldData?.playerVisual"), "Pixi renderer is not using shared player visual dimensions");
assert(renderer.includes("runtime.worldData?.playerActions"), "Pixi renderer is not using shared player action textures");
assert(renderer.includes("runtime?.worldData?.playerActionMeta"), "Pixi renderer is not using shared action orientation/scale metadata");
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
assert(fs.existsSync("src/puppet/paper-puppet-runtime.mjs"), "Paper puppet runtime module missing");
assert(fs.existsSync("assets/puppets/player/manifest.json"), "Player puppet manifest missing");
assert(game.includes("refreshRuntimeFrameState"), "Allocation-free renderer frame state missing");
assert(game.includes("const PLAYER_VISUAL_BASE=Object.freeze({w:104,h:156})"), "Base 104x156 player visual config missing");
assert(game.includes("const PLAYER_VISUAL={w:104,h:156,scale:1}"), "Mutable responsive player visual state missing");
assert(game.includes("const VIEWPORT_REFERENCE=Object.freeze({w:1280,h:720})"), "Unified viewport reference missing");
assert(game.includes("const PLAYER_ACTION_META=Object.freeze"), "Per-action visual metadata missing");
assert(game.includes("walk:Object.freeze({scale:.92,sourceFacing:-1})"), "Newest walk orientation correction missing");
assert(game.includes("crouch:Object.freeze({scale:.76,sourceFacing:1})"), "Crouch visual normalization missing");
assert(game.includes("function startPlayerActionSettle"), "Soft player action settle transition missing");
assert(game.includes("function startPlayerTurnFlip"), "Paper-puppet turn flip transition missing");
assert(!game.includes("function startPlayerPaperFlip"), "Full paper flip must not run on every action change");
assert(game.includes("startPlayerActionSettle(previousState,state)"), "Action changes must use soft settle");
assert(game.includes("state==='crouch'||previousState==='crouch')return"), "Crouch must bypass shared-card scale settle");
assert(html.includes('/assets/player/runtime/crouch.webp?v='), "Crouch asset must be eagerly preloaded");
assert(game.includes("startPlayerTurnFlip(dir)"), "Direction changes must own the full paper flip");
assert(game.includes("function schedulePlayerActionWarmup"), "Idle-time action predecode missing");
assert(game.includes("requestAnimationFrame(flushViewportChange)"), "Viewport updates are not frame-debounced");
assert(!fs.existsSync("assets/road/user-road-surface-r1.webp"), "Painted road asset must be removed");
assert(html.includes('class="world-layer road-layer" hidden'), "Road compatibility layer must stay hidden");
assert(css.includes(".road-layer{display:none!important}"), "Road visuals are not fully disabled");
assert(html.includes('id="midgroundApartment"'), "Apartment midground image missing");
assert(fs.existsSync("assets/backgrounds/apartment-midground.webp"), "Local apartment runtime asset missing");
assert(html.includes('./assets/backgrounds/apartment-midground.webp?v='), "Apartment is not using the local runtime asset");
assert(!html.includes("cdn.openart.ai"), "Runtime HTML still depends on OpenArt CDN");
assert(!html.includes("blackKeyApartment") && !css.includes("blackKeyApartment"), "Realtime apartment black-key filter still present");
assert(game.includes("updateMidgroundApartmentVisibility"), "Apartment off-screen culling missing");
assert(html.includes('width="780" height="1040"'), "Apartment display dimensions must be 780x1040 at default player scale");
assert(css.includes("width:calc(var(--player-visual-h,156px) * 5)"), "Apartment width is not tied to player scale");
assert(!fs.existsSync("assets/backgrounds/mountain-paper-r13.webp"), "Background mountain asset must be removed");
assert(!html.includes("mountainBackground")&&!css.includes(".mountain-background-layer"), "Background mountain layer still exists");
assert(html.includes("sun-paper-r13.webp")&&html.includes("moon-paper-r13.webp")&&html.includes("cloud-paper-r13.webp"), "User supplied sky props are not mounted");
assert(css.includes(".paper-cloud::before")&&css.includes(".paper-celestial::before"), "Hanging lines for sky props are missing");
assert(game.includes("MAP_TERRAIN.length=0")&&game.includes("MAP_OBJECTS.length=0")&&game.includes("MAP_LANDMARKS.length=0")&&game.includes("MAP_PICKUPS.length=0"), "Assistant-authored map filler is not cleared");
assert(game.includes("const rear=[];")&&game.includes("const front=[];"), "Assistant-authored foreground/background prop strips remain");
assert(!game.includes("loadMidgroundAtlas"), "Legacy grass/rock atlas loader remains");
assert(!fs.existsSync("assets/props/grass-rock.webp")&&!fs.existsSync("assets/props/rocks-grass.webp")&&!fs.existsSync("assets/props/soft-grass.webp"), "Assistant grass assets remain");

assert(!css.includes(".world-block{"), "Voxel/block ground visuals must stay removed");
assert(!game.includes("WORLD_BLOCK_SIZE"), "Voxel/block simulation must stay removed");
assert(!html.includes('id="mineBtn"') && !html.includes('id="placeBtn"'), "Voxel mine/place controls must stay removed");
assert(game.includes("setProperty('--road-surface-x'"), "Road surface is not world-anchored");
const androidMain=fs.readFileSync("android-app/app/src/main/java/com/paperchalk/world/MainActivity.java","utf8");
assert(androidMain.includes("?androidRefresh="), "Android app must cache-bust the HTML shell on refresh");
assert(androidMain.includes('loadFreshGame("launch")'), "Android cold launch refresh missing");
assert(androidMain.includes('loadFreshGame("resume")'), "Android foreground resume refresh missing");
assert(androidMain.includes("awayMs >= 1500L"), "Android resume refresh is not protected from tiny interruptions");
assert(androidMain.includes("window.PaperchalkSaveNow"), "Android onPause save bridge missing");
assert(game.includes("window.PaperchalkSaveNow"), "Web save bridge missing");
assert(androidMain.includes('"Cache-Control", "no-cache, max-age=0"'), "Android HTML request must force revalidation");
const androidGradle=fs.readFileSync("android-app/app/build.gradle.kts","utf8");
assert(androidGradle.includes("versionCode = 3") && androidGradle.includes('versionName = "0.1.2"'), "Android APK version was not bumped");
assert(!game.includes("visualViewport?.addEventListener('scroll'"), "Visual viewport scroll still forces world rebuilds");
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
assert(fs.existsSync("assets/npcs/phone-girl-offline-r1.webp"), "Supplied left-character NPC asset missing");
assert(game.includes("id:'npc-phone-girl'"), "New left-character NPC data missing");
assert(game.includes("phone-girl-offline-r1.webp"), "NPC runtime is not using supplied left-character asset");
assert(!game.includes("npc-old-crafter")&&!game.includes("白翼引路人"), "Old placeholder NPC data still present");
assert(!html.includes("npc-portrait.js")&&!html.includes("npc-portrait-hd.svg"), "Old generated NPC portrait runtime still referenced");
assert(!fs.existsSync("assets/dialogue/npc-portrait-hd.svg")&&!fs.existsSync("assets/dialogue/npc-portrait.js"), "Old generated NPC portrait assets still exist");
assert(css.includes("width:auto;height:auto;max-width:none;max-height:none"), "NPC art is being geometrically scaled instead of native-size rendering");
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
assert(game.includes("const PLAYER_ACTION_ASSETS=Object.freeze"), "Player action asset map missing");
assert(game.includes("function syncPlayerActionState"), "Player action state resolver missing");
assert(game.includes("function setPlayerCrouching"), "Crouch state missing");
assert(game.includes("playerVy>0?'jump-up':'jump-down'"), "Jump ascent/descent state split missing");
assert(game.includes("e.code==='ArrowDown'||e.code==='KeyS'"), "Keyboard crouch input missing");
for (const name of ['idle','crouch','jump-up','jump-down','walk']) {
  assert(fs.existsSync('assets/player/'+name+'.webp'), 'Missing supplied high-resolution player source asset: '+name);
  assert(fs.existsSync('assets/player/runtime/'+name+'.webp'), 'Missing optimized runtime player action asset: '+name);
}
assert(game.includes("./assets/player/runtime/idle.webp"), "Runtime is not using optimized player sprites");
assert(html.includes('id="playerFlip"'), "Player paper-flip wrapper missing");
assert(css.includes(".player-flip"), "Player paper-flip CSS missing");
assert(css.includes("--action-scale"), "Action scale CSS variable missing");
assert(css.includes("--source-facing"), "Source-facing correction CSS variable missing");
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


// clean-stage-r14: generated midground atlas intentionally removed.
console.log("WEB_SMOKE_PASS");
