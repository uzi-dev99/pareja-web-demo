/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Hero } from './components/Hero';
import { SecretLetter } from './components/SecretLetter';
import { TimeCounter } from './components/TimeCounter';
import { Timeline } from './components/Timeline';
import { Gallery } from './components/Gallery';
import { Footer } from './components/Footer';
import { SecretCollageModal } from './components/SecretCollageModal';
import { MusicLibraryModal } from './components/MusicLibraryModal';
import { CustomCursor } from './components/CustomCursor';
import { AtmosphericBackground } from './components/AtmosphericBackground';
import { SecretEffectsManager } from './components/SecretEffectsManager';
import { CatTamagotchiBox } from './components/CatTamagotchiBox';
import { ClickWhisperOverlay } from './components/ClickWhisper';
import { MusicPlayerFab } from './components/MusicPlayerFab';
import { audioPlayer } from './utils/audioPlayer';
import { audioEngine } from './utils/audioSynth';

export default function App() {
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [musicLibraryOpen, setMusicLibraryOpen] = useState(false);
  const [galleryFilterMonth, setGalleryFilterMonth] = useState<string>('Todos');
  const [heartTapCount, setHeartTapCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pareja_edit_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Toggle Edit Mode handler
  const handleToggleEditMode = useCallback((explicitValue?: boolean) => {
    setIsEditMode((prev) => {
      const next = explicitValue !== undefined ? explicitValue : !prev;
      try {
        localStorage.setItem('pareja_edit_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ponytail: disable browser scroll restoration. By default the
  // browser remembers the scroll position when the user last refreshed
  // and restores it on the next load — so a user who scrolled down
  // to the cats card and then hit F5 would land back at the cats
  // instead of the home. We are a single-page narrative that always
  // opens at the top of the Hero, so we set scrollRestoration to
  // 'manual' and explicitly scroll to (0, 0) on every mount.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // ponytail: best-effort autoplay so the music starts as soon as the
  // user lands on the page, with no need to open the letter first.
  // playIfReady() awaits the cache before attempting play, so we do
  // not log "empty playlist" when refreshCache is still in flight.
  // Browsers (especially mobile) usually reject the first .play() if
  // there has been no user gesture, so we register a one-shot
  // listener for the first click/touch/scroll/key event and try
  // again there.
  useEffect(() => {
    audioPlayer.playIfReady().catch(() => {});

    const tryResume = () => {
      audioPlayer.playIfReady().catch(() => {});
      window.removeEventListener('click', tryResume);
      window.removeEventListener('touchstart', tryResume);
      window.removeEventListener('scroll', tryResume);
      window.removeEventListener('keydown', tryResume);
    };
    window.addEventListener('click', tryResume, { once: true });
    window.addEventListener('touchstart', tryResume, { once: true });
    window.addEventListener('scroll', tryResume, { once: true, passive: true });
    window.addEventListener('keydown', tryResume, { once: true });

    return () => {
      window.removeEventListener('click', tryResume);
      window.removeEventListener('touchstart', tryResume);
      window.removeEventListener('scroll', tryResume);
      window.removeEventListener('keydown', tryResume);
    };
  }, []);

  // Heart Easter egg: 3 taps triggers confetti + floating heart stickers!
  const handleHeartClick = useCallback(() => {
    audioEngine.playHeartSound();
    setHeartTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        // Trigger surprise celebration!
        confetti({
          particleCount: 85,
          spread: 95,
          origin: { y: 0.8 },
          colors: ['#ff85a1', '#ff4d6d', '#ffd166', '#ffffff', '#ffccd5']
        });

        // Add 7 floating stickers
        const newHearts = Array.from({ length: 7 }).map((_, i) => ({
          id: Date.now() + i,
          x: 15 + Math.random() * 70,
          y: 60 + Math.random() * 20
        }));
        setFloatingHearts((curr) => [...curr, ...newHearts]);

        setTimeout(() => {
          setFloatingHearts([]);
        }, 3500);

        return 0; // reset
      }
      return next;
    });
  }, []);

  // Link from timeline to filtered gallery
  const handleOpenGalleryMonth = (month: string) => {
    setGalleryFilterMonth(month);
    const galeriaEl = document.querySelector('#galeria');
    if (galeriaEl) {
      galeriaEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d050c] text-[#fdf2f4] selection:bg-[#ff85a1]/30 selection:text-[#ffe5ec] overflow-x-hidden font-sans">
      {/* Dynamic Parallax & Stardust Atmospheric Background Layer */}
      <AtmosphericBackground />

      {/* Custom Romantic Sparkling Mouse Cursor (Fine Pointers) */}
      <CustomCursor />

      {/* Floating Whispers / Secret Click Compliments Overlay */}
      <ClickWhisperOverlay />

      {/* Floating Animated Hearts Layer (Easter Egg) */}
      <AnimatePresence>
        {floatingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.8, y: -260 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.8, ease: 'easeOut' }}
            style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
            className="fixed z-50 pointer-events-none text-2xl select-none"
          >
            💖
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 1. Hero Section ("Nuestro Álbum", Wide Multi-Photo Spread) */}
      <Hero />

      {/* 2. Santuario de los 4 Michis (Tamagotchi Box Interactivo: Canela, Trufa, Copo y Nube) */}
      <CatTamagotchiBox />

      {/* 3. TimeCounter Section (still part of the home) */}
      <section id="tiempo" className="py-12 px-4 sm:px-6">
        <TimeCounter />
      </section>

      {/* 4. Interactive Monthly Timeline (Feb 2026 to Sept 16, 2026, Wide Two-Sided Layout & Birthday Photo Slot) */}
      <Timeline
        onOpenGalleryMonth={handleOpenGalleryMonth}
        isEditMode={isEditMode}
      />

      {/* 5. Secret Letter (the "carta" — sits between the timeline recap and the photo wall) */}
      <SecretLetter isEditMode={isEditMode} />

      {/* 6. Masonry Photo Gallery */}
      <Gallery initialMonthFilter={galleryFilterMonth} isEditMode={isEditMode} />

      {/* 6. Secret Effects & Edit Mode Manager (Commands: editar, amor, beso, canela, trufa, copo, nube, magia, cumple, abrazo, next) */}
      <SecretEffectsManager
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        onOpenMusicLibrary={() => setMusicLibraryOpen(true)}
      />

      {/* 7. Footer & Secret Easter Egg Trigger */}
      <Footer
        onOpenSecretModal={() => setSecretModalOpen(true)}
        onHeartClick={handleHeartClick}
        heartClickCount={heartTapCount}
      />

      {/* 8. Secret Collage Polaroid Wall Modal (Protected by PIN 0909) */}
      <SecretCollageModal
        isOpen={secretModalOpen}
        onClose={() => setSecretModalOpen(false)}
        isEditMode={isEditMode}
      />

      {/* 9. Music Library Modal (edit-mode song upload/preview/rename/delete) */}
      <MusicLibraryModal
        isOpen={musicLibraryOpen}
        onClose={() => setMusicLibraryOpen(false)}
      />

      {/* 10. Floating Music Player FAB (bottom-right, mirrors the audioPlayer singleton) */}
      <MusicPlayerFab
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
      />
    </div>
  );
}
