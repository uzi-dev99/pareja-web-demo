# Assets and licences

Nothing here comes from a real person, a real photo or a private library.

## Hot-linked stock (not stored in the repo)

| What | Host | Licence | Where used |
|---|---|---|---|
| 49 photos (16 gallery, 27 timeline, 6 collage) | https://images.unsplash.com | Unsplash License (https://unsplash.com/license) | URLs in `src/data/content.ts` |
| 1 video (cat + laser pointer, 480p webm, poster jpg) | https://upload.wikimedia.org | CC BY-SA 3.0 — Clément Bucco-Lechat, "Cat playing with a laser pointer" (Wikimedia Commons) | URLs in `src/data/content.ts` |

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
| `public/furniture/coffee-table.svg` | table |
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
