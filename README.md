# pareja-web-demo

A couples' memory site (timeline, photo gallery, secret letter, music player, a tiny cat room) built with React 19, Vite 6, Tailwind 4 and a Bun + SQLite API. This repository is a **portfolio demo**: all names, texts and art are generic (see [docs/stock-photos.md](docs/stock-photos.md)). UI copy is Spanish.

## Run it

    bun install
    EDIT_TOKEN=<pick-a-long-random-string> bun run dev:server   # API on :3001
    bun run dev                                                 # front on :3000

Without `EDIT_TOKEN` the API refuses every write (500, by design). The token is typed once in the UI (edit mode) and kept in `localStorage` as `pareja_edit_token`.

## Checks

    bun run lint    # tsc --noEmit
    bun run build   # vite build
    bun test        # Bun test runner

## Secret commands (type them anywhere on the page)

`pareja`, `demo`, `amor`, `beso`, `magia`, `cumple`, `abrazo`, `canela`, `trufa`, `nube`, `copo`, `michis`, `editar`. The secret collage asks for PIN `0909`.

## Layout

    src/          React app (components, hooks, pets, data/content.ts = demo content)
    server/       Bun.serve API (/api/health, /api/photos, /api/songs, /api/content), SQLite
    public/       fonts, PWA files, generated demo art
    scripts/      build-pwa-icons.mjs, build-demo-art.mjs (dev-time generators)
    tests/        bun:test suites (tests/demo-guard.test.ts keeps personal data out)
    docker-compose.yml, docker-compose.dev.yml, Dockerfile, deploy/   local container stack

## Docker (local)

    EDIT_TOKEN=<token> docker compose up -d --build

The frontend image is nginx listening on port 80 **inside the container**; the compose file publishes no host port, so add `ports: ["8080:80"]` to the `pareja-frontend` service if you want to open it from the host. nginx proxies `/api/` to the `pareja-backend` service on the compose network, so the app and the API are reached through that one port — no extra routing needed.

The dev stack (`docker-compose.dev.yml`) names its backend `pareja-dev-backend` on port 3002, so its frontend needs that upstream instead of the one in `deploy/nginx.conf`.
