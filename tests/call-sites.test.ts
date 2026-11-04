/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-544 — call-site tests.
 *
 * The suite has no DOM runner, so the components are mounted with the
 * tiny runtime in tests/helpers/render.ts: real React hooks, real
 * effects, real handlers (the tree keeps the props the component wired)
 * and the markup through `react-dom/server` (already a dependency).
 *
 * Every test here fails if the CALL SITE stops using the fix: the
 * component is mounted, the effect runs and the handler that the
 * component really wired is the one that gets fired.
 *
 * ponytail: one file, one mount per concern, no framework beyond
 * bun:test.
 */

import { afterEach, expect, test } from 'bun:test';
import { Gallery } from '../src/components/Gallery';
import { Timeline } from '../src/components/Timeline';
import { TimelineCarousel } from '../src/components/TimelineCarousel';
import { ImageMarquee } from '../src/components/ImageMarquee';
import { Hero } from '../src/components/Hero';
import { PetdexCatAvatar } from '../src/components/PetdexCatAvatar';
import { CatTamagotchiBox } from '../src/components/CatTamagotchiBox';
import { findElements, mount as baseMount, textOf } from './helpers/render';
import { stubDom, type DomStub } from './helpers/dom';
import { fakePhotosApi } from './helpers/photos';

let dom: DomStub | null = null;
const mounted: { unmount(): void }[] = [];

/** Mount and remember it: the cleanups (timers, observers) run after. */
const mount = <P,>(Component: (props: P) => unknown, props: P, opts?: any) => {
  const m = baseMount(Component as never, props as never, opts);
  mounted.push(m);
  return m;
};

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  dom?.restore();
  dom = null;
});

const photo = (over: Record<string, unknown> = {}) => ({
  id: 'db-1',
  filePath: '/uploads/db-1.jpg',
  thumbnailUrl: '/uploads/db-1-thumb.jpg',
  caption: 'Una foto de la base',
  month: 'Septiembre',
  year: 2026,
  tags: ['Copo'],
  createdAt: 1_700_000_000,
  ...over
});

/** The API answers the public bucket with these photos and nothing else. */
const serve = (photos: unknown[]) => {
  dom!.fetchJson((url) => (url.includes('bucket=public') ? photos : []));
};

// ─── M1 / L1: the timeline's month button reads the gallery's photos ────

test('M1: "Ver fotos de {mes}" usa las fotos de la galería (la DB), no el seed', async () => {
  dom = stubDom();
  // the DB has one photo of Septiembre and none of Agosto: the seed has
  // photos of Agosto and none of Septiembre.
  // ponytail: la lista la pasa App (la misma instancia que usa la
  // galería) — el Timeline no la pide por su cuenta, así que la API
  // responde VACÍO a propósito: si volviera a su propio fetch, el
  // botón de Septiembre no aparecería.
  serve([]);
  const galleryPhotos = [photo({ month: 'Septiembre', year: 2026 })];

  const opened: string[] = [];
  const m = mount(Timeline as never, {
    photos: galleryPhotos,
    onOpenGalleryMonth: (month: string) => opened.push(month)
  });
  await m.settle();
  const html = m.html();

  // the month with photos in the DB has the button...
  expect(html).toContain('Ver fotos de Septiembre');
  // ...and the month whose photos are NOT in the DB has no button (the
  // seed's photos do not count: they were deleted in the DB).
  expect(html).not.toContain('Ver fotos de Agosto');

  // the button the component wired opens the gallery with that month
  const button = findElements(
    m.tree(),
    (props) =>
      typeof props.onClick === 'function' &&
      textOf(props.children).includes('Ver fotos de Septiembre')
  )[0];
  expect(button).toBeDefined();
  button.props.onClick();
  expect(opened).toEqual(['Septiembre']);
});

// ─── L1: the gallery card's keyboard ────────────────────────────────────

