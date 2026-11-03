/**
 * PWD-496 — cierre cinematográfico del álbum. PWD-522 — el fondo liquid se
 * mudó al hero: acá queda un fondo calmo (el gradiente oscuro del sitio),
 * el heading serif itálico centrado, los dos botones liquid-glass cableados
 * a acciones que el sitio ya tenía y la barra mínima del footer.
 *
 * El copy es del sitio (dedicatoria + frase), en español.
 */

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

// ponytail: los estilos liquid-glass viven acá y no en index.css porque la
// tarjeta no puede tocar ese archivo. Un <style> sin capa gana a las
// utilidades de Tailwind, por eso el hover también está declarado acá.
const LIQUID_GLASS_CSS = `
.liquid-glass-strong {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border: none;
  box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
  transition: background-color 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.liquid-glass-strong:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.liquid-glass-strong::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.2) 80%,
    rgba(255,255,255,0.5) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
`;

interface CtaSectionProps {
  /** Abre el collage protegido por PIN (acción que ya existía en el footer). */
  onOpenSecretModal: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenSecretModal }) => {
  const scrollToGallery = () => {
    document.querySelector('#galeria')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="cta"
      className="relative z-10 isolate overflow-hidden bg-[#0d050c] px-6 py-24 text-center md:px-16 md:py-32 lg:px-24"
    >
      <style>{LIQUID_GLASS_CSS}</style>

      {/* Fondo calmo (PWD-522): el gradiente oscuro del sitio, sin video */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(255,113,140,0.12) 0%, rgba(13,5,12,0) 70%)'
        }}
      />

      <div className="relative z-10">
        <h2 className="mx-auto mb-4 max-w-3xl font-serif text-5xl italic leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Hecho con todo mi corazón para{' '}
          <span className="fx-gold-shimmer" data-text="mi amor">
            mi amor
          </span>
        </h2>
        <p
          className="mx-auto mb-8 max-w-xl font-sans text-sm font-light text-white/70 md:text-base"
          style={{ textShadow: '0 1px 14px rgba(0,0,0,0.9)' }}
        >
          &quot;El te amo me queda chico, no existe palabra en el lenguaje humano
          para explicar lo que siento por vos.&quot;
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <button
            type="button"
            onClick={scrollToGallery}
            className="liquid-glass-strong flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-medium text-white"
          >
            Ver nuestros recuerdos
            <ArrowUpRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenSecretModal}
            title="Abrir el área secreta con PIN (0909)"
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            Abrir el área secreta
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <p
          className="mt-8 select-none font-sans text-xs text-white/40"
          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}
        >
          Escribí «amor» o tocá el botón de música para ver todos los trucos ✨
        </p>
      </div>
    </section>
  );
};
