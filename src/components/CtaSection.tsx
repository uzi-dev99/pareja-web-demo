/**
 * PWD-496 — cierre cinematográfico del álbum.
 *
 * Adaptación de _project/refs/liquid-cta-footer-prompt.md: fondo HLS con
 * poster de respaldo, dos degradados que funden el video con la página
 * negra, heading serif itálico centrado, dos botones liquid-glass cableados
 * a acciones que el sitio ya tenía y la barra mínima del footer.
 *
 * El copy es del sitio (dedicatoria + frase), en español.
 */

import React, { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Hls from 'hls.js';

// Stream del prompt: una onda abstracta sobre negro, sin marcas de marca.
// Safari reproduce HLS nativo; el resto necesita hls.js (única dependencia
// nueva de la tarjeta, justificada en AC2).
const HLS_SRC =
  'https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8';
const POSTER =
  'https://image.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q/thumbnail.jpg?width=1920';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // ponytail: con movimiento reducido el fondo queda en el poster, quieto.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      // Un error fatal deja el poster de fondo: el layout no se rompe.
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) hls.destroy();
      });
      return () => hls.destroy();
    }

    // Safari reproduce HLS nativo.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_SRC;
    }
  }, []);

  const scrollToGallery = () => {
    document.querySelector('#galeria')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="cta"
      className="relative z-10 isolate overflow-hidden bg-[#0d050c] px-6 py-24 text-center md:px-16 md:py-32 lg:px-24"
    >
      <style>{LIQUID_GLASS_CSS}</style>

      {/* Fondo HLS con poster de respaldo */}
      <video
        ref={videoRef}
        poster={POSTER}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      {/* Fundidos: el video se disuelve en el negro de la página */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[200px]"
        style={{ background: 'linear-gradient(to bottom, #0d050c, transparent)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[200px]"
        style={{ background: 'linear-gradient(to top, #0d050c, transparent)' }}
      />
      {/* Velo: sin esto el texto no se lee sobre las zonas claras del video */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(13,5,12,0.85) 0%, rgba(13,5,12,0.55) 60%, rgba(13,5,12,0.15) 100%)'
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
