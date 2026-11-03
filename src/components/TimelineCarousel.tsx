import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Heart, Sparkles, Upload } from 'lucide-react';
import { Photo } from '../types';
import { audioEngine } from '../utils/audioSynth';
import { compressImage } from '../utils/compressImage';
import { PERSPECTIVE, cylinderLayout, damp, isVideoUrl, mediaUrl, prefersReducedMotion } from '../utils/carousel3d';

interface TimelineCarouselProps {
  images: Photo[];
  eventTitle: string;
  eventDate: string;
  isEditMode?: boolean;
  eventId?: string; // ponytail: when set, "Reemplazar 5" uploads with this id to bucket='carousel'.
  onReplace?: () => Promise<void> | void; // called after a successful replace (parent refetches).
}

const COMPLIMENTS = [
  '¡Qué hermosa que sos! ✨',
  'Tenés la sonrisa más linda de este mundo 💖',
  'Sos mi persona favorita en todo el universo 🌸',
  'Tu risa es mi sonido preferido 🎶',
  'Como podes ser TAN TAN TAN HERMOSA X DIOSSSS 🥰',
  'Vi ese orto y no supe a qué santo rezarle 💫',
  'Genia, diosa, preciosa, divina, sol, luz, mí energía favorita 🌷',
  'La reina indiscutida de esta casa y de mi corazón 👑',
  'Con vos quiero todo ✨',
  'HOT ❤️‍🔥',
  'Me hacés el hombre más feliz 🌹',
  'Amo todo de vos, meamoorrrt 💖'
];

interface FloatingCompliment {
  id: number;
  text: string;
  x: number;
  y: number;
}

/**
 * A video that only plays when the OS allows motion and the card is on
 * screen: no autoplay under reduced motion, and no decoding off-screen.
 */
const MediaVideo: React.FC<{ src: string; className?: string }> = ({ src, className }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playing = inView && !reduced;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }, [playing]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      autoPlay={playing}
      className={className}
    />
  );
};

