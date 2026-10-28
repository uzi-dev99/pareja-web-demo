import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, ChevronLeft, ChevronRight, ArrowDown, Film, Play } from 'lucide-react';
import { siteMeta } from '../data/content';
import { audioEngine } from '../utils/audioSynth';
import { triggerClickWhisper } from './ClickWhisper';
import { usePhotos } from '../hooks/usePhotos';

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
  x: number;
  y: number;
}

export const Hero: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCompliment, setActiveCompliment] = useState<FloatingPhotoCompliment | null>(null);

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
  const totalMedia = allMedia.length;

  const handleNext = () => {
    if (totalMedia === 0) return;
    setActiveIdx((prev) => (prev + 1) % totalMedia);
  };

  const handlePrev = () => {
    if (totalMedia === 0) return;
    setActiveIdx((prev) => (prev - 1 + totalMedia) % totalMedia);
  };

  const scrollToNextSection = () => {
    const letterEl = document.querySelector('#carta') || document.querySelector('#tiempo');
    if (letterEl) {
      letterEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle clicking inside photo to display a sweet compliment
  const handlePhotoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 50), rect.width - 50);
    const y = Math.min(Math.max(e.clientY - rect.top, 50), rect.height - 50);

    const randomCompliment = HERO_COMPLIMENTS[Math.floor(Math.random() * HERO_COMPLIMENTS.length)];
    const complimentId = Date.now();

    audioEngine.playSparkle();

    setActiveCompliment({
      id: complimentId,
      text: randomCompliment,
      x,
      y
    });

    window.setTimeout(() => {
      setActiveCompliment((prev) => (prev?.id === complimentId ? null : prev));
    }, 3000);
  };

  // ponytail: apiPhotos is [] on first render (before fetch resolves) and also if
  // the server is offline. Render a placeholder instead of crashing.
  const currentMedia = allMedia[activeIdx] ?? allMedia[0] ?? null;

  return (
    <section
      id="inicio"
      className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 pt-24 pb-12 overflow-hidden"
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
            animate={{
              y: [0, -18, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [0.9, 1.25, 0.9]
            }}
            transition={{
              duration: 3.5 + i * 0.7,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {i % 2 === 0 ? (
              <Sparkles className="w-3.5 h-3.5 text-[#ffd166]/70" />
            ) : (
              <Heart className="w-3 h-3 text-[#ff758f]/60 fill-[#ff758f]/30" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Header Information: "Nuestro Álbum" */}
      <div className="relative z-10 w-full max-w-5xl mx-auto text-center mt-2 mb-8">
        {/* Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd166]/10 border border-[#ffd166]/30 backdrop-blur-xl mb-5 shadow-lg shadow-[#ffd166]/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
          <span className="text-xs font-mono font-semibold text-[#fff4d1] tracking-widest uppercase flex items-center gap-1.5">
            <span>{siteMeta.herName} & {siteMeta.hisName} •</span>
            <span className="fx-gold-glow text-xs tracking-wider">2026</span>
          </span>
          <Heart className="w-3.5 h-3.5 text-[#ff85a1] fill-[#ff85a1]" />
        </motion.div>

        {/* Title: Nuestro Álbum (Refined Golden Typography with Hidden Click Whisper) */}
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

        {/* Subtitle */}
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
            animate={{ scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <Heart className="inline w-6 h-6 fill-[#ff85a1]" />
          </motion.span>
        </motion.p>
      </div>

      {/* =========================================================================
          INFINITE MEDIA CAROUSEL (CLEAN PHOTOS ONLY - CLICK FOR COMPLIMENTS)
         ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative z-10 w-full max-w-6xl mx-auto my-auto"
      >
        {/* Desktop 5-Card Infinite Panoramic Ribbon */}
        <div className="hidden md:flex items-center justify-center gap-4 lg:gap-6 px-2 py-4 relative">
          {[-2, -1, 0, 1, 2].map((offset) => {
            const index = (activeIdx + offset + totalMedia) % totalMedia;
            const item = allMedia[index];
            const isCenter = offset === 0;
            const isFlanking = Math.abs(offset) === 1;

            if (!item) return null;

            return (
              <motion.div
                key={`hero-slot-${offset}-${item.id}`}
                layout
                onClick={(e) => {
                  if (isCenter) {
                    handlePhotoClick(e);
                  } else {
                    setActiveIdx(index);
                  }
                }}
                className={`relative rounded-3xl cursor-pointer transition-all duration-500 overflow-hidden select-none group ${
                  isCenter
                    ? 'w-[360px] lg:w-[430px] aspect-[4/5] z-30 ring-2 ring-[#ffd166]/60 shadow-[0_20px_50px_rgba(255,209,102,0.25)]'
                    : isFlanking
                    ? 'w-[220px] lg:w-[260px] aspect-[4/5] z-20 opacity-75 hover:opacity-100 hover:scale-105'
                    : 'w-[160px] lg:w-[190px] aspect-[4/5] z-10 opacity-40 hover:opacity-85'
                }`}
                style={{
                  transform: `rotate(${offset * 3.5}deg) translateY(${Math.abs(offset) * 14}px)`,
                }}
              >
                {/* Washi Tape Accent on Center Card */}
                {isCenter && <div className="washi-tape-pink" />}

                {/* Pure Photo/Video Frame (Zero tags, clean border) */}
                <div className="w-full h-full bg-[#1b0c19] rounded-3xl p-2.5 flex flex-col border border-white/10 group-hover:border-[#ffd166]/50 transition-colors shadow-2xl">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#120712]">
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full relative">
                        <video
                          src={item.filePath}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] flex items-center gap-1 font-mono">
                          <Film className="w-3 h-3 text-[#ffd166]" />
                          <span>Video</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.thumbnailUrl || item.filePath}
                        alt="Momento especial de nuestro álbum"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    )}

                    {/* Subtle click cue on center card hover */}
                    {isCenter && (
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-[#fff4d1] text-xs font-medium border border-[#ffd166]/40 flex items-center gap-1.5 shadow-lg">
                          <Heart className="w-3.5 h-3.5 text-[#ff85a1] fill-[#ff85a1]" />
                          <span>Touch me para cumplido</span>
                        </span>
                      </div>
                    )}

                    {/* Floating Compliment inside center photo */}
                    <AnimatePresence>
                      {isCenter && activeCompliment && (
                        <motion.div
                          key={activeCompliment.id}
                          initial={{ opacity: 0, scale: 0.6, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -20 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          style={{
                            position: 'absolute',
                            left: `${activeCompliment.x}px`,
                            top: `${activeCompliment.y}px`,
                            transform: 'translate(-50%, -50%)',
                            maxWidth: '85%'
                          }}
                          className="z-40 px-4 py-2 rounded-2xl bg-black/90 border border-[#ffd166] text-[#fff4d1] shadow-2xl backdrop-blur-md font-serif text-sm sm:text-base font-semibold text-center pointer-events-none"
                        >
                          {activeCompliment.text}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Single Card Carousel with Touch Click for Compliment */}
        {/* ponytail: skip the whole mobile carousel if there are no photos yet — avoids
            the `currentMedia is undefined` crash on first render (and on an empty
            DB after the user deletes everything). */}
        {currentMedia && (
        <div className="md:hidden relative w-full max-w-sm mx-auto px-4">
          <div
            onClick={handlePhotoClick}
            className="relative aspect-[4/5] w-full rounded-3xl p-2.5 glass-card shadow-2xl overflow-hidden cursor-pointer"
          >
            <div className="washi-tape-pink" />
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#120712]">
              <AnimatePresence mode="wait">
                {currentMedia.mediaType === 'video' ? (
                  <motion.div
                    key={currentMedia.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full relative"
                  >
                    <video
                      src={currentMedia.filePath}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] flex items-center gap-1">
                      <Film className="w-3 h-3 text-[#ffd166]" />
                      <span>Video</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.img
                    key={currentMedia.id}
                    src={currentMedia.thumbnailUrl || currentMedia.filePath}
                    alt="Foto de nuestro álbum"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full object-cover"
                  />
                )}
              </AnimatePresence>

              {/* Tap hint */}
              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-[#fff4d1] border border-white/10">
                  ✨ Toca la foto para un cumplido
                </span>
              </div>

              {/* Floating Compliment on Mobile */}
              <AnimatePresence>
                {activeCompliment && (
                  <motion.div
                    key={activeCompliment.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      position: 'absolute',
                      left: `${activeCompliment.x}px`,
                      top: `${activeCompliment.y}px`,
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '90%'
                    }}
                    className="z-40 px-4 py-2 rounded-2xl bg-black/90 border border-[#ffd166] text-[#fff4d1] shadow-2xl backdrop-blur-md font-serif text-sm font-semibold text-center pointer-events-none"
                  >
                    {activeCompliment.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        )}

        {/* Infinite Carousel Navigation Arrows */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto o video anterior (Infinito)"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-[#ffd166]/20 border border-white/15 hover:border-[#ffd166]/50 flex items-center justify-center text-white transition-all backdrop-blur-md hover:scale-105 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-[#ffd166]" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Siguiente foto o video (Infinito)"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-[#ffd166]/20 border border-white/15 hover:border-[#ffd166]/50 flex items-center justify-center text-white transition-all backdrop-blur-md hover:scale-105 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-[#ffd166]" />
          </button>
        </div>
      </motion.div>

      {/* Call to Action Button */}
      <div className="relative z-10 text-center mt-8">
        <motion.button
          type="button"
          onClick={scrollToNextSection}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ff758f] hover:brightness-110 text-stone-950 font-bold text-sm shadow-lg shadow-[#ffd166]/20 hover:shadow-[#ffd166]/40 transition-all cursor-pointer"
        >
          <span>Abrir nuestra carta y recuerdos</span>
          <ArrowDown className="w-4 h-4 animate-bounce text-stone-900" />
        </motion.button>
      </div>
    </section>
  );
};
