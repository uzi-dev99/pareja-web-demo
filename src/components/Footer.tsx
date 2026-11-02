import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

/**
 * PWD-496 — barra mínima del pie (la del prompt): copyright a la izquierda,
 * links y el corazón-easter-egg a la derecha. El bloque dedicado y la frase
 * que estaban acá viven ahora en el heading de la CTA (CtaSection).
 */
interface FooterProps {
  onHeartClick: () => void;
  heartClickCount: number;
}

const LINKS = [
  { href: '#carta', label: 'La carta' },
  { href: '#galeria', label: 'El álbum' },
  { href: '#gatos-sanctuary', label: 'Los gatos' }
];

export const Footer: React.FC<FooterProps> = ({ onHeartClick, heartClickCount }) => {
  return (
    <footer
      id="footer-section"
      className="relative border-t border-white/10 bg-[#0d050c] px-6 py-8 font-sans md:px-16 lg:px-24"
    >
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-xs font-light text-white/40">
          © 2026 Nuestro Álbum · Hecho con todo mi corazón
        </p>

        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="cursor-pointer text-xs font-light text-white/40 transition-colors hover:text-white/70"
            >
              {link.label}
            </a>
          ))}

          {/* Heart Interactive Easter Egg Trigger */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onHeartClick}
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#ff85a1]/35 bg-[#ff85a1]/15 text-[#ff85a1] shadow-lg shadow-[#ff85a1]/15"
            aria-label="Corazón interactivo"
            title="¡Toca varias veces para desatar una lluvia de amor!"
          >
            <Heart className="h-4 w-4 fill-[#ff85a1]/50 text-[#ff85a1]" />
            {heartClickCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff85a1] text-[10px] font-bold text-black shadow">
                {heartClickCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </footer>
  );
};