export const TimelineCarousel: React.FC<TimelineCarouselProps> = ({
  images,
  eventTitle,
  isEditMode = false,
  eventId,
  onReplace
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [compliment, setCompliment] = useState<FloatingCompliment | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ponytail: touch gesture state. `swipeLock` keeps the trailing click from
  // firing a random compliment after a successful horizontal swipe.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockRef = useRef(false);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const advance = (dir: 1 | -1) => {
    setDirection(dir);
    setCurrentIndex((prev) => (prev + dir + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    advance(1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    advance(-1);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // ponytail: simple horizontal swipe — 50px threshold and 1.5x horizontal bias
  // to avoid hijacking vertical scrolls. `swipeLockRef` suppresses the synthetic
  // click that browsers fire after touchend so tapping a swipe doesn't also pop
  // a compliment.
  const SWIPE_THRESHOLD = 50;
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeLockRef.current = false;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (
      Math.abs(dx) > SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ) {
      advance(dx < 0 ? 1 : -1);
      swipeLockRef.current = true;
    }
  };

  const handlePhotoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swipeLockRef.current) {
      // ponytail: just consumed by a swipe — drop the trailing synthetic click.
      swipeLockRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 40), rect.width - 40);
    const y = Math.min(Math.max(e.clientY - rect.top, 50), rect.height - 50);

    const randomText = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

    audioEngine.playSparkle();

    setCompliment({ id: Date.now(), text: randomText, x, y });

    window.setTimeout(() => {
      setCompliment((prev) => (prev?.id === prev?.id ? null : prev));
    }, 3200);
  };

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleReplaceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !eventId) return;
    const files: File[] = [];
    for (let i = 0; i < Math.min(fileList.length, 5); i++) {
      files.push(fileList[i]);
    }
    setIsReplacing(true);
    try {
      const token = localStorage.getItem('pareja_edit_token');
      if (!token) {
        const t = window.prompt('Pegá tu EDIT_TOKEN del .env:');
        if (!t) throw new Error('Token requerido');
        localStorage.setItem('pareja_edit_token', t.trim());
      }
      const finalToken = localStorage.getItem('pareja_edit_token');
      const form = new FormData();
      form.set('bucket', 'carousel');
      form.set('eventId', eventId);
      for (const f of files) form.append('files', await compressImage(f));

      const send = (): Promise<{ ok: boolean; status: number }> =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/photos');
          xhr.setRequestHeader('X-Edit-Token', finalToken ?? '');
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setReplaceProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
          xhr.onerror = () => reject(new Error('network error'));
          xhr.onabort = () => reject(new Error('upload aborted'));
          xhr.send(form);
        });

      const result = await send();
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      await onReplace?.();
      setCurrentIndex(0);
    } catch (err) {
      alert(`Error al reemplazar: ${err}`);
    } finally {
      setIsReplacing(false);
      setReplaceProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.96
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 80 : -80,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 }
      }
    })
  };

  return (
    <div className="aspect-[16/11] sm:aspect-[4/3] rounded-3xl p-2.5 glass-polaroid transition-all duration-300 overflow-hidden relative group">
      {isEditMode && eventId && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleReplaceFiles}
          className="hidden"
        />
      )}
      <div
        onClick={handlePhotoClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-full rounded-2xl overflow-hidden bg-[#130911] select-none cursor-pointer touch-pan-y"
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentImage.id ?? currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {isVideoUrl(currentImage.thumbnailUrl || currentImage.filePath) ? (
              <MediaVideo
                src={mediaUrl(currentImage.filePath, currentImage.thumbnailUrl, true)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <img
                src={currentImage.thumbnailUrl || currentImage.filePath}
                alt={currentImage.caption || eventTitle}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Romantic Compliment Popover */}
        <AnimatePresence>
          {compliment && (
            <motion.div
              key={compliment.id}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              style={{
                left: `${compliment.x}px`,
                top: `${compliment.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
              className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full max-w-[260px] sm:max-w-[320px]"
            >
              <div className="px-4 py-2.5 rounded-2xl bg-[#2b0c1e]/95 border border-[#ff85a1]/70 backdrop-blur-xl shadow-2xl shadow-rose-950/80 text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#ff4d6d] fill-[#ff4d6d] shrink-0 animate-pulse" />
                <span className="font-serif text-xs sm:text-sm font-semibold tracking-wide text-[#ffe5ec] leading-snug">
                  {compliment.text}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#ffd166] shrink-0" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={handlePrev}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-[#ff85a1] hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-lg"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-[#ff85a1] hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-lg"
              aria-label="Siguiente foto"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
            <div className="flex items-center gap-1.5 pointer-events-auto bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
              {images.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => handleDotClick(e, dotIdx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    dotIdx === currentIndex
                      ? 'w-4 bg-[#ff85a1]'
                      : 'w-1.5 bg-white/40 hover:bg-white/80'
                  }`}
                  aria-label={`Ver foto ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Edit Mode "Replace 3" Button */}
        {isEditMode && eventId && (
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleReplaceClick}
              disabled={isReplacing}
              className="px-3 py-1.5 rounded-xl bg-[#ffd166]/95 hover:bg-[#ffd166] text-black text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md disabled:opacity-50 cursor-pointer"
              title="Reemplazar las 5 fotos del carrusel"
            >
              {isReplacing ? (
                <span className="ld-barber" aria-label="Reemplazando" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isReplacing ? `${replaceProgress}%` : 'Reemplazar 5'}</span>
            </button>
            {isReplacing && (
              <div className="upload-progress-shell w-32">
                <div className="upload-progress-bar" style={{ width: `${replaceProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PWD-497: month cards in a 3D cylindrical carousel
// ---------------------------------------------------------------------------

export interface MonthCard {
  id: string;
  month: string;
  year: number;
  title: string;
  /** the month's memory, shown on the back of the card */
  text: string;
  /** the month's photos; the card falls back to the next one if one is dead */
  photos: { url: string; isVideo?: boolean }[];
}

// ponytail: the cylinder math is pure and lives in src/utils/carousel3d.ts
// (tested there); this component only writes the result to the DOM.
const THICKNESS = [-1.4, -0.7, 0, 0.7, 1.4];
const BASE_SPEED = 0.0016; // cards per frame
const SWIPE_THRESHOLD = 40;
const MAX_TILT = 12;
// ponytail: the center card sits at z = 400, so the perspective scales it
// by this factor — the wrapper is sized to fit it (no clipped card).
const CENTER_SCALE = PERSPECTIVE / (PERSPECTIVE - 400);

const CardMedia: React.FC<{ card: MonthCard }> = ({ card }) => {
  const [index, setIndex] = useState(0);
  const item = card.photos[index];
  if (!item) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#3a0f26] via-[#1b0d18] to-[#130911]" />
    );
  }
  // ponytail: el bucket de fotos devuelve dos videos del seed con la
  // extension .mp4 pero etiquetados como image — la extension manda sobre
  // la etiqueta.
  if (item.isVideo || isVideoUrl(item.url)) {
    return (
      <MediaVideo
        src={item.url}
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  return (
    <img
      key={item.url}
      src={item.url}
      alt={card.title}
      loading="lazy"
      // ponytail: a dead photo url would show the broken-image icon and the
      // alt text over the card — try the next photo of the month instead.
      onError={() => setIndex(index + 1)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

const MonthCardFaces: React.FC<{ card: MonthCard }> = ({ card }) => (
  <>
    {/* structural slices: the thickness of the card */}
    {THICKNESS.slice(1, -1).map((z) => (
      <div
        key={z}
        className="absolute inset-0 rounded-3xl bg-[#7a5566]"
        style={{ transform: `translateZ(${z}px)` }}
      />
    ))}
    {/* back: the month's memory */}
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden border border-[#ff85a1]/30 bg-[#1b0d18]/95 p-5"
      style={{
        transform: `translateZ(${THICKNESS[0]}px) rotateY(180deg)`,
        backfaceVisibility: 'hidden'
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff85a1]">
        {card.month} {card.year}
      </p>
      <p className="mt-2 font-serif text-sm leading-snug text-[#ffe5ec]">{card.text}</p>
    </div>
    {/* front: the month's photo, its name and its title */}
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden border border-white/15 bg-[#130911]"
      style={{
        transform: `translateZ(${THICKNESS[THICKNESS.length - 1]}px)`,
        backfaceVisibility: 'hidden'
      }}
    >
      <CardMedia card={card} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff85a1]">
          {card.month} {card.year}
        </p>
        <h3 className="font-serif text-base sm:text-lg font-bold text-white leading-tight">
          {card.title}
        </h3>
      </div>
    </div>
  </>
);

export const MonthCardsCylinder: React.FC<{ cards: MonthCard[] }> = ({ cards }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(0);
  const target = useRef(0);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const metrics = useRef({ cardW: 240, cardH: 317, wrapH: 490, viewportW: 1200 });
  const [box, setBox] = useState(metrics.current);
  // ponytail: el estado inicial ya sale del OS: con movimiento reducido la
  // fila estatica es lo primero que se monta (antes se veía un frame de 3D).
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // the card follows the width of the section
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const viewportW = el.clientWidth;
      const cardW = Math.round(Math.min(260, Math.max(160, viewportW * 0.26)));
      const cardH = Math.round(cardW * 1.32);
      const next = { cardW, cardH, wrapH: Math.round(cardH * CENTER_SCALE) + 40, viewportW };
      metrics.current = next;
      setBox(next);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // reduced motion: static row of cards, no loop and no parallax
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      // ponytail: WCAG 2.2.2 — el giro automatico se puede pausar.
      if (!pausedRef.current) target.current += BASE_SPEED;
      progress.current = damp(progress.current, target.current, 0.08);
      pointer.current.x = damp(pointer.current.x, pointer.current.tx, 0.08);
      pointer.current.y = damp(pointer.current.y, pointer.current.ty, 0.08);
      cylinderLayout(progress.current, cards.length, metrics.current).forEach((pose, i) => {
        const node = cardRefs.current[i];
        if (!node) return;
        node.style.visibility = pose.visible ? 'visible' : 'hidden';
        node.style.opacity = pose.opacity.toFixed(3);
        const tiltX = (-pointer.current.y * MAX_TILT * pose.centerFactor).toFixed(2);
        const tiltY = (pointer.current.x * MAX_TILT * pose.centerFactor).toFixed(2);
        node.style.transform =
          `translate3d(${pose.x.toFixed(2)}px, 0px, ${pose.z.toFixed(2)}px) ` +
          `rotateY(${pose.rotateY.toFixed(2)}deg) rotateX(${tiltX}deg) ` +
          `rotateY(${tiltY}deg) rotateZ(-3deg)`;
      });
    };
    // ponytail: the loop only runs while the section is on screen.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
        else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, cards.length]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current.tx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    pointer.current.ty = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
  };

  const handlePointerLeave = () => {
    pointer.current.tx = 0;
    pointer.current.ty = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      target.current += dx < 0 ? 1 : -1;
    }
  };

  // ponytail: WCAG 2.2.2 — el carrusel automatico se pausa y se mueve con el
  // teclado (flechas: un mes; espacio: pausar).
  const togglePaused = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      target.current -= 1;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      target.current += 1;
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') {
      togglePaused();
      e.preventDefault();
    }
  };

  if (cards.length === 0) return null;

  if (reduced) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
        {cards.map((card) => (
          <article
            key={card.id}
            className="shrink-0 w-[220px] snap-start rounded-3xl overflow-hidden border border-[#ff85a1]/25 bg-[#1b0d18]"
          >
            <div className="relative aspect-[3/4]">
              <MonthCardFaces card={card} />
            </div>
            <p className="p-4 text-xs leading-snug text-[#fcd5df]/85">{card.text}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={wrapRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Tarjetas de los meses (flechas para recorrerlas, espacio para pausar)"
        className="relative w-full select-none touch-pan-y overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff85a1]/70 rounded-2xl"
        style={{ height: box.wrapH, perspective: `${PERSPECTIVE}px` }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: box.cardW,
            height: box.cardH,
            marginLeft: -box.cardW / 2,
            marginTop: -box.cardH / 2,
            transformStyle: 'preserve-3d'
          }}
        >
          {cards.map((card, i) => (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute inset-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <MonthCardFaces card={card} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={togglePaused}
          aria-pressed={paused}
          className="rounded-full border border-[#ff85a1]/40 bg-[#1e0e1a] px-4 py-1.5 text-xs font-semibold text-[#fcd5df] transition-colors hover:bg-[#2b1425] cursor-pointer"
        >
          {paused ? 'Reanudar' : 'Pausar'} el carrusel
        </button>
        {/* ponytail: el mouse solo inclina las tarjetas; los meses se recorren
            deslizando (o con las flechas del teclado). */}
        <p className="text-xs text-[#fcd5df]/60">
          Deslizá para recorrer los meses · el mouse inclina las tarjetas
        </p>
      </div>
    </>
  );
};
