/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guard for the portfolio demo: no personal identity, copy or media from the
 * donor project may come back. The forbidden patterns are private and are
 * loaded at run time, so this file reveals nothing about them.
 */

import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');

const tracked = Bun.spawnSync(['git', '-C', ROOT, 'ls-files', '-z']).stdout
  .toString()
  .split('\0')
  .filter(Boolean);
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
// ponytail: the media the demo ships (the vendored seed photos, the
// webm and the HLS segments of VK-547) are binary: scanning their bytes
// as text finds random words in the noise.
const BINARY = /\.(png|jpe?g|webp|woff2?|ico|svg|webm|mp4|m4s)$/i;
const textFiles = tracked.filter((p) => !BINARY.test(p) && p !== 'bun.lock');

// AC2 + AC3 + AC4: the personal tokens (names, old brand and title, dates,
// PIN, pet names, domain, age) never live in this public repo, not even as
// fragments. They come from the private list DEMO_GUARD_PATTERNS (CI secret)
// or the file DEMO_GUARD_FILE (default ~/.config/pareja-web-demo/demo-guard.tsv),
// one "label<TAB>regex" per line. CI without the list fails; a local run
// without it skips these two tests.
const guardFile = process.env.DEMO_GUARD_FILE ?? join(homedir(), '.config/pareja-web-demo/demo-guard.tsv');
const guardText = process.env.DEMO_GUARD_PATTERNS ?? (existsSync(guardFile) ? readFileSync(guardFile, 'utf8') : '');
const PERSONAL: Array<[string, RegExp]> = guardText
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [label, src] = l.split('\t');
    return [label, new RegExp(src, 'i')] as [string, RegExp];
  });
const guardTest = PERSONAL.length || process.env.CI ? test : test.skip;

test('AC2: the private pattern list is loaded (fails closed in CI)', () => {
  if (!PERSONAL.length && !process.env.CI) return;
  expect(PERSONAL.length).toBeGreaterThan(0);
});

guardTest('AC2/AC3/AC4: no tracked text file carries a personal token', () => {
  // Fail closed: an empty file list would scan nothing and pass in green.
  expect(textFiles.length).toBeGreaterThan(0);
  const hits: string[] = [];
  for (const file of textFiles) {
    read(file).split('\n').forEach((line, i) => {
      for (const [label, rx] of PERSONAL) if (rx.test(line)) hits.push(`${file}:${i + 1} [${label}]`);
    });
  }
  expect(hits).toEqual([]);
});

// ponytail: flatten JSX/HTML to its text so words split across tags, spans
// or lines read as one string. Tags go away without a space (a name split
// by a tag rejoins), expressions become a space.
const flat = (s: string) => {
  let t = s;
  for (let i = 0; i < 5; i++) {
    const next = t.replace(/\{[^{}]*\}/g, ' ');
    if (next === t) break;
    t = next;
  }
  return t.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const HERO_H1 = read('src/components/Hero.tsx').match(/<(?:motion\.)?h1[\s\S]*?<\/(?:motion\.)?h1>/)?.[0] ?? '';
const SITE_TITLE = read('src/data/content.ts').match(/siteTitle:\s*'([^']+)'/)?.[1] ?? '';

test('AC3: the hero h1 renders the site title, even split across JSX spans', () => {
  expect(SITE_TITLE.length).toBeGreaterThan(0);
  expect(flat(HERO_H1)).toBe(SITE_TITLE);
});

// AC3: the same list over each file flattened, so a token split across
// tags, spans or lines (the old title in two <span>s) is still caught.
guardTest('AC3: no tracked file carries a personal token split across tags or lines', () => {
  const hits: string[] = [];
  for (const file of textFiles) {
    const text = flat(read(file));
    for (const [label, rx] of PERSONAL) if (rx.test(text)) hits.push(`${file} [${label}]`);
  }
  expect(hits).toEqual([]);
});

test('AC1: package name is pareja-web-demo', () => {
  expect(JSON.parse(read('package.json')).name).toBe('pareja-web-demo');
});

