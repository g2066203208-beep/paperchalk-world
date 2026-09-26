const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/game.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const ecs = fs.readFileSync("src/core/ecs-runtime.js", "utf8");
const events = fs.readFileSync("src/core/event-bus.js", "utf8");
const state = fs.readFileSync("src/core/game-state.js", "utf8");
const saves = fs.readFileSync("src/core/save-runtime.js", "utf8");
const cardCamera = fs.readFileSync("src/core/card-camera.js", "utf8");
const content = fs.readFileSync("src/content/game-content.js", "utf8");
const buildingPools = fs.readFileSync("src/content/building-pools.js", "utf8");
const domCardRenderer = fs.readFileSync("src/renderers/dom-card-projection.js", "utf8");
const oldTownRenderer = fs.readFileSync("src/renderers/oldtown-building-layer.js", "utf8");
const renderer = fs.readFileSync("src/renderers/pixi-dynamic-renderer.mjs", "utf8");
const cameraSettings = fs.readFileSync("src/camera-settings.js", "utf8");

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
  "oldTownBuildingLayer","oldTownBuildingTrack",
  "mapTrack","terrainTrack","mapObjectTrack","mapLandmarkTrack","mapDebugTrack","mapNotice","interactBtn",
  "entityTrack","pixiEntityLayer","playerFlip","playerSprite","enemy","enemy2","enemyHealthFill","enemy2HealthFill","crouchBtn","jumpBtn","attackBtn",
  "playerHurtboxDebug","playerAttackDebug","enemyHurtboxDebug","enemyAttackDebug",
  "debugHitboxBtn","debugRangeBtn","debugMapColliderBtn","debugCameraBtn",
  "debugToggleBtn","debugPanel","debugCommandForm","debugCommandInput","debugOutput",
  "cameraControlBtn","cameraControlPanel","cameraControlClose","cameraTilt","cameraTiltValue","cameraHeight","cameraHeightValue","cameraDistance","cameraDistanceValue","cameraReset"
];

for (const id of requiredIds) {
  assert(html.includes('id="' + id + '"'), "Missing required UI element: " + id);
}

