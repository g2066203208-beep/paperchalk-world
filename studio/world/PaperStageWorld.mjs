const EPSILON = 1e-7;

const platform = (id, name, kind, profile, options = {}) => Object.freeze({
  id, name, kind, profile: Object.freeze(profile.map(([x, y]) => Object.freeze({ x, y }))),
  frontZ: 3, backZ: -40, bottomY: -4, oneWay: false, ...options,
});

/** Authored paper scenery. Profiles are the same surfaces used by art and collision. */
export function createPaperStageWorld() {
  const platforms = Object.freeze([
    platform('ground', '连续纸艺大地', 'ground', [
      [-16, .35], [-12, .35], [-9.8, .52], [-7.2, .42], [-4.8, .62], [-2.2, .5],
      [1, .5], [4.4, .65], [7, .72], [10, .64], [13, .68], [16, .72],
      [19.5, .62], [22, .55], [25, .6], [29, .67], [32, .67],
    ]),
  ]);
  const bounds = Object.freeze({ minX: -12, maxX: 25, minY: -5, maxY: 8 });
  const spawn = Object.freeze({ x: 0, y: .5, z: 0 });

  function floorCandidates(x, halfWidth = 0, z = 0) {
    if (![x, halfWidth, z].every(Number.isFinite) || halfWidth < 0) return [];
    const result = [];
    for (const item of platforms) {
      if (z < item.backZ - EPSILON || z > item.frontZ + EPSILON) continue;
      let best = null;
      for (let i = 1; i < item.profile.length; i++) {
        const a = item.profile[i - 1], b = item.profile[i];
        const left = Math.max(x - halfWidth, a.x), right = Math.min(x + halfWidth, b.x);
        if (left > right + EPSILON) continue;
        const slope = (b.y - a.y) / (b.x - a.x);
        const supportX = slope >= 0 ? right : left;
        const y = a.y + (supportX - a.x) * slope;
        if (best && y < best.y - EPSILON) continue;
        const length = Math.hypot(slope, 1);
        best = { y, supportX, bottomY: item.bottomY ?? y - item.thickness,
          normal: { x: -slope / length, y: 1 / length }, platformId: item.id, oneWay: item.oneWay };
      }
      if (best) result.push(best);
    }
    return result.sort((a, b) => b.y - a.y);
  }

  return Object.freeze({
    kind: 'paper-stage', platforms, bounds, spawn,
    floorCandidates,
    platformAt: id => platforms.find(item => item.id === id) ?? null,
    surfaceY: (x, z = 0) => floorCandidates(x, 0, z)[0]?.y ?? null,
    groundBelow: (x, y, z = 0) => floorCandidates(x, 0, z).find(item => item.y <= y + EPSILON) ?? null,
  });
}
