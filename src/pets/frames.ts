// Petdex sprite grid — pure module, no React imports.
// ponytail: this file has zero runtime dependencies so the tests can exercise
// the mapping logic without booting jsdom or a renderer.

export const FRAME_W = 192;
export const FRAME_H = 208;
export const SHEET_W = 1536;
export const SHEET_H = 1872;
export const COLS = 8;
export const ROWS = 9;
export const DISPLAY_SCALE = 0.45;

// subset of CatData['state'] we animate. See CatTamagotchiBox.tsx for the full
// union. Keeping this list narrow keeps the row map honest.
export type PetdexState =
  | 'idle'
  | 'walking'
  | 'playing'
  | 'jumping'
  | 'spinning'
  | 'sleeping'
  | 'in_box'
  | 'eating'
  | 'petted';

// Same key set as `CatType` in CatTamagotchiBox.tsx, kept narrow here so the
// mapping from old names → new pet ids stays honest.
export type PetdexCatColor = 'orange' | 'black' | 'grey' | 'white';

// Pet slug under public/pets/ for each colour.
export const PET_BY_CAT: Record<PetdexCatColor, string> = {
  orange: 'canela',
  black: 'trufa',
  grey: 'nube',
  white: 'copo',
};

// Row index in the spritesheet for each animated state.
// Row 1 = walk-right; the left direction is achieved with scaleX(-1) so we
// don't need a separate row.
export const STATE_ROW: Record<PetdexState, number> = {
  idle: 0,
  walking: 1,
  playing: 3,
  jumping: 4,
  spinning: 4,
  // ponytail: row 5 is "failed / lie down" in the Petdex grid — using it for
  // sleeping made the cats look sad/defeated. Point sleeping at row 0 (idle
  // / respiración en reposo) and let the floating Zzz overlay communicate
  // the sleep. in_box keeps row 5 since "hidden inside a cardboard box"
  // still benefits from the lie-down pose.
  sleeping: 0,
  in_box: 5,
  eating: 6,
  petted: 8,
};

// Frame counts per row, per the canonical grid.
export const FRAMES_PER_ROW: Record<number, number> = {
  0: 6,
  1: 8,
  3: 4,
  4: 5,
  5: 8,
  6: 6,
  8: 6,
};

const ANIMATED_STATES: ReadonlySet<PetdexState> = new Set<PetdexState>([
  'idle', 'walking', 'playing', 'jumping', 'spinning',
  'sleeping', 'in_box', 'eating', 'petted',
]);

// Narrows an arbitrary state string to one we can animate. Unknown values
// degrade to `idle` so the renderer never produces a broken frame.
export function resolvePetdexState(state: string): PetdexState {
  return (ANIMATED_STATES.has(state as PetdexState) ? state : 'idle') as PetdexState;
}

// Raw pixel offsets for the given state + frame index.
// The caller scales these by display scale before applying as background-position.
export function framePosition(
  state: PetdexState,
  frameIndex: number,
): { x: number; y: number } {
  const row = STATE_ROW[state];
  return {
    x: -frameIndex * FRAME_W,
    y: -row * FRAME_H,
  };
}

// Composes the full inline style for a PetdexCatAvatar <div>. Pure so the
// component stays a thin shell over useState + useEffect + JSX.
export interface AvatarStyleArgs {
  catType: PetdexCatColor;
  state: string;
  direction: 1 | -1;
  frame: number;
}

export function computeAvatarStyle(args: AvatarStyleArgs): {
  width: string;
  height: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  transform: string;
} {
  const resolved = resolvePetdexState(args.state);
  const { x, y } = framePosition(resolved, args.frame);

  return {
    width: `${Math.round(FRAME_W * DISPLAY_SCALE)}px`,
    height: `${Math.round(FRAME_H * DISPLAY_SCALE)}px`,
    backgroundImage: `url(/pets/${PET_BY_CAT[args.catType]}/spritesheet.webp)`,
    backgroundSize: `${Math.round(SHEET_W * DISPLAY_SCALE)}px ${Math.round(SHEET_H * DISPLAY_SCALE)}px`,
    backgroundPosition: `${Math.round(x * DISPLAY_SCALE)}px ${Math.round(y * DISPLAY_SCALE)}px`,
    transform: `scaleX(${args.direction})`,
  };
}
