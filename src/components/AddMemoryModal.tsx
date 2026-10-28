import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Upload, Image as ImageIcon, Sparkles, Trash2, Plus, Heart } from 'lucide-react';
import { TimelineEvent, TimelineImage } from '../types';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: TimelineEvent) => void;
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ponytail: 'month' = recap of a whole month (e.g. "Julio 2026").
  // 'event' = a specific day with its own carousel (birthday, anniversary).
  // The kind drives anchor format, tag defaults, and required fields.
  const [kind, setKind] = useState<'month' | 'event'>('month');
  const [month, setMonth] = useState('Octubre');
  const [year, setYear] = useState(2026);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tone, setTone] = useState<'romantico' | 'humor' | 'nostalgico'>('romantico');
  const [text, setText] = useState('');
  const [internalJoke, setInternalJoke] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [images, setImages] = useState<TimelineImage[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages((prev) => [
            ...prev,
            { url: result, caption: file.name.replace(/\.[^/.]+$/, '') }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrlImage = () => {
    if (!customImageUrl.trim()) return;
    setImages((prev) => [...prev, { url: customImageUrl.trim(), caption: 'Momento especial' }]);
    setCustomImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      alert('Por favor completa el título y la historia del recuerdo.');
      return;
    }
    if (kind === 'event' && !date.trim()) {
      alert('Para un evento específico necesitás una fecha (ej: "14 de Octubre, 2026").');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    // ponytail: events get the 'event' tag, months get the 'month' tag,
    // so the gallery filter and any future "kind" filter can distinguish
    // them without parsing the title.
    const defaultTags = kind === 'event'
      ? ['event', month]
      : ['month', month];
    const finalTags = tags.length > 0 ? tags : defaultTags;

    // ponytail: slug for eventAnchor = title lowercased + non-alphanum
    // collapsed to dashes. Stable, readable, no external dep.
    const eventSlug = (title.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')) || 'evento';

    const newEvent: TimelineEvent = {
      id: `custom-${kind}-${Date.now()}`,
      kind,
      month,
      year: Number(year),
      monthAnchor: `mes-${month.toLowerCase()}-${year}`,
      eventAnchor: kind === 'event' ? `event-${eventSlug}-${year}` : undefined,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      tone,
      text: text.trim(),
      internalJoke: internalJoke.trim() || undefined,
      date: date.trim() || `${month} ${year}`,
      tags: finalTags,
      images: images.length > 0
        ? images
        : [
            {
              url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
              caption: 'Un nuevo capítulo juntos'
            }
          ],
      isCustom: true
    };

    onSave(newEvent);
    // Reset form
    setKind('month');
    setTitle('');
    setSubtitle('');
    setText('');
    setInternalJoke('');
    setTagsInput('');
    setImages([]);
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#180c16] border border-[#ff85a1]/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-left"
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
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Sumar un Nuevo Recuerdo o Mes
              </h3>
              <p className="text-xs text-[#fcd5df] font-light">
                Agrega el próximo capítulo para que la cronología siga creciendo con los años.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {/* Kind selector — recap mensual vs evento específico */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Tipo de recuerdo
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKind('month')}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    kind === 'month'
                      ? 'bg-[#ff85a1]/25 border-[#ff85a1] text-white font-semibold'
                      : 'bg-[#251222] border-white/10 text-stone-300 hover:text-white'
                  }`}
                >
                  📅 Mes (recap mensual)
                </button>
                <button
                  type="button"
                  onClick={() => setKind('event')}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    kind === 'event'
                      ? 'bg-[#ffd166]/25 border-[#ffd166] text-white font-semibold'
                      : 'bg-[#251222] border-white/10 text-stone-300 hover:text-white'
                  }`}
                >
                  ⭐ Evento específico
                </button>
              </div>
            </div>

            {/* Month, Year & Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Mes
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white text-sm focus:outline-none focus:border-[#ff85a1]"
                >
                  {monthsList.map((m) => (
                    <option key={m} value={m} className="bg-[#180c16]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Año
                </label>
                <input
                  type="number"
                  min={2026}
                  max={2035}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Fecha{kind === 'event' ? ' *' : ' (opcional)'}
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder={kind === 'event' ? 'Ej: 14 de Octubre, 2026' : 'Opcional'}
                  required={kind === 'event'}
                  className="w-full px-3 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Título del Recuerdo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Nuestro fin de semana en la cabaña"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                  Subtítulo / Sensación
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ej: Fuego, café caliente y Canela persiguiendo hojas"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
                />
              </div>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Tono del capítulo
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'romantico', label: '💖 Romántico' },
                  { id: 'humor', label: '😄 Risas / Humor' },
                  { id: 'nostalgico', label: '✨ Nostálgico' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      tone === t.id
                        ? 'bg-[#ff85a1]/25 border-[#ff85a1] text-white font-semibold'
                        : 'bg-[#251222] border-white/10 text-stone-300 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Story text */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Historia / Relato
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cuenta qué pasó, cómo te sentiste, qué dijeron..."
                rows={4}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm leading-relaxed focus:outline-none focus:border-[#ff85a1] resize-none"
              />
            </div>

            {/* Internal Joke / Anécdota */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Chiste interno o frase inolvidable (Opcional)
              </label>
              <input
                type="text"
                value={internalJoke}
                onChange={(e) => setInternalJoke(e.target.value)}
                placeholder="Ej: Todavía juras que no viste la señal de doblar..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
              />
            </div>

            {/* Photos (multi-photo support for monthly carousel!) */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Fotos de este mes (para el carrusel mensual)
              </label>

              {/* Upload button & URL input */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#251222] hover:bg-[#32172d] border border-[#ff85a1]/30 text-xs text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#ff85a1]" />
                  <span>Subir fotos desde dispositivo</span>
                </button>

                <div className="flex-1 flex gap-1.5">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="O pega link de imagen (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-xs focus:outline-none focus:border-[#ff85a1]"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    className="px-3 py-1.5 rounded-xl bg-[#ff85a1]/20 hover:bg-[#ff85a1]/35 border border-[#ff85a1]/40 text-xs text-white cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Thumbnails list */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-2 bg-[#120710] rounded-xl border border-white/10">
                  {images.map((img, i) => (
                    <div key={i} className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#ff85a1]/30">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-[#ffe5ec] uppercase tracking-wider mb-1.5">
                Etiquetas (separadas por comas, ej: Canela, Trufa, Copo, Viaje)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Canela, Trufa, Viaje, Cabaña"
                className="w-full px-3.5 py-2 rounded-xl bg-[#251222] border border-[#ff85a1]/25 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-[#ff85a1]"
              />
            </div>

            {/* Submit buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#ff85a1]/15">
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
                <span>Guardar y Publicar Recuerdo</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
