// Pets room dressing — pure module, no React imports.
// ponytail: no state, just where the floor starts and which furniture SVG
// sits where. The component maps this list to <img> tags and nothing else.

/** % of the room height where the floor starts. The cats walk from here down. */
export const ROOM_FLOOR_TOP = 38;

export interface FurnitureSpec {
  src: string;
  /** Tailwind classes: position, size and depth of the piece. */
  className: string;
}

// ponytail: order = depth. Back layer (plants against the wall) first, then
// the big pieces, then what lies on the floor in front of them. The pieces
// are decoration, so the component renders them with an empty alt.
export const FURNITURE: FurnitureSpec[] = [
  // back — plants framing the room
  { src: '/furniture/alocasia.svg', className: 'right-[13%] bottom-[32%] w-[22%] sm:w-[13%]' },
  { src: '/furniture/fern.svg', className: 'left-[22%] bottom-[32%] w-[18%] sm:w-[10%]' },
  // mid — the couch against the wall and the lamp that lights it
  { src: '/furniture/couch.svg', className: 'left-[3%] bottom-[42%] w-[40%] sm:w-[21%]' },
  { src: '/furniture/table-lamp.svg', className: 'right-[2%] bottom-[39%] w-[8%] sm:w-[4%]' },
  // floor — the rug the cats gather on, the bed, the table and the stool
  { src: '/furniture/rug-oval.svg', className: 'left-1/2 -translate-x-1/2 bottom-[11%] w-[86%] sm:w-[56%] h-[21%] opacity-95' },
  { src: '/furniture/bed.svg', className: 'left-[6%] bottom-[8%] w-[26%] sm:w-[16%] h-[21%]' },
  { src: '/furniture/coffee-table.svg', className: 'right-[16%] bottom-[7%] w-[16%] sm:w-[8%]' },
  { src: '/furniture/heart-stool.svg', className: 'right-[3%] bottom-[4%] w-[14%] sm:w-[8%]' },
];
