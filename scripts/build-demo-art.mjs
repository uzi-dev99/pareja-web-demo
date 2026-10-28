/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dev-time generator for the demo's original art (CC0 1.0, see docs/stock-photos.md):
 * the 4 pet spritesheets and the room backdrop. Pure code, deterministic, no network,
 * no API key. Re-run it and commit the output; never wire it into `bun run build`.
 *
 * Usage: `bun scripts/build-demo-art.mjs`
 */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// Grid contract of src/pets/frames.ts (asserted by tests/petdex-spritesheets.test.ts).
const FW = 192, FH = 208, COLS = 8;
// [pose, frames] per row; the counts mirror FRAMES_PER_ROW (rows 2 and 7 are unused: idle copies).
const ROWS = [['idle', 6], ['walk', 8], ['idle', 8], ['play', 4], ['jump', 5], ['box', 8], ['eat', 6], ['idle', 6], ['pet', 6]];

const CATS = {
  canela: { fur: '#f39c4a', belly: '#ffd9a8', stripe: '#d9772a', ear: '#ffb3a7', eye: '#2b1d14' },
  trufa: { fur: '#2e2838', belly: '#453d54', stripe: '#3b3348', ear: '#8a5a73', eye: '#ffd166' },
  nube: { fur: '#a5adc0', belly: '#d6dbe6', stripe: '#8991a8', ear: '#f0b4c4', eye: '#1d2433' },
  copo: { fur: '#f6f2f8', belly: '#ffffff', stripe: '#e0d8ea', ear: '#ffc2d1', eye: '#2a2438' },
};

const f = (n) => n.toFixed(1);

// One 192x208 frame, cat facing right, feet on y=190.
function cat(c, pose, i, n) {
  const t = i / n, a = t * Math.PI * 2;
  let dy = 0, hx = 0, hy = 0, tail = Math.sin(a) * 14, sy = 1 + Math.sin(a) * 0.025, closed = false, extra = '';
  const leg = [0, 0, 0, 0]; // lift per leg: back-far, back-near, front-far, front-near
  const sw = [0, 0, 0, 0];
  if (pose === 'walk') { dy = -Math.abs(Math.sin(a * 2)) * 3; [0, 1, 2, 3].forEach((k) => { const p = a + (k % 2 ? Math.PI : 0) + (k > 1 ? 0.6 : 0); sw[k] = Math.sin(p) * 11; leg[k] = Math.max(0, Math.cos(p)) * 6; }); }
  if (pose === 'jump') { dy = -Math.sin(t * Math.PI) * 52; leg.fill(10); tail = -20; }
  if (pose === 'play') { sw[3] = Math.sin(a * 2) * 16; leg[3] = 14 + Math.sin(a * 2) * 6; hx = 4; extra = `<circle cx="${f(168 + Math.sin(a) * 8)}" cy="180" r="9" fill="#ff85a1"/><path d="M160 180h16M168 172v16" stroke="#fbb1bd" stroke-width="2"/>`; }
  if (pose === 'eat') { hy = 30; hx = 8; sy = 1; extra = `<path d="M146 190h40l-6-14h-28z" fill="#8f6bd1"/><ellipse cx="166" cy="176" rx="14" ry="3" fill="#ffd166"/>`; }
  if (pose === 'pet') { closed = true; hy = 4; extra = [0, 1, 2].map((k) => { const u = (t + k / 3) % 1; return `<path transform="translate(${f(150 + k * 12)} ${f(90 - u * 50)}) scale(${f(0.5 + (1 - u) * 0.3)})" fill="#ff85a1" opacity="${f(1 - u)}" d="M0 10C-14-2-8-14 0-6 8-14 14-2 0 10z"/>`; }).join(''); }
  if (pose === 'box') {
    const bob = Math.sin(a) * 3;
    return `<g>${head(c, 128, 128 + bob, n === 8 && i === 5)}<path d="M36 150h120l-8 40H44z" fill="#c8925a"/><path d="M36 150h120v8H36z" fill="#dba974"/><path d="M92 158h8v32h-8z" fill="#b07d48" opacity=".5"/></g>`;
  }
  const L = (x, k, shade) => `<rect x="${f(x + sw[k])}" y="${f(158 + dy)}" width="13" height="${f(32 - leg[k])}" rx="6" fill="${shade ? c.stripe : c.fur}"/>`;
  return `<g>
  <g transform="rotate(${f(tail)} 58 150)"><path d="M58 150C30 150 26 118 40 104" fill="none" stroke="${c.fur}" stroke-opacity="1" stroke-width="13" stroke-linecap="round"/></g>
  ${L(62, 0, true)}${L(110, 2, true)}
  <ellipse cx="92" cy="${f(146 + dy)}" rx="42" ry="${f(26 * sy)}" fill="${c.fur}"/>
  <ellipse cx="96" cy="${f(156 + dy)}" rx="30" ry="12" fill="${c.belly}"/>
  <path d="M74 ${f(124 + dy)}q4 10 0 18M92 ${f(121 + dy)}q4 12 0 22M110 ${f(124 + dy)}q4 10 0 18" fill="none" stroke="${c.stripe}" stroke-width="5" stroke-linecap="round"/>
  ${L(76, 1, false)}${L(124, 3, false)}
  ${head(c, 130 + hx, 122 + dy + hy, closed)}
  ${extra}</g>`;
}

