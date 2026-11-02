/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Infinite, drag-enabled photo marquee (PWD-495), rebuilt from the
 * carousel-hero prompt: rAF auto-scroll, pointer drag with inertia, and
 * the prompt's curved masks.
 *
 * The prompt draws the masks as two white SVG overlays because its page
 * is white. This site is dark, so the masks are a CSS mask band: the
 * strip is cut by the very same curves and the page background shows
 * through them (a flat white rectangle over the site would look like a
 * sticker, not like a mask).
 *
 * ponytail: no CSS @keyframes marquee (the prompt forbids it) and no
 * motion library here — the physics are one requestAnimationFrame loop
 * and the pointer handlers.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Photo } from '../types';

const SPEED = 0.8; // px per frame, auto-scroll to the left
const DECAY = 0.95; // inertia decay per frame
const DRAG_SLOP = 4; // px before a pointer move counts as a drag (not a click)

// The band the photos are visible through, in the prompt's own geometry:
// the top curve (y 50 at the edges, 100 in the middle) and its mirrored
// bottom curve (y 526 at the edges, 476 in the middle) inside a 576-tall
// section (the prompt's paddings plus a 512px slide row). preserveAspectRatio
// "none" stretches it to whatever the section is, so the mobile band
// (a 320px row) stays proportional.
const MASK_BAND = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 576' preserveAspectRatio='none'%3E%3Cpath fill='%23fff' d='M0 50C0 50 240 100 720 100C1200 100 1440 50 1440 50L1440 526C1440 526 1200 476 720 476C240 476 0 526 0 526Z'/%3E%3C/svg%3E")`;

/**
 * Keeps the scroll offset inside `[-halfWidth, 0]`, where `halfWidth` is
 * half the duplicated track: the seam of the infinite loop.
 */
export function wrapOffset(offset: number, halfWidth: number): number {
  if (halfWidth <= 0) return offset;
  const wrapped = offset % halfWidth;
  // `+ 0` normalizes -0 into 0: at the seam the offset must be exactly 0
  return wrapped > 0 ? wrapped - halfWidth : wrapped + 0;
}

interface ImageMarqueeProps {
  photos: Photo[];
  /** Called when a photo is clicked (not dragged). */
  onPhotoClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ImageMarquee: React.FC<ImageMarqueeProps> = ({ photos, onPhotoClick }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const dragged = useRef(false);
  const drag = useRef({ x: 0, offset: 0, lastX: 0, lastT: 0 });
  const capture = useRef<HTMLElement | null>(null);
  const count = useRef(photos.length);
  const reduced = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // ponytail: honours the OS setting. The auto-scroll stops, the drag
  // keeps working (the user asked for it, it is not decoration).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduced.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // ponytail: the photos arrive later (the API) and the count changes, so
  // the loop reads it from a ref instead of closing over the first render.
  useEffect(() => {
    count.current = photos.length;
  }, [photos.length]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const track = trackRef.current;
      if (!track) return;

      if (!dragging.current) {
        if (Math.abs(velocity.current) > 0.1) {
          offset.current += velocity.current;
          velocity.current *= DECAY;
        } else {
          velocity.current = 0;
          if (!reduced.current) offset.current -= SPEED;
        }
      }

      // The period is the distance between the two copies of the strip:
      // the slides of copy one plus the gaps between them. `scrollWidth / 2`
      // is half a gap short of it (the gap between the copies has no
      // partner on the other side) and that half gap jumps the strip once
      // per lap.
      const slides = track.children;
      const half =
        slides.length > count.current
          ? (slides[count.current] as HTMLElement).offsetLeft -
            (slides[0] as HTMLElement).offsetLeft
          : track.scrollWidth / 2;

      offset.current = wrapOffset(offset.current, half);
      track.style.transform = `translate3d(${offset.current}px, 0, 0)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photos.length) return;
    dragging.current = true;
    dragged.current = false;
    velocity.current = 0;
    drag.current = { x: e.clientX, offset: offset.current, lastX: e.clientX, lastT: performance.now() };
    // ponytail: the capture goes on the pressed slide, not on the track:
    // with the capture on the track the browser fires the click on the
    // track and the slide's own click (the compliment) never arrives.
    // The events still bubble up to the track, so the drag keeps working.
    const slide = (e.target as HTMLElement).closest('button');
    if (slide) {
      slide.setPointerCapture(e.pointerId);
      capture.current = slide;
    }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.lastX;
    const dt = now - drag.current.lastT;
    if (Math.abs(e.clientX - drag.current.x) > DRAG_SLOP) dragged.current = true;
    // normalize to ~60fps, so the coast after the release feels the same
    // on a 120hz screen
    velocity.current = dt > 0 ? (dx / dt) * 16 : 0;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
    offset.current = drag.current.offset + (e.clientX - drag.current.x);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const slide = capture.current;
    if (slide?.hasPointerCapture(e.pointerId)) slide.releasePointerCapture(e.pointerId);
    capture.current = null;
  };

  // The list is duplicated once: the second copy is what makes the loop
  // seamless, and the seam sits at half the track width.
  const slides = [...photos, ...photos];

  return (
    <section
      className="relative py-4 overflow-hidden"
      style={{
        maskImage: MASK_BAND,
        WebkitMaskImage: MASK_BAND,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
      }}
      aria-label="Galería de fotos"
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex w-max gap-3 sm:gap-4 py-4 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ willChange: 'transform', touchAction: 'pan-y' }}
      >
        {slides.map((photo, i) => (
          <button
            key={`${photo.id}-${i}`}
            type="button"
            onClick={(e) => {
              if (!dragged.current) onPhotoClick?.(e);
            }}
            className="w-60 h-80 sm:w-80 sm:h-[32rem] flex-shrink-0 rounded-2xl overflow-hidden bg-black/20"
          >
            <img
              src={photo.thumbnailUrl || photo.filePath}
              alt={photo.caption || 'Foto de nuestro álbum'}
              loading="lazy"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
          </button>
        ))}
      </div>
    </section>
  );
};