assert(/href=["']\.\/styles\/game\.css(?:\?[^"']*)?["']/.test(html), "External game stylesheet missing");
assert(/src=["']\.\/src\/core\/ecs-runtime\.js(?:\?[^"']*)?["']/.test(html), "ECS runtime script missing");
assert(html.indexOf("./src/core/event-bus.js") < html.indexOf("./src/game.js"), "Event bus must load before game runtime");
assert(html.indexOf("./src/core/game-state.js") < html.indexOf("./src/game.js"), "State machine must load before game runtime");
assert(html.indexOf("./src/core/save-runtime.js") < html.indexOf("./src/game.js"), "Save runtime must load before game runtime");
assert(html.indexOf("./src/core/card-camera.js") < html.indexOf("./src/game.js"), "Card camera must load before game runtime");
assert(html.indexOf("./src/core/ecs-runtime.js") < html.indexOf("./src/game.js"), "ECS runtime must load before game runtime");
assert(html.indexOf("./src/content/game-content.js") < html.indexOf("./src/game.js"), "Authored content must load before game runtime");
assert(html.indexOf("./src/content/building-pools.js") < html.indexOf("./src/game.js"), "Building pools must load before game runtime");
assert(html.indexOf("./src/game.js") < html.indexOf("./src/renderers/oldtown-building-layer.js"), "Old-town renderer must load after game runtime");
assert(/src=["']\.\/src\/game\.js(?:\?[^"']*)?["']/.test(html), "External game runtime missing");
assert(/src=["']\.\/src\/renderers\/pixi-dynamic-renderer\.mjs(?:\?[^"']*)?["']/.test(html), "Pixi dynamic renderer module missing");
assert(fs.existsSync("src/renderers/pixi-dynamic-renderer.mjs"), "Pixi renderer source missing");
assert(fs.existsSync("vendor/pixi/pixi-8.21.0.mjs"), "Pinned PixiJS vendor missing");
assert(fs.existsSync("vendor/pixi/LICENSE"), "PixiJS license missing");
assert(/function autoMode\(\)\{[\s\S]*?return ['"]dom['"];[\s\S]*?\}/.test(renderer), "Mobile/desktop auto renderer parity missing");
assert(renderer.includes("runtime?.worldData?.playerVisual"), "Pixi renderer is not using shared player visual dimensions");
assert(renderer.includes("runtime.worldData?.playerActions"), "Pixi renderer is not using shared player action textures");
assert(renderer.includes("runtime?.worldData?.playerActionMeta"), "Pixi renderer is not using shared action orientation/scale metadata");
new vm.Script(events);
new vm.Script(state);
new vm.Script(saves);
new vm.Script(cardCamera);
new vm.Script(ecs);
new vm.Script(content);
new vm.Script(buildingPools);
new vm.Script(game);
new vm.Script(domCardRenderer);
new vm.Script(oldTownRenderer);
assert(ecs.includes("class SparseSetStore"), "Sparse-set ECS component store missing");
assert(ecs.includes("registerSystem(name"), "ECS system scheduler missing");
assert(events.includes("class EventBus"), "Deterministic event bus missing");
assert(state.includes("class StateMachine"), "Application state machine missing");
assert(saves.includes("CURRENT_SCHEMA=3"), "Schema-v3 save runtime missing");
assert(cardCamera.includes("function project(")&&cardCamera.includes("cameraZ=0"), "Shared XY camera with authored Z scene depth missing");
assert(content.includes("function validate(value=content)"), "Content validation runtime missing");
assert(buildingPools.includes("realWorld")&&buildingPools.includes("oldTown"), "Real-world old-town building category missing");
assert(buildingPools.includes("oldtown-building-10"), "Supplied 10-building pool is incomplete");
assert(buildingPools.includes("layer:'midground-far'")&&buildingPools.includes("z:640"), "Old-town pool is not authored on the 5m far-main depth");
assert(domCardRenderer.includes("runtime.subscribe(render)"), "DOM card-camera renderer is not runtime-driven");
assert(oldTownRenderer.includes("runtime.subscribe(render)"), "Old-town building renderer is not runtime-driven");
assert(oldTownRenderer.includes("function shuffled(rowIndex)"), "Seeded random building order missing");
assert(oldTownRenderer.includes("ROW_COPIES=2")&&oldTownRenderer.includes("coarseCulled"), "Virtualized old-town building pool missing");
assert(game.includes("const combatEcs=window.PaperchalkECS"), "Combat ECS world bridge missing");
assert(game.includes("combatEcs.registerSystem('enemy-ai'"), "Enemy AI ECS system missing");
assert(game.includes("combatEcs.run('enemy-ai'"), "Fixed-step combat no longer dispatches through ECS");
assert(game.includes("window.PaperchalkECSRuntime"), "ECS debug/inspection API missing");
assert(game.includes("paperchalk-world-enter',startFrameLoop"), "World RAF does not start on world lifecycle");
assert(game.includes("paperchalk-world-leave',stopFrameLoop"), "World RAF does not stop when leaving gameplay");
assert(!game.includes("\nrequestAnimationFrame(frame);\n"), "Always-on legacy frame loop returned");
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
assert(!html.includes('id="prototypeRuntimeCompat"'), "Prototype compatibility host returned");
assert(!html.includes('id="midgroundApartment"')&&!html.includes('./assets/backgrounds/apartment-midground.webp?v='), "Prototype apartment returned");
assert(!game.includes("PRODUCTION_INTERIORS_ENABLED")&&!game.includes("enterApartment")&&!game.includes("interiorPlayerWorldX"), "Prototype interior runtime returned");
assert(!fs.existsSync("assets/backgrounds/mountain-paper-r13.webp"), "Background mountain asset must be removed");
assert(!html.includes("mountainBackground")&&!css.includes(".mountain-background-layer"), "Background mountain layer still exists");
assert(html.includes("sun-paper-r13.webp")&&html.includes("moon-paper-r13.webp")&&html.includes("cloud-paper-r13.webp"), "User supplied sky props are not mounted");
assert(css.includes(".paper-cloud::before")&&css.includes(".paper-celestial::before"), "Hanging lines for sky props are missing");
assert(game.includes("const MAP_TERRAIN=[]")&&game.includes("const MAP_OBJECTS=[]")&&game.includes("const MAP_LANDMARKS=[]")&&game.includes("const MAP_PICKUPS=[]"), "Production world must start from empty authored collections");
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
assert(game.includes("const MAP_TERRAIN=[]"), "Empty terrain authoring bridge missing");
assert(game.includes("const MAP_OBJECTS=[]"), "Empty map-object authoring bridge missing");
assert(content.includes("npcs:[]")&&content.includes("enemySpawns:[]"), "Production story content must start without prototype NPC/enemy spawns");
assert(game.includes("const MAP_NPCS=AUTHORED_CONTENT.npcs"), "Future NPC content bridge missing");
assert(game.includes("const ENEMY_SPAWNS=AUTHORED_CONTENT.enemySpawns"), "Future enemy content bridge missing");
assert(!html.includes("phone-girl-offline-r1.webp"), "Prototype NPC asset must not be loaded by production HTML");
assert(!html.includes('src="./assets/enemies/rag-drifter.svg'), "Prototype enemy art must not be mounted in production HTML");
assert(!html.includes('id="apartmentDoorPrompt"'), "Prototype door prompt must not exist in production UI");
assert(!game.includes("enterApartment")&&!game.includes("exitApartment")&&!game.includes("sceneLocation"), "Prototype scene/interior runtime returned");
assert(!html.includes('id="prototypeRuntimeCompat"')&&!html.includes('id="interiorFarLayer"')&&!html.includes('id="interiorMidLayer"')&&!html.includes('id="interiorNearLayer"'), "Prototype interior DOM returned");
assert(!css.includes(".interior-scene")&&!css.includes(".stage.scene-interior"), "Prototype interior CSS returned");
assert(html.includes('id="debugFlightBtn"')&&game.includes("setDebugFlightMode"), "Debug flight mode missing");
assert(game.includes("const OUTDOOR_FLIGHT_MAX_Y=50000")&&game.includes("if(debugFlightMode){"), "Free flight must support large Y");
assert(game.includes("worldX=clamp(playerWorldX-playerScreenAnchorX")&&!game.includes("actorX=playerWorldX-worldX"), "Normal camera follow must move the world without moving the player");
assert(game.includes("const playerProjection=CARD_CAMERA.project")&&game.includes("const actorBottom=(VIEW_H-playerProjection.y).toFixed(2)+'px'")&&game.includes("--world-camera-y"), "Vertical simulation/camera framing must keep player feet on the shared projected ground");
assert(game.includes("const axis=(playerCrouching&&!debugFlightMode)?0:rawAxis"), "Free flight horizontal movement is missing");
assert(game.includes("function flightVerticalAxis")&&game.includes("joystickFlightAxisY"), "Free flight vertical/joystick controls missing");
assert(game.includes("mobileFlightUp")&&game.includes("mobileFlightDown"), "Mobile free-flight controls missing");
assert(css.includes("width:clamp(76px,5.8vw,88px)"), "Combat buttons were not enlarged");
assert(game.includes("function nearbyNpc"), "NPC proximity logic missing");
assert(game.includes("e.code==='KeyE'"), "NPC keyboard interaction missing");
assert(html.includes('id="debugFlightBtn"')&&game.includes("setDebugFlightMode"), "Debug flight mode missing");
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
assert(!game.includes("keyboardDepthForward")&&!game.includes("keyboardDepthBack"), "Player depth keyboard input must not exist");
assert(!game.includes("joystickDepthAxis"), "Player depth joystick input must not exist");
assert(!game.includes("Math.hypot(dx,dz)")&&!game.includes("Math.abs(e.z)")&&!game.includes("cardDepthDistance(n.x"), "Authored Z leaked back into gameplay distance/interaction logic");
assert(game.includes("e.code==='ArrowUp'||e.code==='KeyW'")&&game.includes("else jumpPlayer();"), "W/Up jump input missing");
assert(game.includes("e.code==='ArrowDown'||e.code==='KeyS'")&&game.includes("keyboardCrouch=true"), "S/Down crouch input missing");
assert(game.includes("e.code==='KeyC'"), "Keyboard C crouch input missing");
assert(game.includes("if(e.code==='Space'){")&&game.includes("jumpPlayer();"), "Space jump input missing");
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
assert(game.includes("RAG_DRIFTER.aggroRange")&&content.includes("aggroRange:700"), "Enemy chase radius missing");
assert(html.includes('data-debug-action="hitboxes"'), "Hitbox debug panel button missing");
assert(html.includes('data-debug-action="attackRange"'), "Attack range debug panel button missing");
assert(html.includes('data-debug-action="mapColliders"'), "Terrain collider debug button missing");
assert(html.includes('data-debug-action="cameraDebug"'), "Camera debug button missing");
assert(html.includes('data-debug-action="teleportStart"'), "Map teleport debug controls missing");
assert(!game.includes("e.code==='F2'"), "Debug panel must not depend on F2 hotkey");
assert(!game.includes("e.code==='F3'"), "Hitbox debug must live inside debug panel, not F3");
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
assert(css.includes("R37 XY GAMEPLAY + Z SCENE DEPTH"), "XY gameplay / Z scene-depth stage missing");
assert(html.includes('id="cardGroundCanvas"')&&!html.includes('id="cardGroundDepthLines"'), "Single projected ground canvas host missing");
assert(css.includes(".card-ground-canvas")&&!css.includes("transform:perspective(900px) rotateX(68deg)!important"), "Ground is not using the canvas camera path");
assert(css.includes("--card-horizon-y:40%"), "Card-camera horizon missing");
assert(css.includes("height:var(--card-far-ground-y,60%)"), "Far sky wall is not attached to the finite ground edge");
assert(css.includes("background-position:var(--card-wall-x,0px) var(--card-wall-y,0px)"), "Altitude wall is not camera synchronized");
assert(fs.existsSync("assets/debug/green-grid-1m.svg"), "1m green grid texture asset missing");
assert(game.includes("function cardProjection("), "World-to-screen card projection missing");
assert(!game.includes("let playerWorldZ"), "Player must not own a Z movement coordinate");
assert(!game.includes("save.playerWorldZ=playerWorldZ"), "Player Z must not be persisted");
assert(game.includes("delete save.playerWorldZ"), "Legacy player Z must be cleaned from saves");
assert(domCardRenderer.includes("function renderGroundGrid(frame)")&&domCardRenderer.includes("camera.project({")&&domCardRenderer.includes("writeWorldVar('--card-camera-y'"), "Ground is not projected by the shared card camera");
assert(!domCardRenderer.includes("setProperty('--card-grid-z'"), "Ground texture must not scroll from player Z input");
assert(cardCamera.includes("worldZ")&&cardCamera.includes("cameraZ"), "Scene-depth Z projection missing");
assert(css.includes("R38 OLD-TOWN BUILDING POOL"), "Old-town far-midground CSS missing");
assert(css.includes(".oldtown-building-layer")&&css.includes("z-index:3"), "Old-town building layer depth missing");
assert(fs.existsSync("assets/buildings/real-world/old-town/oldtown-building-atlas-r1.webp"), "Old-town building atlas missing");
assert(html.includes("oldtown-building-atlas-r1.webp?v=1"), "Old-town atlas preload missing");
assert(html.includes('meta name="paperchalk-build" content="camera-scroll-r53"'), "R53 camera-scroll build cache key missing");
assert(html.includes('const BUILD = "camera-scroll-r53"'), "Top-level cache redirect build key missing");
assert(html.includes('./src/game.js?v=camera-scroll-r53'), "game.js camera debug cache key missing");
assert(html.includes('./src/camera-settings.js?v=camera-scroll-r53'), "camera settings controller missing");
assert(html.indexOf('./src/renderers/dom-card-projection.js')<html.indexOf('./src/camera-settings.js'), "camera settings controller must load after projection renderer");
assert(domCardRenderer.includes("getContext('2d'")&&domCardRenderer.includes("coarseVisibleX"), "Canvas/culling renderer path missing");
assert(cardCamera.includes("farGroundDepth:FAR")&&cardCamera.includes("sceneGuides:Object.freeze"), "Finite scene-depth guide config missing");
assert(cardCamera.includes("baseDepth:3840")&&cardCamera.includes("id:'near-main'")&&cardCamera.includes("z:-640")&&cardCamera.includes("id:'far-main'")&&cardCamera.includes("z:640")&&cardCamera.includes("const FAR=1280"), "Meter-aligned main scene guides missing");
assert(cardCamera.includes("defaultTiltDegrees:DT")&&cardCamera.includes("defaultHeightMeters:DH")&&cardCamera.includes("maxTiltDegrees:80"), "Independent production camera defaults/range missing");
assert(cardCamera.includes("function tiltFactor(")&&cardCamera.includes("function resolveMidY("), "Mid-axis camera pitch projection missing");
assert(cardCamera.includes("function setTiltDegrees(")&&cardCamera.includes("function setCameraHeightMeters(")&&cardCamera.includes("function setCameraDistanceMeters("), "Angle/height/distance camera API missing");
assert(cameraSettings.includes("paperchalk.settings.v1")&&cameraSettings.includes("cameraControlBtn")&&cameraSettings.includes("cameraTilt")&&cameraSettings.includes("cameraHeight")&&cameraSettings.includes("cameraDistance"), "Standalone camera controller missing");
assert(html.includes('id="cameraControlBtn"')&&html.includes('id="cameraControlPanel"'), "Standalone camera UI missing");
assert(css.includes(".camera-control-panel{")&&css.includes("overflow-x:hidden;overflow-y:auto")&&css.includes("-webkit-overflow-scrolling:touch"), "Camera panel must be vertically scrollable");
assert(css.includes("@media(max-width:900px),(max-height:700px)")&&css.includes("max-height:calc(100dvh - 92px - env(safe-area-inset-bottom))"), "Short-screen camera panel viewport cap missing");
assert(!html.includes('id="settingCameraTilt"')&&!html.includes('id="settingCameraHeight"')&&!html.includes('id="settingCameraDistance"'), "Camera controls must not remain in Settings");
assert(!html.includes('id="debugCameraTilt"')&&!html.includes('id="debugCameraHeight"')&&!html.includes('id="debugCameraDistance"'), "Camera controls must not remain in Debug");
assert(domCardRenderer.includes("renderNow(){")&&domCardRenderer.includes("render(runtime.getSnapshot(),true)"), "Immediate camera tilt redraw API missing");
assert(html.includes('class="stage production-clean-stage"'), "Production-clean stage marker missing");
assert(!html.includes('data-debug-action="enemyNear"')&&!html.includes('data-debug-action="enemyReset"')&&!html.includes('data-debug-action="enemyAI"')&&!html.includes('data-debug-action="spawnZones"'), "Prototype enemy debug controls must be removed");
assert(domCardRenderer.includes("'near-main': {color:'#ff8c00',width:4}")&&domCardRenderer.includes("'mid-main':  {color:'#0878d1',width:4}")&&domCardRenderer.includes("'far-main':  {color:'#9b51e0',width:4}")&&domCardRenderer.includes("'horizon':   {color:'#ffd43b',width:5}"), "Main scene-guide colors/weights missing");


// clean-stage-r14: generated midground atlas intentionally removed.
console.log("WEB_SMOKE_PASS");
