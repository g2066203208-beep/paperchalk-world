/* AUTO-GENERATED — do not edit manually. Run: python3 tools/build-character-registry.py */
(function(root){
'use strict';
if(!root.PaperchalkCharacterRegistry)throw Error('Load character-registry.js first');
for(const character of [
  {
    "id": "farmer-engineer-farmer",
    "name": "农夫",
    "faction": "farmer",
    "profession": "engineer",
    "portrait": "../assets/characters/farmer-faction/engineer/01-farmer.png",
    "approved": true,
    "width": 704,
    "height": 1024,
    "roleName": "农夫",
    "variant": "young",
    "sourcePrompt": null,
    "tags": [
      "草帽",
      "菜篮",
      "耕种",
      "工程师"
    ]
  },
  {
    "id": "farmer-faction-ranger-01-huntress",
    "name": "01-huntress",
    "faction": "farmer-faction",
    "profession": "ranger",
    "portrait": "../assets/characters/farmer-faction/ranger/01-huntress.png",
    "approved": false,
    "width": 704,
    "height": 1024,
    "roleName": "",
    "variant": "",
    "sourcePrompt": null,
    "tags": []
  },
  {
    "id": "farmer-warrior-loli-lumberjack",
    "name": "伐木少女",
    "faction": "farmer",
    "profession": "warrior",
    "portrait": "../assets/characters/farmer-faction/warrior/01-loli-lumberjack.png",
    "approved": true,
    "width": 704,
    "height": 1024,
    "roleName": "伐木工",
    "variant": "loli",
    "sourcePrompt": "docs/characters/FARMER_FACTION_WARRIOR_LOLI_LUMBERJACK_APPROVED_20261113.md",
    "tags": [
      "斧头",
      "劈柴",
      "乡村",
      "战士"
    ]
  }
]) root.PaperchalkCharacterRegistry.register(character);
})(window);
