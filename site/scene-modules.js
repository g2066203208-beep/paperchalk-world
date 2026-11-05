/* Paperchalk World scene factory — data only, no rendering or storage side effects.
   Every new background inherits the same scene system automatically. */
(function (root) {
  'use strict';
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const IMAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:webp|png|jpe?g)$/;
  const RESERVED = new Set(['menu', 'classroom', 'classroom-box', 'protagonist']);
  const LAYERS = Object.freeze({
    menu: Object.freeze({player: false, enemy: false, fog: true}),
    story: Object.freeze({player: true, enemy: true, fog: true}),
    environment: Object.freeze({player: true, enemy: false, fog: true})
  });
  const EFFECTS = Object.freeze({
    tiltBackgroundOnly: true,
    fixedScreenFog: true,
    darkSceneTransition: true,
    reusableProtagonist: true,
    preserveUserSettings: true
  });

  function define(id, image, alt, title, type, metadata) {
    return Object.freeze({
      id, image, alt, title, type, layers: LAYERS[type], effects: EFFECTS,
      ...metadata
    });
  }
  function buildRegistry(catalog) {
    if (!Array.isArray(catalog)) {
      throw new Error('Scene catalog unavailable — run scripts/build_scene_catalog.py');
    }
    const result = Object.create(null);
    result.menu = define('menu', './assets/menu-wall.webp',
      '一面旧墙、一扇门和一盏灯', '主菜单', 'menu');
    result.classroom = define('classroom', './assets/classroom.webp',
      '空教室全景：黑板、课桌、左侧窗户', '教室', 'story');
    // Integrated test room: same actual L2D game layers, 5 untextured 3D faces.
    // Reuses a valid fallback image for preloading but replaces its display
    // with a scene-local 3D canvas; never creates a second separate game.
    result['classroom-box'] = define('classroom-box', './assets/classroom.webp',
      '三维战斗镜头：前景主角、横向错层的三名 L2D 敌人', '战斗构图 · 三敌人',
      'environment', {layers:Object.freeze({player:true,enemy:true,fog:true}),
        kind:'five-face-3d',version:'combat-composition-v2'});
    for (const entry of catalog) {
      if (!entry || !SLUG.test(entry.id) || !IMAGE.test(entry.file)
          || RESERVED.has(entry.id) || result[entry.id]) {
        throw new Error('Invalid or duplicated scene catalog entry: ' + String(entry?.id));
      }
      if (!Number.isSafeInteger(entry.width) || !Number.isSafeInteger(entry.height)
          || entry.width < 128 || entry.height < 128
          || typeof entry.title !== 'string' || !entry.title.trim()
          || !/^[a-f0-9]{12}$/.test(entry.version)) {
        throw new Error('Invalid scene asset metadata: ' + entry.id);
      }
      // The generator and runtime reject even valid-looking but mismatched filenames.
      if (entry.file.slice(0, entry.file.lastIndexOf('.')) !== entry.id) {
        throw new Error('Scene ID and asset filename mismatch: ' + entry.id);
      }
      result[entry.id] = define(
        entry.id, './assets/scenes/' + entry.file,
        entry.title + '：空室内场景', entry.title, 'environment',
        {width: entry.width, height: entry.height, version: entry.version}
      );
    }
    return Object.freeze(result);
  }
  root.PAPERWORLD_SCENE_MODULES = Object.freeze({
    buildRegistry, LAYERS, EFFECTS, schema: 2
  });
})(window);
