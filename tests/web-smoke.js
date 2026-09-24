const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");

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
  "enemy","enemyHealthFill","jumpBtn","attackBtn",
  "playerHurtboxDebug","playerAttackDebug","enemyHurtboxDebug","enemyAttackDebug",
  "debugToggleBtn","debugPanel","debugCommandForm","debugCommandInput","debugOutput"
];

for (const id of requiredIds) {
  assert(html.includes('id="' + id + '"'), "Missing required UI element: " + id);
}

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert(scripts.length > 0, "No inline game script found");

for (const code of scripts) {
  new vm.Script(code);
}

const game = scripts.join("\n");
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
assert(game.includes("function jumpPlayer"), "Jump mechanic missing");
assert(game.includes("function startPlayerAttack"), "Player attack missing");
assert(game.includes("function updateCombat"), "Realtime combat update missing");
assert(game.includes("function rectsOverlap"), "AABB overlap function missing");
assert(game.includes("getPlayerAttackBox"), "Player attack hitbox missing");
assert(game.includes("getEnemyHurtbox"), "Enemy hurtbox missing");
assert(game.includes("KeyJ"), "Keyboard attack key missing");
assert(game.includes("F3"), "Hitbox debug hotkey missing");
assert(html.includes("assets/enemies/rag-drifter.svg"), "Enemy art missing");
assert(fs.existsSync("assets/enemies/rag-drifter.svg"), "Enemy SVG asset missing");
assert(html.includes("@keyframes hp-sewn-heal"), "Health heal pop animation missing");
assert(game.includes("order*45"), "Staggered heal timing missing");
assert(game.includes("window.PaperchalkDebug"), "In-game debug API missing");
assert(game.includes("function runDebugCommand"), "Debug command parser missing");
assert(html.includes('data-debug-action="damage1"'), "Debug -1 HP shortcut missing");
assert(game.includes("save.playerHp=playerHp"), "Health persistence missing");
assert(html.includes("assets/ui/health/hp-cell.webp"), "Normal health segment asset missing");
assert(html.includes("assets/ui/health/hp-tail.webp"), "Tail health segment asset missing");
assert(game.includes("async function paperUIFrom"), "Reusable paper UI transition missing");
assert(game.includes("window.PaperUITransition={openFrom:paperUIFrom}"), "Reusable UI transition API missing");
assert(html.includes("assets/ui/transitions/paper-ball.png"), "Paper ball transition asset missing");
assert(html.includes("assets/ui/transitions/paper-unfold.png"), "Paper unfold transition asset missing");
assert(game.includes("paperUIFrom(e.currentTarget,()=>showPage('settings')"), "Settings must use reusable paper transition");
assert(game.includes("paperUIFrom(e.currentTarget,()=>openUI(true),uiShell)"), "World menu must use reusable paper transition");
assert(game.includes("paperUIFrom(triggerEl,revealBackpack,backpackFrame)"), "Backpack must use reusable paper transition");
assert(html.includes("backpack-ui-v2.png"), "Approved HD backpack panel missing");
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