function head(c, x, y, closed) {
  const eye = closed
    ? `<path d="M${x + 4} ${y - 2}q6-7 12 0" fill="none" stroke="${c.eye}" stroke-width="3" stroke-linecap="round"/>`
    : `<ellipse cx="${x + 10}" cy="${y - 2}" rx="4" ry="5.5" fill="${c.eye}"/><circle cx="${x + 11.5}" cy="${y - 4}" r="1.6" fill="#fff"/>`;
  return `<g><path d="M${x - 20} ${y - 14}l4-26 20 14zM${x + 6} ${y - 24}l20-14 4 26z" fill="${c.fur}"/>
  <path d="M${x - 15} ${y - 17}l3-15 12 8zM${x + 8} ${y - 24}l12-8 3 15z" fill="${c.ear}"/>
  <circle cx="${x}" cy="${y}" r="25" fill="${c.fur}"/><ellipse cx="${x + 10}" cy="${y + 9}" rx="12" ry="9" fill="${c.belly}"/>
  ${eye}<ellipse cx="${x + 21}" cy="${y + 4}" rx="3.5" ry="2.5" fill="#e0707f"/>
  <path d="M${x + 22} ${y + 8}q-4 5-9 3M${x + 22} ${y + 8}q2 5 8 3" fill="none" stroke="${c.eye}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M${x + 24} ${y + 3}l16-4M${x + 24} ${y + 6}l17 2" stroke="${c.stripe}" stroke-width="1.4"/></g>`;
}

function sheet(name) {
  const c = CATS[name];
  const frames = ROWS.flatMap(([pose, n], r) => Array.from({ length: n }, (_, i) =>
    `<g transform="translate(${(i % COLS) * FW} ${r * FH})"><g transform="translate(0 0)" stroke="#1a1020" stroke-opacity=".35" stroke-width="2.5" stroke-linejoin="round">${cat(c, pose, i, n)}</g></g>`));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * FW}" height="${ROWS.length * FH}">${frames.join('')}</svg>`;
}

