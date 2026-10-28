/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guard for the portfolio demo: no personal identity, copy or media from the
 * donor project may come back. Patterns are built from fragments so this file
 * never contains the literals it forbids.
 */

import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dir, '..');
const re = (...parts: string[]) => new RegExp(parts.join(''), 'i');

const tracked = Bun.spawnSync(['git', '-C', ROOT, 'ls-files', '-z']).stdout
  .toString()
  .split('\0')
  .filter(Boolean);
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const BINARY = /\.(png|jpe?g|webp|woff2?|ico|svg)$/i;
const textFiles = tracked.filter((p) => !BINARY.test(p) && p !== 'bun.lock');

// AC2 + AC3 + AC4: identity, old brand, personal dates, PIN, cat names, domain.
// The patterns are built from fragments, so no forbidden literal is ever
// written whole in this file: a pattern can never match its own source.
const PERSONAL: Array<[string, RegExp]> = [
  ['couple names', re('u', 'zi|ay', 'lu|mai', 'lov')],
  ['old brand', re('nuestra[-_ ]?his', 'toria|nh_edit_', 'token')],
  ['personal dates', re('27 de ma', 'yo|16 de sep', 'tiembre|2026-05-', '27')],
  ['old PIN', re('\\b16', '09\\b')],
  ['real cat names', re('\\b(li', 'o|ni', 'chi|pamplo', 'na|vale', 'ncia)\\b')],
  ['prod domain', re('wu', 'zi\\.uk')],
  // Same class, the formats that survived the first sweep (D1/D3).
  ['real date as day/month', re('\\b16', '\\s*[/-]\\s*09')],
  ['real date without spaces', re('\\b16', 'de')],
  ['real cat nicknames', re('\\b(pamp', 'lis|val', 'en)\\b')],
  ['real age', re('n[uú]mero ?21|21 a[nñ]os|cumple[aã]ños ?21')],
];

