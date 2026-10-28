import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Heart, Sparkles, Upload } from 'lucide-react';
import { Photo } from '../types';
import { audioEngine } from '../utils/audioSynth';
import { compressImage } from '../utils/compressImage';

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
            <img
              src={currentImage.thumbnailUrl || currentImage.filePath}
              alt={currentImage.caption || eventTitle}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
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
