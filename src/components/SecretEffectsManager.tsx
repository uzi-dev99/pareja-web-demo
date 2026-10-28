import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Heart,
  Edit3,
  X,
  Lock,
  Unlock,
  Smile,
  Cake,
  Flame,
  Cat
} from 'lucide-react';
import { audioEngine } from '../utils/audioSynth';
import { audioPlayer } from '../utils/audioPlayer';

export interface SecretEffectsManagerProps {
  isEditMode: boolean;
  onToggleEditMode: (value?: boolean) => void;
  // ponytail: onOpenMusicLibrary used to open MusicLibraryModal from
  // the cheatsheet FAB. Both now live in MusicPlayerFab's full modal,
  // so the prop is gone. Kept as optional for backwards compat with
  // App.tsx callers that still pass it.
  onOpenMusicLibrary?: () => void;
}

export const openSecretCheatSheet = () => {
  // ponytail: legacy export kept for callers that haven't migrated to
  // the music-player FAB yet. It is no longer wired to a UI element.
  void 0;
};

interface ToastMessage {
  id: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle: string;
  badge?: string;
  accentColor: string;
}

interface FloatingParticle {
  id: number;
  type: 'heart' | 'kiss' | 'paw' | 'star' | 'cake';
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
}

export const SecretEffectsManager: React.FC<SecretEffectsManagerProps> = ({
  isEditMode,
  onToggleEditMode,
  onOpenMusicLibrary
}) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [isHugActive, setIsHugActive] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const hugTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    const newToast: ToastMessage = { ...msg, id: Date.now() };
    setToast(newToast);

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4800);
  }, []);

  const spawnParticles = useCallback((type: FloatingParticle['type'], count: number = 8) => {
    const newItems: FloatingParticle[] = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      type,
      x: 10 + Math.random() * 80, // % from left
      y: 65 + Math.random() * 25, // % from top
      size: type === 'paw' ? 28 + Math.random() * 12 : 24 + Math.random() * 16,
      rotation: (Math.random() - 0.5) * 45,
      delay: i * 0.08
    }));

    setParticles((prev) => [...prev, ...newItems]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 3800);
  }, []);

  // TRIGGER EFFECTS HANDLER
  const triggerEffect = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase().trim();

      // 1. EDIT MODE TOGGLE ('editar', 'edit', 'edicion')
      if (['editar', 'edit', 'edicion'].includes(cmd)) {
        const nextState = !isEditMode;
        onToggleEditMode(nextState);
        audioEngine.playModeToggleSound(nextState);

        if (nextState) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.9 },
            colors: ['#ffd166', '#ff85a1', '#ffffff']
          });
          showToast({
            icon: Edit3,
            title: 'Modo Edición Activado',
            subtitle:
              'Ahora puedes añadir nuevos recuerdos en la cronología y redactar nuevas cartas íntimas.',
            badge: 'Admin / Creador',
            accentColor: '#ffd166'
          });
        } else {
          showToast({
            icon: Lock,
            title: 'Modo Lectura Activo',
            subtitle:
              'Las herramientas de edición ahora están ocultas para Sam, disfrutando una lectura limpia.',
            badge: 'Vista Sam',
            accentColor: '#ff85a1'
          });
        }
        return;
      }

      // 2. AMOR / LOVE
      if (['amor', 'love', 'teamo'].includes(cmd)) {
        audioEngine.playHeartSound();
        confetti({
          particleCount: 110,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ff85a1', '#ff4d6d', '#ffd166', '#ffffff', '#ffccd5']
        });
        spawnParticles('heart', 12);
        showToast({
          icon: Heart,
          title: 'Amor Infinito',
          subtitle: 'GRACIAS POR ESTE PRESENTE DISNEY AL LADO TUYO 🥺🫶',
          accentColor: '#ff4d6d'
        });
        return;
      }

      // 3. BESO / BESOS / KISS
      if (['beso', 'besos', 'kiss'].includes(cmd)) {
        audioEngine.playKissSound();
        spawnParticles('kiss', 10);
        showToast({
          icon: Flame,
          title: 'BESO MOJADOO',
          subtitle: 'Besitos tiernos y mojados que tan adicto me hacen',
          accentColor: '#ff758f'
        });
        return;
      }

      // 4. CANELA / TRUFA / MICHIS / GATOS
      if (['canela', 'trufa', 'michis', 'michi', 'gatos', 'gato'].includes(cmd)) {
        audioEngine.playPurrSound();
        spawnParticles('paw', 9);
        showToast({
          icon: Cat,
          title: 'Canela & Trufa',
          subtitle: '¡Los michis de la casa te mandan ronroneos, masajitos con sus patitas y mucho amor!',
          accentColor: '#f77f00'
        });
        return;
      }

      // 5. COPO (gatita blanca) — michi purr, soft tones, slightly brighter chord.
      // ponytail: she used to summon a different branch (city memories +
      // gallery redirect). Now she is part of the michi family and purrs
      // like the rest.
      if (['copo', 'playa'].includes(cmd)) {
        audioEngine.playPurrSound(1.15);
        spawnParticles('paw', 9);
        showToast({
          icon: Cat,
          title: 'Copo',
          subtitle: 'Soy una gordita feliz que te manda patitas llenas de cariño 🩶',
          accentColor: '#f5f5f4'
        });
        return;
      }

      // 6. NUBE (gatita gris) — michi purr, slate tones, slightly lower chord.
      if (['nube', 'norte'].includes(cmd)) {
        audioEngine.playPurrSound(0.85);
        spawnParticles('paw', 9);
        showToast({
          icon: Cat,
          title: 'Nube',
          subtitle: 'La gatita gris te hace el "masajito" con sus patitas y ronronea bien fuerte 🤍',
          accentColor: '#94a3b8'
        });
        return;
      }

      // 7. MAGIA / ESTRELLAS / CIELO
      if (['magia', 'magic', 'estrellas', 'cielo'].includes(cmd)) {
        audioEngine.playMagicSparkleSound();
        spawnParticles('star', 12);
        showToast({
          icon: Sparkles,
          title: 'Pura Magia',
          subtitle: 'No fue casualidad, estaba predestinado, teníamos que ser equipo de por vida, todo es mágico con vos',
          accentColor: '#ffd166'
        });
        return;
      }

      // 8. CUMPLE / CUMPLEAÑOS / FIESTA
      if (['cumple', 'cumpleaños', 'cumpleanos', 'fiesta', 'torta'].includes(cmd)) {
        audioEngine.playPartyFanfare();
        confetti({
          particleCount: 140,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#ff85a1', '#70d6ff', '#ffd166', '#e7c6ff', '#ff70a6']
        });
        spawnParticles('cake', 8);
        showToast({
          icon: Cake,
          title: '¡Muy Feliz Cumpleaños mí vida!',
          subtitle: '9 de Septiembre: ¡Festejamos tu vida, tu sonrisa y todo lo hermoso que sos!',
          accentColor: '#ff85a1'
        });
        return;
      }

      // 9. ABRAZO / ABRAZOS / HUG
      if (['abrazo', 'abrazos', 'hug'].includes(cmd)) {
        audioEngine.playHeartSound();
        setIsHugActive(true);
        if (hugTimeoutRef.current) window.clearTimeout(hugTimeoutRef.current);
        hugTimeoutRef.current = window.setTimeout(() => setIsHugActive(false), 3000);

        showToast({
          icon: Smile,
          title: 'Un Abrazo Apretado',
          subtitle: 'El rincón más seguro, cálido y reconfortante del mundo siempre es entre tus brazos.',
          accentColor: '#ffd166'
        });
        return;
      }

      // 10. PAREJA
      if (['pareja'].includes(cmd)) {
        audioEngine.playHeartSound();
        spawnParticles('heart', 14);
        showToast({
          icon: Heart,
          title: 'Dedicado a Sam',
          subtitle: 'Sos la persona más dulce, linda y luminosa. ¡Gracias por ser como sos!',
          accentColor: '#ff85a1'
        });
        return;
      }

      // 11. DEMO
      if (['demo'].includes(cmd)) {
        audioEngine.playWhisperSound();
        showToast({
          icon: Sparkles,
          title: 'Mensaje de Alex',
          subtitle: 'Prometo cuidarte, escucharte, hacerte reír y quererte siempre.',
          accentColor: '#ffd166'
        });
        return;
      }

      // 12. NEXT (audio playlist — skip to next random song)
      if (['next'].includes(cmd)) {
        audioPlayer.next();
        showToast({
          icon: Sparkles,
          title: '🎵 Cambiando de canción…',
          subtitle: 'Una nueva melodía para seguir acompañando este momento.',
          accentColor: '#ffd166'
        });
        return;
      }
    },
    [isEditMode, onToggleEditMode, showToast, spawnParticles, onOpenMusicLibrary]
  );

  // ponytail: the music player FAB fires `trigger-secret-effect` with
  // { detail: cmd } when the user taps a cheatsheet command in the
  // full modal. The manager still owns the effect dispatch + particle
  // + toast logic so the FAB stays a thin shell.
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === 'string') {
        triggerEffect(ce.detail);
      }
    };
    window.addEventListener('trigger-secret-effect', handleTrigger);
    return () => window.removeEventListener('trigger-secret-effect', handleTrigger);
  }, [triggerEffect]);

  // KEYBOARD BUFFER LISTENER
  useEffect(() => {
    let keyBuffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in inputs or textareas
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA'].includes(tag)) return;

      // Hotkey shortcut for Edit Mode: Ctrl + E or Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        triggerEffect('editar');
        return;
      }

      // Append typed letter
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > 20) {
          keyBuffer = keyBuffer.slice(-20);
        }

        // Check against our list of secret triggers
        const knownKeywords = [
          'editar',
          'edicion',
          'edit',
          'pareja',
          'demo',
          'amor',
          'love',
          'besos',
          'beso',
          'kiss',
          'canela',
          'trufa',
          'michis',
          'michi',
          'gatos',
          'copo',
          'nube',
          'magia',
          'estrellas',
          'cumpleaños',
          'cumpleanos',
          'cumple',
          'abrazos',
          'abrazo',
          'next'
        ];

        for (const kw of knownKeywords) {
          if (keyBuffer.endsWith(kw)) {
            triggerEffect(kw);
            keyBuffer = '';
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerEffect]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      if (hugTimeoutRef.current) window.clearTimeout(hugTimeoutRef.current);
    };
  }, []);

  // ponytail: the cheatsheet command list moved to MusicPlayerFab
  // (full modal). The manager keeps only the effect-dispatch logic
  // and the visual fx (toast, particles, hug glow).

  return (
    <>
      {/* 1. WARM SCREEN HUG GLOW OVERLAY */}
      <AnimatePresence>
        {isHugActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 pointer-events-none z-50 shadow-[inset_0_0_120px_rgba(255,133,161,0.45)] bg-gradient-to-b from-[#ff85a1]/15 via-transparent to-[#ff85a1]/15"
          />
        )}
      </AnimatePresence>

      {/* 2. FLOATING PARTICLES (Kisses, Paws, Stars, Cakes, Hearts) */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 0,
                scale: 0.3,
                x: `${p.x}vw`,
                y: `${p.y}vh`,
                rotate: p.rotation
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.3, 1.15, 1, 0.85],
                y: `${p.y - 35}vh`,
                rotate: p.rotation + (p.type === 'kiss' ? 25 : -15)
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 3.2,
                delay: p.delay,
                ease: 'easeOut'
              }}
              className="absolute select-none flex items-center justify-center filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
              style={{ width: `${p.size}px`, height: `${p.size}px` }}
            >
              {p.type === 'kiss' && <Flame className="w-full h-full text-[#ff758f] fill-[#ff758f]/80" />}
              {p.type === 'paw' && <Cat className="w-full h-full text-[#f77f00] fill-[#f77f00]/30" />}
              {p.type === 'heart' && <Heart className="w-full h-full text-[#ff4d6d] fill-[#ff4d6d]" />}
              {p.type === 'star' && <Sparkles className="w-full h-full text-[#ffd166] fill-[#ffd166]/40" />}
              {p.type === 'cake' && <Cake className="w-full h-full text-[#ff85a1]" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. FLOATING TOAST BANNER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="fixed top-20 inset-x-4 max-w-md mx-auto z-50 pointer-events-auto"
          >
            <div
              className="rounded-3xl p-4 sm:p-5 bg-[#1b0c19]/95 backdrop-blur-xl border shadow-2xl flex items-start gap-3.5 relative overflow-hidden"
              style={{ borderColor: `${toast.accentColor}55`, boxShadow: `0 14px 40px -10px ${toast.accentColor}33` }}
            >
              {/* Glowing decorative edge */}
              <div
                className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-80"
                style={{ color: toast.accentColor }}
              />

              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${toast.accentColor}20`,
                  borderColor: `${toast.accentColor}40`
                }}
              >
                <toast.icon className="w-5 h-5" style={{ color: toast.accentColor }} />
              </div>

              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
                    {toast.title}
                  </h4>
                  {toast.badge && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                      style={{
                        backgroundColor: `${toast.accentColor}25`,
                        borderColor: `${toast.accentColor}50`,
                        color: toast.accentColor
                      }}
                    >
                      {toast.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#fcd5df] font-light leading-relaxed">
                  {toast.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-stone-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. PERSISTENT EDIT MODE PILL (WHEN EDIT MODE IS ACTIVE) */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-40"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#231221]/95 backdrop-blur-xl border border-[#ffd166]/60 shadow-[0_10px_35px_rgba(255,209,102,0.25)] text-white text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffd166] animate-pulse" />
              <div className="flex flex-col">
                <span className="font-bold font-serif text-[#ffd166] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Modo Edición Activo
                </span>
                <span className="text-[10px] text-stone-300 font-light hidden sm:inline">
                  Botones de agregar recuerdos y drops visibles
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerEffect('editar')}
                className="ml-2 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Desactivar Modo Edición"
              >
                <Lock className="w-3 h-3 text-[#ff85a1]" />
                <span>Salir</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. (removed) The standalone codelist FAB was retired in favour
          of the music-player FAB's full modal (see MusicPlayerFab.tsx
          → FullPlayerModal). The cheatsheet is now reachable only via
          the music FAB → mini → full path. */}

    </>
  );
};