test('AC5: content.ts hot-links no host and docs/stock-photos.md lists every asset', () => {
  // VK-547: the seed media is vendored in public/seed/. A third-party
  // host in content.ts is a CDN the demo cannot control (VK-524: a dead
  // seed url drew a broken hover card).
  const hosts = read('src/data/content.ts').match(/https?:\/\/[^/'"`\s)]+/g) ?? [];
  expect(hosts).toEqual([]);
  const doc = read('docs/stock-photos.md');
  for (const needle of [
    'Unsplash License', 'CC0', 'OFL', 'CC BY-SA 3.0',
    'public/seed/photos', 'public/seed/video/cat-laser-480p.webm',
    'public/favicon.svg',
    'public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png',
    ...['canela', 'trufa', 'nube', 'copo'].map((c) => `public/pets/${c}/spritesheet.webp`),
    ...['alocasia', 'bed', 'coffee-table', 'couch', 'fern', 'heart-stool', 'rug-oval', 'table-lamp']
      .map((f) => `public/furniture/${f}.svg`),
  ]) expect(doc).toContain(needle);
});

// AC6: sha256 of the donor's personal binaries; a demo file must never equal one of them.
// ponytail: the four pet sheets are NOT in this list: the owner asked for
// them (PWD-523) and the demo ships them with their permission (the
// re-encoded copies in public/pets are the owner's art, not a leak).
const DONOR_SHA256 = new Set([
  '3eb0d3bea4397a2d6c22a5878b662971e12a72f612ac568419bc336f6b3749eb',
  'b7a2ffbf255b04ad71c1864c0e8fc1352a90aefb7b6c2394634b8145b824907d',
  '42dfa01ed3cd45bcbf5fd95c044ca399bf851915eaa1372ca0696428547f1339',
  'c36fe0d48875d572f2af729047d6c5e18fa2a28d40eb803030275c5214b29d87',
  '4655ef43d4e997bcf530f4e3c39520920723eec8dc2ae1d63194f238c5cb7370',
]);

test('AC6: no tracked binary is byte-identical to a donor personal asset', () => {
  const same = tracked
    .filter((p) => BINARY.test(p) && !p.startsWith('public/fonts/'))
    .filter((p) => DONOR_SHA256.has(createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex')));
  expect(same).toEqual([]);
});

test('AC6: the demo art exists at the paths the app loads', () => {
  for (const p of ['public/favicon.svg', 'public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png',
    ...['canela', 'trufa', 'nube', 'copo'].map((c) => `public/pets/${c}/spritesheet.webp`),
    ...['alocasia', 'bed', 'coffee-table', 'couch', 'fern', 'heart-stool', 'rug-oval', 'table-lamp']
      .map((f) => `public/furniture/${f}.svg`)]) {
    expect(tracked).toContain(p);
  }
});

test('AC7: no database, no uploads, only demo volumes in compose', () => {
  expect(tracked.filter((p) => /\.db(-journal)?$/.test(p) || p.startsWith('uploads/'))).toEqual([]);
  for (const file of ['docker-compose.yml', 'docker-compose.dev.yml']) {
    const volumes = read(file).match(/^\s+-\s+(\S+):\/(data|uploads)\b/gm) ?? [];
    expect(volumes.length).toBe(3); // data, uploads, uploads:ro
    for (const v of volumes) expect(v).toMatch(/pareja(-dev)?_(data|uploads)/);
  }
});

test('AC8: API surface kept, EDIT_TOKEN only from the environment, no committed secret', () => {
  const server = read('server/index.ts');
  for (const r of ['health', 'photos', 'songs', 'content']) expect(server).toContain(`'/api/${r}'`);
  expect(server).toContain('process.env.EDIT_TOKEN');
  expect(tracked.filter((p) => /(^|\/)\.env(\..+)?$/.test(p))).toEqual(['.env.example']);
  expect(read('.env.example')).toMatch(/^EDIT_TOKEN=\s*$/m);
});

test('AC10: the document language is Spanish', () => {
  expect(read('index.html').match(/<html[^>]*lang="es"/g)?.length).toBe(1);
});

// El deploy en docker tiene que servir la demo entera por un solo puerto: el
// nginx del front proxea /api/ al backend. Sin eso, cada fetch('/api/...') del
// SPA recibe el index.html del fallback y la demo no muestra datos.
test('deploy: el nginx del front proxea /api/ al backend', () => {
  const nginx = read('deploy/nginx.conf');
  expect(nginx).toMatch(/location\s+\/api\//);
  // resolver + variable: nginx resuelve el backend en cada request y no muere
  // al arrancar si todavia no esta up.
  expect(nginx).toMatch(/resolver\s+127\.0\.0\.11/);
  expect(nginx).toMatch(/proxy_pass\s+http:\/\/\$api_upstream/);
});

// El worker de nginx corre como el usuario `nginx`: si el contexto de build
// trae modos 600/700 (el worktree de este host se crea con umask 077), los
// assets de public/ salen 403 sin nada montado en runtime.
test('deploy: la imagen deja legibles los assets que sirve nginx', () => {
  expect(read('Dockerfile')).toMatch(/chmod -R a\+rX \/usr\/share\/nginx\/html/);
});

// La inicial de la pareja es un monograma en el sello de cera. En la demo es
// la de Alex y Sam; la del proyecto de origen está en la lista privada
// (etiqueta "donor monogram") y la cubre el escaneo AC2/AC3/AC4.
const monograms = (s: string) =>
  [...s.matchAll(/[A-Za-z]\s*[♥❤♡]\s*[A-Za-z]/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());

test('el sello de cera lleva el monograma de la pareja de la demo', () => {
  // El sello es el elemento con el gradiente de cera; el monograma va dentro.
  const seal = read('src/components/SecretLetter.tsx').match(/radial-gradient\(circle at 35% 30%[\s\S]*?<\/span>/)?.[0] ?? '';
  expect(seal).not.toBe('');
  expect(monograms(seal)).toEqual([['A', '♥', 'S'].join(' ')]);
});

// Un nombre de origen puede quedar en el NOMBRE de un archivo: `git grep`
// lee contenidos, no paths.
guardTest('ningun nombre de archivo trackeado lleva un token personal', () => {
  const hits = tracked.filter((p) => PERSONAL.some(([, rx]) => rx.test(p)));
  expect(hits).toEqual([]);
});
