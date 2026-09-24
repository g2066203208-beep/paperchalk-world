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
  "joystickZone","joystick"
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

console.log("WEB_SMOKE_PASS");
