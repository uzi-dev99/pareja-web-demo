import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Clock, Sparkles, Flame } from 'lucide-react';
import { START_DATE, siteMeta } from '../data/content';
import { calculateTimeElapsed } from '../utils/timeCounter';
import { TimeElapsed } from '../types';

interface TimeCounterProps {
  compact?: boolean;
}

export const TimeCounter: React.FC<TimeCounterProps> = ({ compact = false }) => {
  const [time, setTime] = useState<TimeElapsed>(() => calculateTimeElapsed(START_DATE));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculateTimeElapsed(START_DATE));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const units = [
    { label: 'Meses', value: time.months, desc: 'Llenos de amor' },
    { label: 'Días', value: time.days, desc: 'Inolvidables' },
    { label: 'Horas', value: time.hours, desc: 'Compartidas' },
    { label: 'Minutos', value: time.minutes, desc: 'De risas' },
    { label: 'Segundos', value: time.seconds, desc: 'De magia' },
  ];

  if (compact) {
    return (
      <div
        id="time-counter-compact"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#200f1c]/90 border border-[#ff85a1]/40 backdrop-blur-md shadow-[0_0_20px_rgba(255,133,161,0.25)] text-xs font-medium text-[#fdf2f4]"
      >
        <Heart className="w-3.5 h-3.5 text-[#ff85a1] fill-[#ff85a1] animate-pulse" />
        <span className="text-[#ff85a1] font-bold">{time.totalDays}</span> días juntos
        <span className="text-stone-500">•</span>
        <span className="tabular-nums font-mono text-[11px] text-[#fcd5df]">
          {String(time.hours).padStart(2, '0')}:{String(time.minutes).padStart(2, '0')}:{String(time.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div
      id="time-counter-full"
      className="w-full max-w-5xl mx-auto p-6 sm:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-b from-[#240e20]/90 via-[#180916]/95 to-[#120610]/95 border border-[#ff85a1]/35 shadow-[0_0_50px_rgba(255,133,161,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl"
    >
      {/* Dynamic Animated Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#ff85a1]/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#ff4d6d]/15 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff85a1]/80 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-8 text-center sm:text-left relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#ff85a1]/20 to-[#ff4d6d]/20 border border-[#ff85a1]/40 text-[#ff85a1] text-xs font-bold uppercase tracking-wider mb-2.5 shadow-[0_0_15px_rgba(255,133,161,0.2)]">
            <Heart className="w-3.5 h-3.5 fill-[#ff85a1] animate-bounce" />
            <span>Nuestra cuenta de amor en tiempo real</span>
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Tiempo transcurrido desde que tengo la novia más <span className="fx-chrome" data-text="linda">linda</span> del mundo mundial
          </h3>
          <p className="text-sm sm:text-base lg:text-lg text-[#fcd5df] mt-2 font-light max-w-xl">
            Desde aquel {siteMeta.anniversaryDate}, sumando momentos únicos junto a vos y nuestros cuatro michis.
          </p>
        </div>

        {/* Total Days Highlight Badge */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-br from-[#33142c]/90 to-[#200c1c]/90 border border-[#ff85a1]/40 shadow-[0_0_25px_rgba(255,133,161,0.25)] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#ff85a1]/20 border border-[#ff85a1]/50 flex items-center justify-center text-[#ff85a1]">
            <Flame className="w-5 h-5 fill-[#ff85a1] animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fcd5df]">
              Días de complicidad
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight flex items-center gap-1.5">
              <span className="fx-sundial" data-text={String(time.totalDays)}>
                {time.totalDays}
              </span>
              <span className="text-xs font-normal font-sans text-[#ff85a1]">días juntos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Units Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 relative z-10">
        {units.map((unit, idx) => (
          <div
            key={unit.label}
            className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-[#1c0b19]/80 border border-[#ff85a1]/25 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group hover:border-[#ff85a1]/60 hover:shadow-[0_0_25px_rgba(255,133,161,0.35)] transition-all duration-300 relative overflow-hidden"
          >
            {/* Subtle top indicator line */}
            <div className="absolute top-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-[#ff85a1]/60 to-transparent group-hover:via-[#ff85a1] transition-all" />

            <div className="h-12 sm:h-14 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={unit.value}
                  initial={{ y: 16, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -16, opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  data-text={String(unit.value).padStart(2, '0')}
                  className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-[0_0_12px_rgba(255,133,161,0.4)] fx-chrome"
                >
                  {String(unit.value).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#ff85a1] uppercase tracking-wider mt-1.5">
              {unit.label}
            </span>
            <span className="text-[10px] text-[#fcd5df]/70 font-light mt-0.5 hidden sm:block">
              {unit.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
