import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Feather, Sparkles, Calendar, Check, Heart } from 'lucide-react';
import { LetterDrop } from '../types';
import { siteMeta } from '../data/content';

interface WriteLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (letter: LetterDrop) => void;
}

export const WriteLetterModal: React.FC<WriteLetterModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [waxColor, setWaxColor] = useState('#d90429');

  const waxColorOptions = [
    { color: '#d90429', label: 'Rojo Carmesí' },
    { color: '#ff758f', label: 'Rosa Suave' },
    { color: '#e07a5f', label: 'Terracota' },
    { color: '#7b2cbf', label: 'Lavanda Profundo' },
    { color: '#b5838d', label: 'Rosa Antiguo' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Por favor escribe un título y el contenido de la carta.');
      return;
    }

    const newLetter: LetterDrop = {
      id: `custom-drop-${Date.now()}`,
      title: title.trim(),
      tagline: tagline.trim() || 'Nuevo mensaje para ti',
      date: date.trim() || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      content: content.trim(),
      author: siteMeta.hisName,
      isNewDrop: true,
      waxSealColor: waxColor
    };

    onSave(newLetter);
    // Reset
    setTitle('');
    setTagline('');
    setDate('');
    setContent('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#180c16] border border-[#ff85a1]/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-left"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-[#ff85a1]/20 border border-[#ff85a1]/40 flex items-center justify-center text-[#ff85a1]">
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Escribir una Nueva Carta
              </h3>
              <p className="text-xs text-[#fcd5df] font-light">
                Agrega una nueva carta sellada para sorprender a Sam cuando ingrese a la página.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Título de la Carta
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Carta para un día lluvioso / Un recuerdo que me hizo sonreír..."
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
              />
            </div>

            {/* Date & Tagline row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Fecha o Mes
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Ej: Octubre 2026 o 24 de Octubre"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Frase corta / Subtítulo
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ej: Para leer con café en mano"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>
            </div>

            {/* Wax Seal Color Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-2">
                Color del Sello de Cera
              </label>
              <div className="flex items-center gap-3">
                {waxColorOptions.map((opt) => (
                  <button
                    key={opt.color}
                    type="button"
                    onClick={() => setWaxColor(opt.color)}
                    style={{ backgroundColor: opt.color }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      waxColor === opt.color
                        ? 'scale-115 border-white shadow-lg'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Cuerpo de la Carta
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe aquí tus palabras con todo tu amor..."
                rows={7}
                required
                className="w-full px-4 py-3 rounded-2xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm leading-relaxed focus:outline-none focus:border-[#ff85a1] resize-none font-serif"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff85a1] to-[#ff4d6d] text-white text-xs font-semibold shadow-lg shadow-[#ff85a1]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sellar y Publicar Drop</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
