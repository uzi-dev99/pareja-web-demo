import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { audioEngine } from '../utils/audioSynth';

export interface WhisperItem {
  id: number;
  text: string;
  x: number;
  y: number;
  icon?: string;
}

const DEFAULT_SECRET_WHISPERS = [
  '¡Te amo infinito, Sam! 💖',
  'Mi lugar favorito es a tu lado ☕✨',
  'Desde el 14 de Febrero y para siempre 💍',
  'Nuestros 4 michis te adoran 🐾',
  'Sos mi coincidencia más hermosa 🌷',
  'Tu sonrisa me alegra todo el día 🌟',
  'Gracias por cada aventura juntos ✈️',
  'Sos arte puro, hermosa 🎨💕',
  '¡Feliz cumpleaños número 25! 🎂👑',
  'Cada segundo con vos vale oro ⏳💛',
  'Canela, Trufa, Nube y Copo mandan ronroneos 🐱✨',
  'Prometo hacerte sonreír siempre 🌹'
];

let globalWhisperTrigger: ((x: number, y: number, customText?: string) => void) | null = null;

export const triggerClickWhisper = (e: React.MouseEvent | { clientX: number; clientY: number }, customText?: string) => {
  if (globalWhisperTrigger) {
    globalWhisperTrigger(e.clientX, e.clientY, customText);
  }
};

export const ClickWhisperOverlay: React.FC = () => {
  const [whispers, setWhispers] = useState<WhisperItem[]>([]);

  const spawn = useCallback((x: number, y: number, customText?: string) => {
    const text = customText || DEFAULT_SECRET_WHISPERS[Math.floor(Math.random() * DEFAULT_SECRET_WHISPERS.length)];
    const id = Date.now() + Math.random();

    audioEngine.playWhisperSound();

    setWhispers((prev) => [
      ...prev.slice(-6),
      {
        id,
        text,
        x: Math.min(Math.max(x, 140), window.innerWidth - 140),
        y: Math.max(y - 20, 60),
      }
    ]);

    window.setTimeout(() => {
      setWhispers((prev) => prev.filter((w) => w.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    globalWhisperTrigger = spawn;
    return () => {
      globalWhisperTrigger = null;
    };
  }, [spawn]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[99998] overflow-hidden">
      <AnimatePresence>
        {whispers.map((w) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -24 }}
            exit={{ opacity: 0, scale: 0.85, y: -45 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: `${w.x}px`,
              top: `${w.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="select-none px-3.5 py-1.5 rounded-full bg-[#1b0c19]/95 border border-[#ffd166]/60 shadow-[0_0_20px_rgba(255,209,102,0.4)] backdrop-blur-md flex items-center gap-1.5"
          >
            <span className="text-xs sm:text-sm font-semibold text-[#fff4d1] drop-shadow-sm whitespace-nowrap">
              {w.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