test('L1: la tecla de un botón de la tarjeta no abre el visor', async () => {
  dom = stubDom();

  const m = mount(Gallery as never, {
    photosApi: fakePhotosApi({ photos: [photo()] as never }),
    isEditMode: true
  });
  await m.settle();

  const card = findElements(
    m.tree(),
    (props) => props.role === 'button' && typeof props.onKeyDown === 'function'
  )[0];
  const editButton = findElements(
    m.tree(),
    (props) => props['aria-label'] === 'Editar'
  )[0];
  expect(card).toBeDefined();
  expect(editButton).toBeDefined();

  // Enter on the card's own button (Editar): the viewer must NOT open.
  let prevented = false;
  card.props.onKeyDown({
    key: 'Enter',
    target: editButton,
    currentTarget: card,
    preventDefault: () => {
      prevented = true;
    }
  });
  expect(prevented).toBe(false);
  expect(m.html()).not.toContain('Visualizador de fotografía');

  // Enter on the card itself: the viewer DOES open.
  let preventedOnCard = false;
  card.props.onKeyDown({
    key: 'Enter',
    target: card,
    currentTarget: card,
    preventDefault: () => {
      preventedOnCard = true;
    }
  });
  expect(preventedOnCard).toBe(true);
});

// ─── L1: the gallery's month filter with late photos ───────────────

/** The number the gallery says it is showing. */
const showing = (html: string): string =>
  html.match(/Mostrando <strong[^>]*>(\d+)<\/strong> recuerdos/)?.[1] ?? '0';

test('L5: el filtro que manda el timeline se aplica aunque las fotos lleguen tarde', async () => {
  dom = stubDom();
  // the photos arrive after the first render: the filter value ("Copo")
  // is a hashtag, but with no photos loaded it looks like a month.
  const m = mount(Gallery as never, {
    photosApi: fakePhotosApi(),
    initialMonthFilter: 'Copo'
  });
  await m.settle();
  // the owner (App) re-renders with the photos that just arrived
  m.render({
    photosApi: fakePhotosApi({ photos: [photo({ tags: ['Copo'] })] as never }),
    initialMonthFilter: 'Copo'
  });
  await m.settle();
  const html = m.html();

  expect(showing(html)).toBe('1');
  // the hashtag filter, not the month filter
  expect(html).not.toContain('Mes: Copo');
});

test('L1: el filtro se aplica una vez por valor: la foto que elige el visitante no se pierde', async () => {
  dom = stubDom();
  let photos = [
    photo({ id: 'a', month: 'Septiembre', tags: ['Copo'] }),
    photo({ id: 'b', month: 'Septiembre', tags: ['Nube'] })
  ];
  // ponytail: la lista la pasa App; el guardián de la galería la usa
  // para saber cuándo hay que re-aplicar el filtro del timeline.
  const photosApi = fakePhotosApi({
    photos: photos as never,
    updatePhoto: async (id: string, patch: Record<string, unknown>) =>
      ({ id, ...patch }) as never
  });

  const m = mount(Gallery as never, {
    photosApi,
    initialMonthFilter: 'Septiembre',
    isEditMode: true
  });
  await m.settle();
  // the month filter of the timeline: two photos
  expect(showing(m.html())).toBe('2');

  // the visitor picks the #Nube tag
  const tag = findElements(
    m.tree(),
    (props) => typeof props.onClick === 'function' && textOf(props.children).includes('#Nube')
  )[0];
  expect(tag).toBeDefined();
  tag.props.onClick();
  await m.settle();
  expect(showing(m.html())).toBe('1');

  // an edit arrives: the gallery refreshes and the tag wall changes
  photos = [...photos, photo({ id: 'c', month: 'Octubre', tags: ['Canela'] })];
  const edit = findElements(
    m.tree(),
    (props) => props['aria-label'] === 'Editar'
  )[0];
  expect(edit).toBeDefined();
  edit.props.onClick({ stopPropagation() {} });
  m.render();
  const modal = findElements(
    m.tree(),
    (props) => typeof props.onSave === 'function' && typeof props.onClose === 'function'
  )[0];
  expect(modal).toBeDefined();
  modal.props.onSave({ caption: 'otra foto' });
  await m.settle();
  // the owner (App) re-renders with the list the shared instance refreshed
  m.render({
    photosApi: fakePhotosApi({ photos: photos as never }),
    initialMonthFilter: 'Septiembre',
    isEditMode: true
  });
  await m.settle();

  // the tag the visitor picked is still there (the filter was applied
  // once per value, not on every change of the photo list)
  expect(showing(m.html())).toBe('1');
});

// ─── L1: the marquee's activation ───────────────────────────────────────

