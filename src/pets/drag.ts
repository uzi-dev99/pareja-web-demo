// Cat drag math — pure module, no React imports.
// ponytail: pointer event handlers in CatTamagotchiBox stay a thin shell over
// the position math below. Keep the test surface here so it can be exercised
// without booting jsdom or a renderer.

// Bounds inside the Tamagotchi box (percentages of box width/height).
// Matches the existing autonomous wander range in CatTamagotchiBox.tsx.
export const CAT_BOX_BOUNDS = {
  xMin: 12,
  xMax: 84,
  yMin: 38,
  yMax: 74,
} as const;

// Clamps a (x, y) position (in percent) into the cat box bounds.
export function clampCatPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(CAT_BOX_BOUNDS.xMin, Math.min(CAT_BOX_BOUNDS.xMax, x)),
    y: Math.max(CAT_BOX_BOUNDS.yMin, Math.min(CAT_BOX_BOUNDS.yMax, y)),
  };
}

// Converts a pixel-space drag delta into a percentage of the box.
// ponytail: zero-size boxes return 0 rather than NaN/Infinity so the caller
// can still pass the result downstream without crashing.
export function deltaToPercent(
  dxPx: number,
  dyPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
): { dxPct: number; dyPct: number } {
  return {
    dxPct: boxWidthPx > 0 ? (dxPx / boxWidthPx) * 100 : 0,
    dyPct: boxHeightPx > 0 ? (dyPx / boxHeightPx) * 100 : 0,
  };
}

// Composes the two operations: take the current (x, y) percentage, apply the
// pixel-space drag delta, then clamp to bounds.
export function applyDragDelta(
  xPct: number,
  yPct: number,
  dxPx: number,
  dyPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
): { x: number; y: number } {
  const { dxPct, dyPct } = deltaToPercent(dxPx, dyPx, boxWidthPx, boxHeightPx);
  return clampCatPosition(xPct + dxPct, yPct + dyPct);
}