// Room backdrop 2752x1536 (viewBox 1376x768): cats walk on the floor band y 38%..74% (CAT_BOX_BOUNDS).
// The floor line sits at 38% of the viewBox height (292) so the whole band the cats walk on is floor.
function room() {
  const plank = Array.from({ length: 14 }, (_, k) => `<path d="M0 ${292 + k * 30}H1376" stroke="#2a1630" stroke-opacity=".35" stroke-width="2"/>`).join('');
  const stars = Array.from({ length: 28 }, (_, k) => `<circle cx="${1010 + ((k * 53) % 250)}" cy="${70 + ((k * 37) % 190)}" r="${1 + (k % 3) * 0.7}" fill="#fff6d6"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2752" height="1536" viewBox="0 0 1376 768">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2038"/><stop offset="1" stop-color="#4e2c4a"/></linearGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4560"/><stop offset="1" stop-color="#4a2c47"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter></defs>
<rect width="1376" height="292" fill="url(#w)"/>${Array.from({ length: 23 }, (_, k) => `<rect x="${k * 60}" width="30" height="292" fill="#fff" opacity=".035"/>`).join('')}
<rect y="292" width="1376" height="476" fill="url(#fl)"/>${plank}<rect y="284" width="1376" height="12" fill="#2a1630"/>
<g><rect x="980" y="30" width="290" height="250" rx="10" fill="#2a1630"/><rect x="994" y="44" width="262" height="222" fill="#14183a"/>${stars}<circle cx="1190" cy="110" r="26" fill="#fff6d6"/><path d="M1125 44v222M994 155H1256" stroke="#2a1630" stroke-width="8"/></g>
<g><rect x="90" y="90" width="150" height="110" rx="6" fill="#c8925a"/><rect x="102" y="102" width="126" height="86" fill="#ffe5ec"/><path d="M110 180l34-40 24 24 22-30 30 46z" fill="#ff85a1"/><circle cx="196" cy="128" r="12" fill="#fde68a"/></g>
<g><rect x="300" y="60" width="130" height="14" rx="4" fill="#c8925a"/><rect x="316" y="30" width="22" height="30" rx="3" fill="#8f6bd1"/><rect x="344" y="38" width="18" height="22" rx="3" fill="#ff85a1"/><rect x="368" y="26" width="24" height="34" rx="3" fill="#fde68a"/></g>
<ellipse cx="640" cy="560" rx="340" ry="110" fill="#8f3b63"/><ellipse cx="640" cy="560" rx="270" ry="80" fill="none" stroke="#ffe5ec" stroke-opacity=".5" stroke-width="6" stroke-dasharray="14 12"/>
<g><rect x="60" y="250" width="330" height="120" rx="26" fill="#6f4ab0"/><rect x="40" y="290" width="60" height="100" rx="22" fill="#5d3b9a"/><rect x="350" y="290" width="60" height="100" rx="22" fill="#5d3b9a"/><rect x="100" y="270" width="250" height="70" rx="16" fill="#8f6bd1"/></g>
<g><rect x="760" y="300" width="190" height="80" rx="30" fill="#f3d8e4"/><rect x="760" y="270" width="190" height="60" rx="22" fill="#ffb3c7"/></g>
<g><rect x="1130" y="290" width="12" height="90" fill="#c8925a"/><path d="M1090 290h92l-14-60h-64z" fill="#fde68a"/><circle cx="1136" cy="290" r="180" fill="url(#g)"/></g>
<g><path d="M1260 380h70l-10 70h-50z" fill="#b05a3a"/><path d="M1295 380c-40-40-50-90-10-120 6 40 12 70 10 120zM1295 380c40-30 60-80 30-130-14 40-26 80-30 130z" fill="#3f9b6a"/></g>
<rect width="1376" height="768" filter="url(#n)"/></svg>`;
}

mkdirSync(resolve(ROOT, 'public', 'box'), { recursive: true });
for (const name of Object.keys(CATS)) {
  mkdirSync(resolve(ROOT, 'public', 'pets', name), { recursive: true });
  await sharp(Buffer.from(sheet(name))).webp({ lossless: true }).toFile(resolve(ROOT, 'public', 'pets', name, 'spritesheet.webp'));
  console.log(`wrote public/pets/${name}/spritesheet.webp`);
}
await sharp(Buffer.from(room())).jpeg({ quality: 90 }).toFile(resolve(ROOT, 'public', 'box', 'sanctuary-background.jpg'));
console.log('wrote public/box/sanctuary-background.jpg');
