import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, ArrowDown } from 'lucide-react';
import { siteMeta, photos as demoPhotos } from '../data/content';
import { audioEngine } from '../utils/audioSynth';
import { triggerClickWhisper } from './ClickWhisper';
import { usePhotos } from '../hooks/usePhotos';
import { ImageMarquee } from './ImageMarquee';
import { isVideoUrl, prefersReducedMotion } from '../utils/carousel3d';
import type { Photo } from '../types';

// ponytail: source of truth is PHOTO_COMPLIMENT_1..12 in HARDCODED_TEXTS.md.
// Do not add lines here — update the .md inventory instead, or the
// hero-compliments-sync.test.ts guard will fail.
const HERO_COMPLIMENTS = [
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

interface FloatingPhotoCompliment {
  id: number;
  text: string;
  /** viewport coordinates, the compliment floats over the whole page */
  x: number;
  y: number;
}

/**
 * The photos the marquee shows: only images. A video row whose rendered url
 * is the video file (the server returns the .mp4 as the thumbnail of the
 * seeded videos) would be a broken tile crossing the hero on every lap; a
 * video with a real poster keeps its poster.
 */
export const marqueePhotos = (photos: Photo[]): Photo[] =>
  photos.filter((p) => !isVideoUrl(p.thumbnailUrl || p.filePath));

/**
 * Where the compliment floats: the pointer position, or the centre of the
 * slide when it was opened with the keyboard (a keyboard activation has no
 * pointer coordinates, so the old code put it on the top-left corner of
 * the screen, half off-screen).
 */
export function complimentSpot(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  viewportW: number,
  viewportH: number
): { x: number; y: number } {
  const keyboard = clientX === 0 && clientY === 0;
  const x = keyboard ? rect.left + rect.width / 2 : clientX;
  const y = keyboard ? rect.top + rect.height / 2 : clientY;
  return {
    x: Math.min(Math.max(x, 60), Math.max(0, viewportW - 60)),
    y: Math.min(Math.max(y, 40), Math.max(0, viewportH - 40))
  };
}

// ponytail: the bar of the carousel-hero prompt, adapted. The prompt
// opens a full-screen drawer from a hamburger; this album has no menu
// today, so the bar is the brand mark + the way into the gallery.
const SiteNav: React.FC = () => (
  <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
    <a href="#inicio" className="flex items-center gap-2.5" aria-label="Nuestro Álbum">
      {/* the site's own mark (public/favicon.svg), not the prompt's logo */}
      <svg viewBox="0 0 64 64" className="w-7 h-7" aria-hidden="true">
        <path
          fill="#ff4d6d"
          d="M32 58 12.8 40.2C5.2 33 2 27 2 19.6 2 10.4 9.2 3.5 18.4 3.5c5.2 0 10.2 2.4 13.6 6.4 3.4-4 8.4-6.4 13.6-6.4C54.8 3.5 62 10.4 62 19.6c0 7.4-3.2 13.4-10.8 20.6L32 58Z"
        />
      </svg>
      <span className="font-serif text-lg sm:text-xl text-[#fdf2f4]">
        {siteMeta.herName} &amp; {siteMeta.hisName}
      </span>
    </a>
    <a
      href="#galeria"
      className="hidden sm:inline-flex rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm font-medium text-[#fdf2f4] backdrop-blur-md hover:bg-white/20 transition-colors"
    >
      Ver la galería
    </a>
  </header>
);

export const Hero: React.FC = () => {
  const [activeCompliment, setActiveCompliment] = useState<FloatingPhotoCompliment | null>(null);
  // ponytail: the OS setting, read once at mount.
  const [reduced] = useState(prefersReducedMotion);

  // ponytail: pull from the same API the Gallery uses so uploads show up here live.
  // (was: `photos` from content.ts — became stale the moment you uploaded the first photo.)
  const { photos: apiPhotos } = usePhotos('public');
  // ponytail: newest upload first. The server answers `bucket=public` with
  // `ORDER BY created_at ASC` because the Gallery groups by month and wants
  // the natural order, so a fresh "catgada" otherwise lands at the very end
  // of the ribbon. Sorted here, in the Hero only, to leave the Gallery
  // untouched. `Array.sort` is stable, so seeded photos sharing a
  // `created_at` keep their relative order after the real uploads.
  const allMedia = [...apiPhotos].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  // ponytail: the API is the source of truth (an upload shows up live);
  // the static demo list is the fallback so the hero is never empty
  // while the server is starting or offline.
  const photos = marqueePhotos(allMedia.length ? allMedia : demoPhotos);

  const handlePhotoClick = (e: React.MouseEvent<HTMLElement>) => {
    audioEngine.playSparkle();

    const complimentId = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spot = complimentSpot(e.clientX, e.clientY, rect, window.innerWidth, window.innerHeight);
    setActiveCompliment({
      id: complimentId,
      text: HERO_COMPLIMENTS[Math.floor(Math.random() * HERO_COMPLIMENTS.length)],
      x: spot.x,
      y: spot.y
    });

    window.setTimeout(() => {
      setActiveCompliment((prev) => (prev?.id === complimentId ? null : prev));
    }, 3000);
  };

  const scrollToNextSection = () => {
    const letterEl = document.querySelector('#carta') || document.querySelector('#tiempo');
    if (letterEl) {
      letterEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <SiteNav />

      <section
        id="inicio"
        className="relative min-h-screen w-full flex flex-col items-center pt-24 pb-12 overflow-hidden"
      >
        {/* Soft Cozy Ambient Golden & Rosé Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[450px] sm:w-[850px] h-[350px] sm:h-[550px] rounded-full bg-[#ffd166]/10 blur-[140px]" />
          <div className="absolute top-1/3 left-6 w-80 h-80 rounded-full bg-[#ff758f]/12 blur-[110px]" />
          <div className="absolute bottom-20 right-8 w-96 h-96 rounded-full bg-[#ffd166]/8 blur-[130px]" />
        </div>

        {/* Floating Fairy Lights & Twinkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute select-none pointer-events-none"
              style={{
                top: `${12 + i * 10}%`,
                left: `${8 + ((i * 19) % 84)}%`,
                color: i % 2 === 0 ? '#ffd166' : '#ff85a1',
              }}
              animate={
                reduced
                  ? { opacity: 0.4 }
                  : {
                      y: [0, -18, 0],
                      opacity: [0.2, 0.7, 0.2],
                      scale: [0.9, 1.25, 0.9]
                    }
              }
              transition={{
                duration: 3.5 + i * 0.7,
                repeat: reduced ? 0 : Infinity,
                ease: 'easeInOut'
              }}
            >
              {i % 2 === 0 ? (
                <Sparkles className="w-3.5 h-3.5 text-[#ffd166]/70" />
              ) : (
                <Heart className="w-3 h-3 text-[#ff85a1] fill-[#ff85a1]/30" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Hero copy */}
        <div className="relative z-10 w-full max-w-5xl mx-auto text-center px-4 sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            onClick={(e) => triggerClickWhisper(e, '¡Cada minuto con vos vale oro bebota! ✨💛')}
            className="font-serif text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-tight mb-4 cursor-pointer select-none"
          >
            <span className="fx-gold-shimmer mr-2 sm:mr-3">
              Nuestro
            </span>{' '}
            <span className="romantic-text-gradient italic font-normal inline-block">
              Álbum
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            onClick={(e) => triggerClickWhisper(e, 'soy un gordo enamorado, gracias  💕')}
            className="text-base sm:text-xl lg:text-2xl text-[#fcd5df] max-w-2xl mx-auto font-light leading-snug cursor-pointer select-none"
          >
            {siteMeta.subtitle}
            {' '}
            {/* ponytail: rosa heart, scale + rotate pulse, low-cost (single transform prop). */}
            <motion.span
              className="inline-block align-middle text-[#ff85a1]"
              animate={reduced ? { scale: 1, rotate: 0 } : { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.2, repeat: reduced ? 0 : Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              <Heart className="inline w-6 h-6 fill-[#ff85a1]" />
            </motion.span>
          </motion.p>
        </div>

        {/* Infinite, drag-enabled photo marquee with the prompt's curved masks */}
        <div className="relative z-10 w-full mt-10">
          <ImageMarquee photos={photos} onPhotoClick={handlePhotoClick} />
        </div>

        {/* Bottom section */}
        <div className="relative z-10 text-center mt-10 px-4 sm:px-6">
          <p className="max-w-xl mx-auto text-base sm:text-lg text-[#fcd5df] font-light leading-relaxed">
            Arrastrá las fotos para recorrerlas, o tocá una para un cumplido.
          </p>

          <button
            type="button"
            onClick={scrollToNextSection}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ff758f] hover:brightness-110 text-stone-950 font-bold text-sm shadow-lg shadow-[#ffd166]/20 hover:shadow-[#ffd166]/40 transition-all cursor-pointer"
          >
            <span>Abrir nuestra carta y recuerdos</span>
            <ArrowDown className={`w-4 h-4 text-stone-900 ${reduced ? '' : 'animate-bounce'}`} />
          </button>
        </div>

        {/* Floating compliment over the clicked photo */}
        <AnimatePresence>
          {activeCompliment && (
            <motion.div
              key={activeCompliment.id}
              initial={{ opacity: 0, scale: 0.6, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: activeCompliment.x,
                top: activeCompliment.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 60
              }}
              className="pointer-events-none px-4 py-2 rounded-2xl bg-black/90 border border-[#ffd166] text-[#fff4d1] shadow-2xl backdrop-blur-md font-serif text-sm sm:text-base font-semibold text-center max-w-[80vw]"
            >
              {activeCompliment.text}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
};
