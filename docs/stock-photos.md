# Assets and licences

Nothing here comes from a real person, a real photo or a private library.

## Vendored stock (in the repo, served from our own origin)

VK-547: the stock used to be hot-linked from three third-party hosts
(Unsplash, Wikimedia Commons, Mux). A dead CDN link was a real bug
(VK-524: the hover card drew a broken seed url), so every file now
lives in `public/seed/` and the demo depends on nothing outside its own
origin. `scripts/vendor-seed-media.mjs` reproduces the copies (the
committed files are the source of truth).

| What | Where | Licence | Source |
|---|---|---|---|
| 24 photos (gallery, timeline and secret collage) | `public/seed/photos/*.jpg` | Unsplash License — free to use and to redistribute, attribution not required | per-file list in `docs/seed-media-sources.md` |
| 1 video (cat + laser pointer, 480p VP9 webm) | `public/seed/video/cat-laser-480p.webm` | CC BY-SA 3.0 — Clément Bucco-Lechat, "Cat playing with a laser pointer" | https://commons.wikimedia.org/wiki/File:Cat_playing_with_a_laser_pointer.webm |
| 1 poster frame of that video | `public/seed/video/cat-laser-480p.jpg` | CC BY-SA 3.0 (same work) | https://commons.wikimedia.org/wiki/File:Cat_playing_with_a_laser_pointer.webm |
| hero background (Mux HLS stream + poster) | NOT vendored: hot-linked in `src/components/Hero.tsx` | licence unknown, not made for this demo; the one documented hot-link exception | `docs/seed-media-sources.md` |

Unsplash License: https://unsplash.com/license
CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0

The CC BY-SA 3.0 files keep that licence here (share alike) and the
attribution above stays with them.

## The owner's art, used with permission

The cat sprites and the furniture of the pet room come from the owner's own
project and are used in the demo with their permission (PWD-523). They are
**not** CC0 and they are **not** generated here: the demo only ships them, and
nothing in `scripts/` may rewrite them.

| Path | What |
|---|---|
| `public/pets/canela/spritesheet.webp` | cat sheet, 1536×1872, 8×9 frames of 192×208 |
| `public/pets/trufa/spritesheet.webp` | cat sheet |
| `public/pets/nube/spritesheet.webp` | cat sheet |
| `public/pets/copo/spritesheet.webp` | cat sheet |
| `public/furniture/alocasia.svg` | plant |
| `public/furniture/fern.svg` | plant |
| `public/furniture/couch.svg` | couch |
| `public/furniture/table-lamp.svg` | lamp |
| `public/furniture/rug-oval.svg` | rug |
| `public/furniture/bed.svg` | bed |
| `public/furniture/coffee-table.svg` | coffee table |
| `public/furniture/heart-stool.svg` | stool |

## Original generated art (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/)

| Path | What |
|---|---|
| `public/favicon.svg` | heart favicon |
| `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` | PWA icons rasterised from the favicon by `scripts/build-pwa-icons.mjs` |

## Fonts (SIL Open Font License 1.1, OFL)

`public/fonts/**`: Outfit, Cormorant Garamond and Caveat (woff2), unmodified.

## Not included

No real photos, songs, database or uploads; the API starts with an empty database and the seed from `src/data/content.ts`.
