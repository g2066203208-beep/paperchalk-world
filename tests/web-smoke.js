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
  "moveLeftBtn","moveRightBtn"
];

for (const id of requiredIds) {
  assert(html.includes('id="' + id + '"'), "Missing required UI element: " + id);
}

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert(scripts.length > 0, "No inline game script found");

// Compile every inline script so syntax errors fail CI immediately.
for (const code of scripts) {
  new vm.Script(code);
}

// Runtime wiring guards for the menu path that previously broke production.
const game = scripts.join("\n");
assert(
  /const\s+settingsBtn\s*=\s*document\.getElementById\(['"]settingsBtn['"]\)/.test(game),
  "settingsBtn is used but not declared"
);
assert(game.includes("enterBtn.addEventListener"), "Enter-world listener missing");
assert(game.includes("registerForm.addEventListener"), "Register listener missing");
assert(game.includes("loginForm.addEventListener"), "Login listener missing");
assert(game.includes("bindMoveButton(moveLeftBtn,'left')"), "Mobile left control missing");
assert(game.includes("bindMoveButton(moveRightBtn,'right')"), "Mobile right control missing");

console.log("WEB_SMOKE_PASS");
