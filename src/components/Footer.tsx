import React from 'react';
import { motion } from 'motion/react';
import { Heart, Lock, Sparkles, Cat } from 'lucide-react';
import { siteMeta } from '../data/content';
// ponytail: openSecretCheatSheet (legacy export from SecretEffectsManager) is
// no longer wired in the Footer — the codelist lives inside the music
// player's full modal. Removed the import and the in-Footer button.
interface FooterProps {
  onOpenSecretModal: () => void;
  onHeartClick: () => void;
  heartClickCount: number;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenSecretModal,
  onHeartClick,
  heartClickCount
}) => {
  return (
    <footer id="footer-section" className="relative mt-28 border-t border-[#ffd166]/20 bg-[#0d0711] pt-14 pb-28 text-center">
      <div className="max-w-4xl mx-auto px-4">
        {/* Heart Interactive Easter Egg Trigger */}
        <div className="flex justify-center mb-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onHeartClick}
            className="w-13 h-13 rounded-full bg-[#ff85a1]/15 border border-[#ff85a1]/35 flex items-center justify-center text-[#ff85a1] shadow-lg shadow-[#ff85a1]/15 cursor-pointer relative"
            aria-label="Corazón interactivo"
            title="¡Toca varias veces para desatar una lluvia de amor!"
          >
            <Heart className="w-6 h-6 fill-[#ff85a1]/50 text-[#ff85a1]" />
            {heartClickCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-[#ff85a1] text-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {heartClickCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Dedication Text */}
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">
          Hecho con todo mi corazón para{' '}
          <span className="fx-gold-shimmer" data-text="mi amor">
            mi amor
          </span>
        </h3>
        <p className="text-xs sm:text-sm text-[#fcd5df] font-light max-w-md mx-auto mb-6">
          "El te amo me queda chico, no existe palabra en el lenguaje humano para explicar lo que siento por vos."
        </p>

        {/* Discreet Actions: PIN access + music FAB hint */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-stone-400 pt-5 border-t border-[#ffd166]/15">
          <span>El año que decidimos cruzar caminos, te amoooo</span>
          <span>•</span>
          <span className="text-[#fff4d1] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
            <span>Toca el botón de música para trucos y canciones</span>
          </span>
          <span>•</span>
          <a
            href="#gatos-sanctuary"
            className="hover:text-[#ffd166] transition-colors flex items-center gap-1.5 cursor-pointer text-stone-300"
            title="Ir al santuario de los 4 gatos"
          >
            <Cat className="w-3.5 h-3.5 text-[#ffd166]" />
            <span>Ellos 🫶</span>
          </a>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenSecretModal}
            className="hover:text-[#ff85a1] transition-colors flex items-center gap-1.5 cursor-pointer text-stone-300"
            title="Abrir área secreta con PIN (0909)"
          >
            <Lock className="w-3.5 h-3.5 text-[#ff85a1]" />
            <span className="text-xs">Acceso Secreto (PIN)</span>
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-[11px] text-stone-300 mt-4 select-none">
          Pista: Escribe{' '}
          <kbd className="px-2 py-0.5 rounded bg-[#1e0e1a] border border-[#ffd166]/30 text-[#fff4d1] font-mono font-bold" data-text="amor">
            amor
          </kbd>{' '}
          o toca el botón de música abajo a la derecha para ver todos los trucos ✨
        </p>
      </div>
    </footer>
  );
};