test('AC2/AC3/AC4: no tracked text file carries a personal token', () => {
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

// AC2 literal command: `git grep -IniE '<old brand>' -- ':!bun.lock'`.
// bun.lock is excluded on purpose: its integrity hash is a base64 blob
// that happens to spell the old brand's first three letters.
const BRAND = ['u', 'zi', '|ay', 'lu'].join('');
test('AC2: the old brand is gone from every tracked file (bun.lock excluded)', () => {
  const r = Bun.spawnSync(['git', '-C', ROOT, 'grep', '-IniE', BRAND, '--', ':!bun.lock']);
  expect(r.exitCode).toBe(1); // 1 = no match; 0 = hit, 128 = git failed
  expect(r.stdout.toString()).toBe('');
});

// AC3, same class as the old brand: the title of the donor project, split
// across two <span>s, so the per-line scan above could not see it. The
// fragments keep this file free of the literal it forbids.
const OLD_TITLE = re('nuestra[-_ ]?his', 'toria');

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

test('AC3: no tracked file carries the old title, split across tags or lines', () => {
  const hits: string[] = [];
  for (const file of textFiles) if (OLD_TITLE.test(flat(read(file)))) hits.push(file);
  expect(hits).toEqual([]);
});

test('AC1: package name is pareja-web-demo', () => {
  expect(JSON.parse(read('package.json')).name).toBe('pareja-web-demo');
});

test('AC5: content.ts only hot-links allowed stock hosts and docs/stock-photos.md lists every asset', () => {
  const hosts = new Set(read('src/data/content.ts').match(/https?:\/\/[^/'"`\s)]+/g));
  for (const h of hosts) expect(['https://images.unsplash.com', 'https://assets.mixkit.co']).toContain(h);
  const doc = read('docs/stock-photos.md');
  for (const needle of [
    'Unsplash License', 'Mixkit', 'CC0', 'OFL',
    'public/box/sanctuary-background.jpg', 'public/favicon.svg',
    'public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png',
    ...['canela', 'trufa', 'nube', 'copo'].map((c) => `public/pets/${c}/spritesheet.webp`),
  ]) expect(doc).toContain(needle);
});

// AC6: sha256 of the donor's personal binaries; a demo file must never equal one of them.
const DONOR_SHA256 = new Set([
  '3eb0d3bea4397a2d6c22a5878b662971e12a72f612ac568419bc336f6b3749eb',
  '416373f163a601f0ffccf4a5787fe32b93fd258c2da4a8745a28e4a42e0efcff',
  'a3101d0cb0f33af750b3021215ceb319f430f755d10c9299b074b7797a43a115',
  '035fa8773ba0b686ab3657c7a3e26ead9724201581a57ee232302a97523d45cb',
  '6c753a4ea87ab59ef2560c4577f9784f73fe4c40890d0bba0930dde2db3f80e6',
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
  for (const p of ['public/box/sanctuary-background.jpg', 'public/favicon.svg', 'public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png',
    ...['canela', 'trufa', 'nube', 'copo'].map((c) => `public/pets/${c}/spritesheet.webp`)]) {
    expect(tracked).toContain(p);
  }
});

// D7: the room floor starts at ~38% of the box height, so the cats that
// walk the 38-74% band (CAT_BOX_BOUNDS) always stand on the floor.
test('D7: the room floor starts at ~38% of the box height', async () => {
  const { data, info } = await sharp(join(ROOT, 'public/box/sanctuary-background.jpg'))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lum = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const x = Math.round(info.width * 0.327); // plain stretch of wall/floor, no furniture
  expect(lum(x, Math.round(info.height * 0.36))).toBeLessThan(68); // wall
  expect(lum(x, Math.round(info.height * 0.4))).toBeGreaterThan(72); // floor
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

// La inicial de la pareja es un monograma en el sello de cera (y puede
// repetirse en cualquier texto). En la demo es la de Alex y Sam; la del
// proyecto de origen no puede volver, en ningun orden ni con otro separador.
// Los patrones se arman por fragmentos: este archivo nunca contiene el
// literal que prohibe.
const DONOR_MONOGRAM = [
  re('[AU]', '\\s*[♥❤♡]\\s*', '[AU]'),
  re('\\b[AU]', '\\s*&\\s*', '[AU]\\b'),
];
const monograms = (s: string) =>
  [...s.matchAll(/[A-Za-z]\s*[♥❤♡]\s*[A-Za-z]/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());

test('el sello de cera lleva el monograma de la pareja de la demo', () => {
  // El sello es el elemento con el gradiente de cera; el monograma va dentro.
  const seal = read('src/components/SecretLetter.tsx').match(/radial-gradient\(circle at 35% 30%[\s\S]*?<\/span>/)?.[0] ?? '';
  expect(seal).not.toBe('');
  expect(monograms(seal)).toEqual([['A', '♥', 'S'].join(' ')]);
});

test('ningun archivo de texto trackeado lleva el monograma de la pareja de origen', () => {
  const hits: string[] = [];
  for (const file of textFiles) {
    read(file).split('\n').forEach((line, i) => {
      for (const rx of DONOR_MONOGRAM) if (rx.test(line)) hits.push(`${file}:${i + 1}`);
    });
  }
  expect(hits).toEqual([]);
});

// Un nombre de origen puede quedar en el NOMBRE de un archivo: `git grep`
// lee contenidos, no paths.
const DONOR_NAME = [
  re('u', 'zi|ay', 'lu|mail', 'ov'),
  re('\\b(li', 'o|ni', 'chi|pamplo', 'na|vale', 'ncia)\\b'),
];

test('ningun nombre de archivo trackeado lleva un nombre de la pareja o de los gatos de origen', () => {
  const hits = tracked.filter((p) => DONOR_NAME.some((rx) => rx.test(p)));
  expect(hits).toEqual([]);
});