test('L1: después de un arrastre la tecla sigue mostrando el piropo', async () => {
  dom = stubDom();
  const clicked: unknown[] = [];
  const m = mount(ImageMarquee as never, {
    photos: [photo({ id: 'a' }), photo({ id: 'b' })],
    onPhotoClick: (e: unknown) => clicked.push(e)
  });
  await m.settle();

  const track = findElements(
    m.tree(),
    (props) => typeof props.onPointerDown === 'function'
  )[0];
  const slide = findElements(
    m.tree(),
    (props) => props.type === 'button' && props.tabIndex === 0
  )[0];
  expect(track).toBeDefined();
  expect(slide).toBeDefined();

  const pointer = (over: Record<string, unknown> = {}) => ({
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    buttons: 1,
    target: { closest: () => null },
    currentTarget: {
      setPointerCapture() {},
      releasePointerCapture() {},
      hasPointerCapture: () => false
    },
    ...over
  });

  // a drag that ends outside a slide (no click to consume the flag)
  track.props.onPointerDown(pointer());
  track.props.onPointerMove(pointer({ clientX: 400 }));
  track.props.onPointerUp(pointer({ clientX: 400, buttons: 0 }));

  // the keyboard activation right after it is an activation (detail === 0)
  slide.props.onClick({ detail: 0 });
  expect(clicked.length).toBe(1);

  // a drag followed by a real click is not an activation
  track.props.onPointerDown(pointer());
  track.props.onPointerMove(pointer({ clientX: 400 }));
  track.props.onPointerUp(pointer({ clientX: 400, buttons: 0 }));
  slide.props.onClick({ detail: 1 });
  expect(clicked.length).toBe(1);
});

// ─── L1: the carousel knows a video with a poster is a video ───────────

test('L1: el carrusel reproduce un video aunque su miniatura sea un poster', () => {
  dom = stubDom();
  const m = mount(TimelineCarousel as never, {
    images: [
      photo({
        id: 'video-1',
        filePath: '/uploads/video-1.mp4',
        thumbnailUrl: '/uploads/video-1-poster.jpg',
        mediaType: 'video'
      })
    ],
    eventTitle: 'Un video',
    eventDate: '9 de Septiembre, 2026'
  });
  const html = m.html();
  expect(html).toContain('<video');
  expect(html).not.toContain('<img');
});

// ─── L1: the hero pauses the ribbon off-screen ──────────────────────────

test('L1: el hero pausa la cinta cuando sale de pantalla', async () => {
  dom = stubDom();
  const played: number[] = [];
  const paused: number[] = [];
  const m = mount(
    Hero as never,
    { photos: [] },
    {
      createNodeMock: (element) => {
        if (element?.type !== 'video') return undefined;
        return {
          canPlayType: () => 'maybe',
          src: '',
          play: () => {
            played.push(1);
            return Promise.resolve();
          },
          pause: () => {
            paused.push(1);
          },
          load() {},
          removeAttribute() {},
          addEventListener() {},
          removeEventListener() {}
        };
      }
    }
  );
  await m.settle();

  const observer = dom.observers[dom.observers.length - 1];
  expect(observer).toBeDefined();
  // ponytail: el observer falso sólo dispara si algo fue observado: si
  // el Hero deja de observar el video (`io.observe(video)`), la cinta
  // no se pausa más y este test se pone rojo.
  expect(observer.elements).toHaveLength(1);
  expect(observer.trigger(false)).toBe(true);
  expect(paused.length).toBe(1);
  expect(observer.trigger(true)).toBe(true);
  expect(played.length).toBe(1);
});

// ─── L4: the sprite sheets load when the pet room nears the viewport ────

test('L4: la hoja de sprites no se descarga hasta que el gato entra en pantalla', async () => {
  dom = stubDom();
  const m = mount(PetdexCatAvatar as never, {
    catType: 'white',
    state: 'idle',
    direction: 1
  });
  await m.settle();

  // off-screen: no sheet, but the box keeps its size
  expect(m.html()).not.toContain('spritesheet.webp');
  expect(m.html()).toContain('width:');

  const observer = dom.observers[dom.observers.length - 1];
  expect(observer).toBeDefined();
  observer.trigger(true);
  m.render();
  expect(m.html()).toContain('spritesheet.webp');
});

// ─── L5: Copo's colour is the cream the comment talks about ────────────

test('L5: el color de Copo es crema, como dice el comentario', async () => {
  dom = stubDom();
  const m = mount(CatTamagotchiBox as never, {});
  await m.settle();

  // the colour each cat draws her bowl / bubble with
  const colours = new Set(
    findElements(
      m.tree(),
      (props) => typeof props.style?.borderColor === 'string'
    ).map((el) => el.props.style.borderColor)
  );
  expect(colours.has('#f3e8d3')).toBe(true); // Copo, cream
  expect(colours.has('#f5f5f4')).toBe(false); // not the old white
});
