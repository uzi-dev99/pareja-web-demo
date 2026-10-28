# syntax=docker/dockerfile:1.7
ARG BUN_VERSION=1.4

# ── Stage 1: build frontend con Bun (Vite → dist/) ──────────────────
FROM oven/bun:${BUN_VERSION}-alpine AS frontend-build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ── Stage 2: backend runtime (Bun server, expone API en :3001) ──────
FROM oven/bun:${BUN_VERSION}-alpine AS backend
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY server/ ./server/
COPY src/ ./src/
EXPOSE 3001
CMD ["bun", "run", "server/index.ts"]

# ── Stage 3: frontend runtime (nginx sirve dist/ + uploads) ─────────
# nginx.conf viene del contexto "deploy" (multi-context build, ver compose)
FROM nginx:1.27-alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
# El worker de nginx corre como el usuario `nginx` y el contexto de build
# puede traer modos 600/700 (umask 077): sin esto los assets de public/
# salen 403 y habria que montarles permisos en runtime.
RUN chmod -R a+rX /usr/share/nginx/html
COPY --from=deploy /nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
