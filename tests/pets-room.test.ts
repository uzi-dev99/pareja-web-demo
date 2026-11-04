/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pets room contract:
 *  - the room is dressed with the furniture SVGs under public/furniture/
 *  - the floor line sits where the cats walk, so no cat walks on the wall
 *  - each cat colour still points at its own sprite sheet
 *  - the demo keeps its own pet names and dialogues (no donor identities)
 *
 * ponytail: pure modules + source-level assertions, no renderer, no DOM.
 */

import { test, expect, describe } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FURNITURE, ROOM_FLOOR_TOP } from '../src/pets/room';
import { PET_BY_CAT } from '../src/pets/frames';
import { CAT_BOX_BOUNDS } from '../src/pets/drag';

const ROOT = join(import.meta.dir, '..');
const BOX_SRC = readFileSync(join(ROOT, 'src', 'components', 'CatTamagotchiBox.tsx'), 'utf8');

describe('room furniture', () => {
  test('every piece is an SVG that exists under public/furniture', () => {
    expect(FURNITURE.length).toBeGreaterThan(0);
    for (const f of FURNITURE) {
      expect(f.src.startsWith('/furniture/')).toBe(true);
      expect(f.src.endsWith('.svg')).toBe(true);
      expect(existsSync(join(ROOT, 'public', f.src))).toBe(true);
    }
  });

  test('the furniture covers the room: a seat, a rug, a lamp, a table and a plant', () => {
    const files = FURNITURE.map((f) => f.src);
    expect(files).toContain('/furniture/couch.svg');
    expect(files).toContain('/furniture/rug-oval.svg');
    expect(files).toContain('/furniture/table-lamp.svg');
    expect(files).toContain('/furniture/coffee-table.svg');
    expect(files.some((f) => f.includes('alocasia') || f.includes('fern'))).toBe(true);
  });
});

describe('room floor', () => {
  test('the floor starts at or above the cat walking band', () => {
    // cats wander between yMin and yMax of the box; the floor must cover the
    // whole band, so no cat ends up walking on the wall.
    expect(ROOM_FLOOR_TOP).toBeLessThanOrEqual(CAT_BOX_BOUNDS.yMin);
    expect(ROOM_FLOOR_TOP).toBeGreaterThan(0);
  });

  test('the component renders the floor at the shared constant', () => {
    expect(BOX_SRC).toContain('ROOM_FLOOR_TOP');
  });
});

describe('pet sprites', () => {
  test('each cat colour points at a sprite sheet that exists', () => {
    for (const pet of Object.values(PET_BY_CAT)) {
      expect(existsSync(join(ROOT, 'public', 'pets', pet, 'spritesheet.webp'))).toBe(true);
    }
  });
});

describe('the demo keeps its own pets', () => {
  const NAMES: Array<[string, string]> = [
    ['Nube', 'Tabby Gris Plateada'],
    ['Copo', 'Ragdoll Crema con Puntos Marrones'],
    ['Canela', 'Gato Atigrado Naranja'],
    ['Trufa', 'Panterita Negra'],
  ];

  test('every pet keeps its name and breed', () => {
    for (const [name, breed] of NAMES) {
      expect(BOX_SRC).toContain(`name: '${name}'`);
      expect(BOX_SRC).toContain(`breed: '${breed}'`);
    }
  });

  test('the dialogues are the demo ones', () => {
    for (const line of [
      'Soy Canela, el rey naranja de tus días',
      'Soy Trufa, la panterita elegante con ojos esmeralda',
      'La princesa de la casa, aquiii NUBE',
      'Aquii la Copo, estoy loquita pero amo a mis papis',
    ]) {
      expect(BOX_SRC).toContain(line);
    }
  });
});
