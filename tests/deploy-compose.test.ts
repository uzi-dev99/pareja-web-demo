/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ponytail: guard de los nombres reales de recursos.
 *
 * El nombre real de un volumen de compose es `<name: del proyecto>_<clave del
 * volumen>`. Si cambia cualquiera de los dos, compose crea un volumen NUEVO y
 * vacío: la data de prod queda huérfana y nadie se entera hasta que falta una
 * foto. Este test falla antes de que eso pase.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..');

type ComposeService = {
  container_name?: string;
  image?: string;
  environment?: Record<string, string>;
  healthcheck?: { test?: string[] };
  logging?: { driver?: string };
  build?: {
    context?: string;
    dockerfile?: string;
    additional_contexts?: Record<string, string>;
  };
};

type ComposeConfig = {
  name?: string;
  services: Record<string, ComposeService>;
  volumes: Record<string, { name?: string }>;
  networks: Record<string, { name?: string; external?: boolean }>;
};

/** ponytail: render del compose (no crea nada: `config` no toca el daemon). */
async function render(composeFile: string): Promise<ComposeConfig> {
  const proc = Bun.spawn(['docker', 'compose', '-f', composeFile, 'config', '--format', 'json'], {
    cwd: REPO_ROOT,
    env: { ...process.env, EDIT_TOKEN: 'test-token' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`docker compose config -f ${composeFile} falló (${code}): ${stderr}`);
  }
  return JSON.parse(stdout) as ComposeConfig;
}

// ponytail: sin docker (o con un compose viejo) no hay nada que verificar; que salte, no que rompa la suite.
const hasCompose = (() => {
  if (!Bun.which('docker')) return false;
  // `config --format json` existe desde compose 2.23.
  const out = Bun.spawnSync(['docker', 'compose', 'version', '--short']).stdout.toString();
  const m = out.match(/(\d+)\.(\d+)/);
  return !!m && (Number(m[1]) > 2 || (Number(m[1]) === 2 && Number(m[2]) >= 23));
})();

test.skipIf(!hasCompose)('el compose de prod conserva volumen, red, contenedores, imágenes y puerto', async () => {
  const c = await render('docker-compose.yml');

  expect(c.name).toBe('pareja-web-demo');
  expect(c.volumes['pareja_data']?.name).toBe('pareja-web-demo_pareja_data');
  expect(c.volumes['pareja_uploads']?.name).toBe('pareja-web-demo_pareja_uploads');
  expect(c.networks['pareja-network']?.external).toBeFalsy();
  expect(c.networks['pareja-network']?.name).toBe('pareja-web-demo_pareja-network');
  expect(c.services['pareja-backend']?.container_name).toBe('pareja-backend');
  expect(c.services['pareja-frontend']?.container_name).toBe('pareja-frontend');
  expect(c.services['pareja-backend']?.image).toBe('pareja-backend:latest');
  expect(c.services['pareja-frontend']?.image).toBe('pareja-frontend:latest');
  expect(c.services['pareja-backend']?.environment?.['PORT']).toBe('3001');
});

test.skipIf(!hasCompose)('el compose de dev conserva volumen, red, contenedores, imágenes y puerto', async () => {
  const c = await render('docker-compose.dev.yml');

  expect(c.name).toBe('pareja-web-demo-dev');
  expect(c.volumes['pareja-dev_data']?.name).toBe('pareja-web-demo-dev_pareja-dev_data');
  expect(c.volumes['pareja-dev_uploads']?.name).toBe('pareja-web-demo-dev_pareja-dev_uploads');
  expect(c.networks['pareja-network']?.external).toBeFalsy();
  expect(c.networks['pareja-network']?.name).toBe('pareja-web-demo-dev_pareja-network');
  expect(c.services['pareja-dev-backend']?.container_name).toBe('pareja-dev-backend');
  expect(c.services['pareja-dev-frontend']?.container_name).toBe('pareja-dev-frontend');
  expect(c.services['pareja-dev-backend']?.image).toBe('pareja-dev-backend:latest');
  expect(c.services['pareja-dev-frontend']?.image).toBe('pareja-dev-frontend:latest');
  expect(c.services['pareja-dev-backend']?.environment?.['PORT']).toBe('3002');
});

// ponytail: el build tiene que salir del repo (context = repo, dockerfile = Dockerfile,
// deploy = ./deploy). Si vuelve al contexto viejo, el deploy se arma fuera del repo y nadie se entera.
test.skipIf(!hasCompose)('el build de prod y dev sale del repo', async () => {
  for (const file of ['docker-compose.yml', 'docker-compose.dev.yml']) {
    const c = await render(file);

    for (const service of Object.values(c.services)) {
      expect(service.build?.context).toBe(REPO_ROOT);
      expect(service.build?.dockerfile).toBe('Dockerfile');
      expect(service.build?.additional_contexts).toEqual({ deploy: join(REPO_ROOT, 'deploy') });
    }
  }
});

test.skipIf(!hasCompose)('prod y dev comparten la misma config de runtime (salvo el puerto)', async () => {
  const prod = await render('docker-compose.yml');
  const dev = await render('docker-compose.dev.yml');

  for (const key of ['DB_PATH', 'UPLOAD_DIR', 'MAX_UPLOAD_BYTES']) {
    expect(dev.services['pareja-dev-backend']?.environment?.[key]).toBe(
      prod.services['pareja-backend']?.environment?.[key]
    );
  }
  expect(dev.services['pareja-dev-backend']?.healthcheck?.test?.join(' ')).toContain(':3002');
  expect(prod.services['pareja-backend']?.healthcheck?.test?.join(' ')).toContain(':3001');
  expect(dev.services['pareja-dev-backend']?.logging).toEqual(prod.services['pareja-backend']?.logging);
});

test('el .dockerignore deja afuera el secreto y los datos del host', () => {
  const body = readFileSync(join(REPO_ROOT, '.dockerignore'), 'utf8');
  const patterns = body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));

  for (const required of ['.git', 'node_modules', 'data', 'uploads', '.env', '.env.*']) {
    expect(patterns).toContain(required);
  }
});
