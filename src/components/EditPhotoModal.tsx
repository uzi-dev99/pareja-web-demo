/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal for editing metadata of a single photo. Used from Gallery, TimelineCarousel
 * (via a callback) and SecretCollageModal.
 *
 * ponytail: 1 component, not 3 — same shape for public/carousel/secret (caption is
 *           the only field for secret; UI hides the rest in that case).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Tag, Calendar, MapPin, FileText } from 'lucide-react';
import { Photo } from '../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface Props {
  photo: Photo | null;
  onClose: () => void;
  onSave: (patch: Partial<Photo>) => Promise<void>;
}

export const EditPhotoModal: React.FC<Props> = ({ photo, onClose, onSave }) => {
  const [caption, setCaption] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [dateStr, setDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSecret = photo?.id.startsWith('seed-secret-') || false; // ponytail: best-effort; secret bucket rows have any id.

  useEffect(() => {
    if (!photo) return;
    setCaption(photo.caption ?? '');
    setMonth(photo.month ?? '');
    setYear(photo.year ?? new Date().getFullYear());
    setDateStr(photo.dateStr ?? '');
    setLocation(photo.location ?? '');
    setTagsText((photo.tags ?? []).join(', '));
    setError(null);
  }, [photo]);

  if (!photo) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<Photo> = {
        caption: caption.trim(),
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean)
      };
      if (!isSecret) {
        patch.month = month || '';
        patch.year = Number(year) || new Date().getFullYear();
        patch.dateStr = dateStr.trim() || undefined;
        patch.location = location.trim() || undefined;
      }
      await onSave(patch);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative max-w-lg w-full bg-[#1b0c19] border border-[#ff85a1]/40 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar editor"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-1">
            Editar recuerdo
          </h3>
          <p className="text-xs text-[#fcd5df] mb-4 font-light">
            Cambiá la descripción, fecha, lugar o tags. Guardá para aplicar.
          </p>

          {/* Preview thumbnail */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0f0712] border border-white/10 mb-4">
            <img
              src={photo.thumbnailUrl || photo.filePath}
              alt={photo.caption || 'foto'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Caption */}
          <Field label="Descripción" icon={FileText}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Qué estaban haciendo, qué sentiste..."
              className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ff85a1]/60 resize-none"
            />
          </Field>

          {!isSecret && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Mes" icon={Calendar}>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff85a1]/60"
                  >
                    <option value="">—</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Año" icon={Calendar}>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff85a1]/60"
                  />
                </Field>
              </div>

              <Field label="Fecha corta (ej. 12 Mar 2026)" icon={Calendar}>
                <input
                  type="text"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  placeholder="12 Mar 2026"
                  className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ff85a1]/60"
                />
              </Field>

              <Field label="Lugar" icon={MapPin}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Café, ciudad, evento..."
                  className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ff85a1]/60"
                />
              </Field>
            </>
          )}

          <Field label="Tags (separados por coma)" icon={Tag}>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Aniversario, Viaje, Cumple"
              className="w-full bg-[#0f0712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ff85a1]/60"
            />
          </Field>

          {error && (
            <p className="text-xs text-rose-400 mb-2">⚠️ {error}</p>
          )}

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff85a1] to-[#ff4d6d] hover:from-[#f77590] hover:to-[#e6455e] text-white text-sm font-semibold transition-all shadow-lg shadow-[#ff85a1]/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Field: React.FC<{ label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
  <div className="mb-3">
    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ff85a1] mb-1.5">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </label>
    {children}
  </div>
);
