import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Download, Share2, MapPin, Calendar, Check } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photo: Photo | null;
  allPhotos: Photo[];
  onClose: () => void;
  onNavigate: (newPhoto: Photo) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  photo,
  allPhotos,
  onClose,
  onNavigate
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [photo, allPhotos]);

  if (!photo) return null;

  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    onNavigate(allPhotos[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % allPhotos.length;
    onNavigate(allPhotos[nextIndex]);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nuestro Álbum - Foto Especial',
          text: photo.caption,
          url: window.location.href
        });
      } catch {
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        id="lightbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Visualizador de fotografía"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6"
        onClick={onClose}
      >
        {/* Modal Content Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-[#140e1e] border border-[#eaa7b8]/30 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar with actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0d0914] border-b border-[#eaa7b8]/15 z-10">
            <div className="flex items-center gap-2 text-xs text-[#caa8b4]">
              <span className="font-semibold text-white font-mono">
                {currentIndex + 1} / {allPhotos.length}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#eaa7b8]" />
                {photo.dateStr || `${photo.month} ${photo.year}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-lightbox-share"
                type="button"
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-[#eaa7b8]/20 text-[#caa8b4] hover:text-white transition-colors"
                aria-label="Compartir fotografía"
                title="Compartir o copiar enlace"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>

              <a
                id="btn-lightbox-download"
                href={photo.filePath}
                target="_blank"
                rel="noreferrer"
                download={`foto-${photo.id}.jpg`}
                className="p-2 rounded-full hover:bg-[#eaa7b8]/20 text-[#caa8b4] hover:text-white transition-colors"
                aria-label="Descargar foto"
                title="Abrir imagen en alta resolución"
              >
                <Download className="w-4 h-4" />
              </a>

              <button
                id="btn-lightbox-close"
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-rose-500/20 text-[#caa8b4] hover:text-white transition-colors"
                aria-label="Cerrar modal (Escape)"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image or Video Area */}
          <div className="relative flex-1 flex items-center justify-center bg-black/60 min-h-[300px] overflow-hidden p-2 sm:p-4">
            {photo.mediaType === 'video' || photo.filePath.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={photo.filePath}
                controls
                autoPlay
                playsInline
                className="max-h-[62vh] sm:max-h-[68vh] w-auto max-w-full rounded-xl shadow-2xl bg-black"
              >
                Tu navegador no soporta reproducción de video.
              </video>
            ) : (
              <img
                src={photo.filePath}
                alt={photo.caption}
                className="max-h-[62vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-lg select-none"
              />
            )}

            {/* Navigation Arrows */}
            {allPhotos.length > 1 && (
              <>
                <button
                  id="btn-lightbox-prev"
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-[#eaa7b8] text-white hover:text-black transition-colors backdrop-blur-md cursor-pointer"
                  aria-label="Foto anterior (Flecha izquierda)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  id="btn-lightbox-next"
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-[#eaa7b8] text-white hover:text-black transition-colors backdrop-blur-md cursor-pointer"
                  aria-label="Siguiente foto (Flecha derecha)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Caption & Location */}
          <div className="px-5 py-3.5 bg-[#0e0915] border-t border-[#eaa7b8]/15">
            <p className="text-sm sm:text-base text-white font-medium leading-snug">
              "{photo.caption}"
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              {photo.location && (
                <div className="flex items-center gap-1.5 text-xs text-[#eaa7b8]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{photo.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {photo.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-[#1d1627] text-[#cbb9c0] border border-[#eaa7b8]/10"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
