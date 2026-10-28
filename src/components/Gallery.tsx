import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, MapPin, ZoomIn, Calendar, Hash, Sparkles, Heart, Video, Play, Upload, Trash2, Edit3, X } from 'lucide-react';
import { Photo } from '../types';
import { Lightbox } from './Lightbox';
import { usePhotos } from '../hooks/usePhotos';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { EditPhotoModal } from './EditPhotoModal';
import { buildPageWindow } from '../utils/pagination';

interface GalleryProps {
  initialMonthFilter?: string;
  isEditMode?: boolean;
}

// ponytail: the cumple photo used to live here as a synthetic
// entry spliced in from localStorage. Two components wrote that key
// with different shapes (JSON array vs bare string) and the race
// dropped the upload on reload. The photo now lives only in the
// Timeline's BirthdaySlot (server carousel, eventAnchor of the
// cumple entry) — no duplication here.

// ponytail: 12 per page on every viewport (fills rows of 2, 3 and 4 columns).
const PAGE_SIZE = 12;

export const Gallery: React.FC<GalleryProps> = ({ initialMonthFilter, isEditMode = false }) => {
  // ponytail: filters are (a) upload month derived from created_at and (b) hashtag from photo.tags.
  // Both are combinable; cleared via the reset button below.
  const [activeMonth, setActiveMonth] = useState<string | null>(null); // YYYY-MM
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ponytail: photos now come from the server. The first run seeds from content.ts;
  // after that the API is the source of truth.
  const { photos: apiPhotos, addPhotos, updatePhoto, deletePhoto, deleteAll } = usePhotos('public');

  // Shared bulk-upload state (also used by SecretCollageModal).
  const { isUploading, progress: uploadProgress, uploadFiles } = usePhotoUpload({
    addPhotos,
    onError: (err) => alert(`Error al subir: ${err}`)
  });

  // ponytail: filter change implies the current page no longer points
  // at the same slice. Reset to page 1 so the user lands on a populated
  // page (otherwise page 7 of "all" + filter "Septiembre" = empty grid).
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMonth, activeTag]);

  // ponytail: when the user taps a pagination button the photos change
  // but the viewport stays where it was, so scroll down to the
  // paginator: it lives at the end of the gallery (~1336 px below the
  // grid top at 360 px) and it is the control the visitor is using.
  // Scrolling to the section top instead left the paginator more than
  // a screen and a half away from the finger.
  //
  // `block: 'center'` and not 'end': the iOS bottom bar (home
  // indicator + Safari toolbar) covers a nav flush with the bottom
  // edge of the viewport. Centered, the nav sits ~370 px above it.
  //
  // The scroll lands where it should because the grid transition does not
  // change the height of the document (`mode="popLayout"` on the grid's
  // AnimatePresence): with the old page still in the flow the document
  // grew 1336 px (24 photos), the destination was computed in that
  // inflated layout and, when the old page unmounted, the document
  // shrank and the scroll ended clamped to the maximum — the nav stayed
  // cut off at the top edge (navTop = -20).
  //
  // CRITICAL: do not auto-scroll on initial mount or after a filter
  // reset — that would teleport the visitor from the home section
  // straight into the gallery every time they land on the page.
  // Only scroll when a pagination button set the flag.
  const userChangedPageRef = useRef(false);
  useEffect(() => {
    if (!userChangedPageRef.current) return;
    userChangedPageRef.current = false;
    const el = document.getElementById('paginacion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPage]);

  // Sync if initialMonthFilter changes. Treat the prop as a tag name (Copo, Nube, etc.)
  // — that matches what SecretEffectsManager currently dispatches.
  useEffect(() => {
    if (!initialMonthFilter || initialMonthFilter === 'Todos') return;
    setActiveTag(initialMonthFilter);
  }, [initialMonthFilter]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    uploadFiles(e.target.files);
    // ponytail: reset the input so re-picking the SAME batch still
    // fires onChange. Without this, after a user uploads and then
    // selects the same batch, nothing happens.
    e.target.value = '';
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm('¿Borrar esta foto?')) return;
    try {
      await deletePhoto(id);
    } catch (err) {
      alert(`Error al borrar: ${err}`);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllText !== 'BORRAR') return;
    try {
      await deleteAll();
      setConfirmDeleteAll(false);
      setDeleteAllText('');
    } catch (err) {
      alert(`Error al borrar todo: ${err}`);
    }
  };

  // ponytail: apiPhotos is the full source of truth — no synthetic
  // cumple entry is spliced in. The cumple lives in the Timeline's
  // BirthdaySlot (server carousel bucket, keyed by the cumple's
  // eventAnchor).
  const allPhotos: Photo[] = apiPhotos;

  // ponytail: derive month buckets from created_at (upload date) — replaces the old photo.month filter.
  const monthBuckets = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>();
    for (const p of allPhotos) {
      if (!p.createdAt) continue;
      const d = new Date(p.createdAt * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      buckets.set(key, { label, count: (buckets.get(key)?.count ?? 0) + 1 });
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => ({ key, ...val }));
  }, [allPhotos]);

  // Unique hashtags from photo.tags, sorted by count desc.
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPhotos) {
      for (const t of p.tags) {
        map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allPhotos]);

  // Combined filter (month AND tag), sorted by upload date desc.
  const filteredPhotos = useMemo(() => {
    let result = allPhotos;
    if (activeMonth) {
      result = result.filter((p) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === activeMonth;
      });
    }
    if (activeTag) {
      const target = activeTag.toLowerCase();
      result = result.filter((p) => p.tags.some((t) => t.toLowerCase() === target));
    }
    return [...result].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [allPhotos, activeMonth, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / PAGE_SIZE));

  // ponytail: la lista filtrada se puede encoger (borrar fotos en modo
  // edición) y dejar currentPage por encima de la última página: el
  // slice sale vacío (grid en blanco) y el nav se queda sin página
  // activa. Se recorta a la última página (totalPages >= 1, así que la
  // página nunca baja de 1).
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPhotos.slice(start, start + PAGE_SIZE);
  }, [filteredPhotos, currentPage]);

  // ponytail: la fila de páginas es una ventana deslizante (primera,
  // activa, última y un elipsis por tramo saltado). Un botón por página
  // mide 80 + 44·N px y a 360 px (328 disponibles) dejaba las primeras
  // páginas y los botones ‹/› fuera de la pantalla.
  const pageWindow = buildPageWindow(totalPages, currentPage);

  return (
    <section id="galeria" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      {/* Hidden file input for bulk upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ponytail: la subida a la galería pública es directa — el botón
          vive SIEMPRE visible, sin depender del toggle de modo edición.
          Las acciones destructivas (borrar todas) quedan en la toolbar
          de edit mode de abajo, donde siguen protegidas por EDIT_TOKEN. */}
      <div className="mb-4 mx-auto max-w-2xl bg-[#ff85a1]/8 border border-[#ff85a1]/25 rounded-2xl p-3">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <span className="text-[11px] text-stone-400 font-light hidden sm:inline">
            {apiPhotos.length} fotos guardadas
          </span>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="px-3 py-1.5 rounded-xl bg-[#ff85a1]/25 hover:bg-[#ff85a1]/40 border border-[#ff85a1]/50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              // ponytail: barber-pole loader, rosa, matches the upload CTA accent.
              <span className="ld-barber" aria-label="Subiendo" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? `Subiendo ${uploadProgress}%` : 'Subir fotos'}</span>
          </button>
        </div>
        {/* ponytail: progress bar only visible while uploading */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="upload-progress-shell">
                <div
                  className="upload-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-300 mt-1 text-right">
                {uploadProgress}% — tranquilo, tarda lo que tenga que tardar
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Mode Toolbar — solo acciones destructivas (borrar todas) */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 mx-auto max-w-2xl bg-gradient-to-r from-[#ffd166]/15 via-[#ff85a1]/20 to-[#ff4d6d]/15 border border-[#ffd166]/50 rounded-2xl p-4 shadow-lg shadow-[#ffd166]/10"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#ffd166]" />
                <span className="text-sm font-semibold text-white">Modo edición: galería</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!confirmDeleteAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(true)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/50 text-red-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar todas</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={deleteAllText}
                      onChange={(e) => setDeleteAllText(e.target.value)}
                      placeholder="Escribí BORRAR"
                      className="w-24 px-2 py-1 rounded-lg bg-[#0f0712] border border-red-500/50 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      disabled={deleteAllText !== 'BORRAR'}
                      className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmDeleteAll(false); setDeleteAllText(''); }}
                      className="px-2 py-1 rounded-lg text-stone-300 hover:text-white text-xs transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ff85a1]/15 border border-[#ff85a1]/30 text-[#ff85a1] text-xs font-semibold uppercase tracking-wider mb-3"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Álbum de Recuerdos & Videos</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight"
        >
          <span className="fx-lenticular" data-text="GALERÍA">
            GALERÍA
          </span>
        </motion.h2>
      </div>

      {/* Filters: fecha de carga (upload month) + hashtag */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mr-2 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#ff85a1]" />
            <span>Fecha de carga:</span>
          </span>
          {monthBuckets.length === 0 ? (
            <span className="text-[11px] text-stone-500 italic">Sin fechas registradas</span>
          ) : monthBuckets.map((b) => {
            const isActive = activeMonth === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setActiveMonth(isActive ? null : b.key)}
                className={`px-3 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer border ${
                  isActive
                    ? 'bg-[#ff85a1]/30 border-[#ff85a1] text-white font-bold'
                    : 'bg-black/30 hover:bg-white/10 border-white/5 text-stone-400 hover:text-stone-200'
                }`}
              >
                {b.label}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-stone-400'}`}>
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mr-2 flex items-center gap-1">
            <Hash className="w-3 h-3 text-[#ff85a1]" />
            <span>Hashtags:</span>
          </span>
          {allTags.length === 0 ? (
            <span className="text-[11px] text-stone-500 italic">Sin hashtags</span>
          ) : allTags.map(([tag, count]) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(isActive ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer border ${
                  isActive
                    ? 'bg-[#ff85a1]/30 border-[#ff85a1] text-white font-bold'
                    : 'bg-black/30 hover:bg-white/10 border-white/5 text-stone-400 hover:text-stone-200'
                }`}
              >
                #{tag}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-stone-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Result Summary */}
      <div className="flex items-center justify-between text-xs text-[#fcd5df] mb-6 px-1">
        <span>
          Mostrando <strong className="text-white">{filteredPhotos.length}</strong> recuerdos
        </span>
        {(activeMonth || activeTag) && (
          <button
            type="button"
            onClick={() => { setActiveMonth(null); setActiveTag(null); }}
            className="text-[#ff85a1] hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        )}
      </div>

      {/* Responsive Masonry Grid taking full width.
          ponytail: mobile-first pagination reads as a gallery (2 cols,
          tighter aspect). Desktop keeps the 3/4-col masonry unchanged.
          ponytail: `relative` + `mode="popLayout"`: las fotos que se van
          salen del flujo, así el documento NO crece 1336 px durante la
          transición (la página vieja y la nueva juntas). Con el documento
          estable, el destino del scroll al paginador no se invalida al
          encogerse y el nav queda donde se lo puso (AC8c). */}
      <motion.div
        layout
        className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6"
      >
        <AnimatePresence mode="popLayout">
          {paginatedPhotos.map((photo, index) => {
            const isVideo = photo.mediaType === 'video' || photo.filePath.match(/\.(mp4|webm)$/i);
            return (
              <motion.div
                layout
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, delay: (index % 6) * 0.04 }}
                whileHover={{ y: -6, scale: 1.02 }}
                onClick={() => setActivePhoto(photo)}
                className="group relative rounded-3xl overflow-hidden glass-card cursor-pointer shadow-lg aspect-[3/4] md:aspect-[4/5] bg-[#1a0c18] border border-[#ff85a1]/20 hover:border-[#ff85a1]/60 select-none"
              >
                <img
                  src={photo.thumbnailUrl || photo.filePath}
                  alt={photo.caption}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                {/* Top Month/Date Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-[#ffe5ec] border border-white/10 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#ff85a1]" />
                  <span>{photo.month} {photo.year}</span>
                </div>

                {/* Video Indicator Badge */}
                {isVideo && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#ff85a1] text-black font-bold text-[10px] flex items-center gap-1 shadow-lg">
                    <Video className="w-3 h-3" />
                    <span>{photo.duration || 'Video'}</span>
                  </div>
                )}

                {/* Center Play Button for Video */}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#ff85a1] group-hover:text-black transition-all shadow-xl">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Location Tag */}
                {photo.location && !isVideo && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-stone-300 flex items-center gap-1 border border-white/10">
                    <MapPin className="w-3 h-3 text-[#ff85a1]" />
                    <span className="truncate max-w-[100px]">{photo.location}</span>
                  </div>
                )}

                {/* Bottom Caption and Tags */}
                <div className="absolute bottom-0 inset-x-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                  {/* ponytail: hide the caption row entirely when empty — no "Sin descripción" placeholder. */}
                  {photo.caption && (
                    <p className="text-xs text-white line-clamp-2 font-medium drop-shadow mb-2 leading-snug">
                      "{photo.caption}"
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 flex-wrap">
                      {photo.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-2 py-0.5 rounded-full bg-[#ff85a1]/25 border border-[#ff85a1]/35 text-[#ffe5ec]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Edit-mode per-photo actions (don't open lightbox) */}
                      {isEditMode && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingPhoto(photo); }}
                            className="w-7 h-7 rounded-full bg-[#ffd166]/85 hover:bg-[#ffd166] text-black backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                            title="Editar metadata"
                            aria-label="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteOne(photo.id); }}
                            className="w-7 h-7 rounded-full bg-red-500/85 hover:bg-red-500 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                            title="Borrar"
                            aria-label="Borrar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <span className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-[#ff85a1] group-hover:text-black transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ponytail: paginator on every viewport. */}
      {totalPages > 1 && (
        <nav
          id="paginacion"
          aria-label="Paginación de la galería"
          className="mt-6 flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => { userChangedPageRef.current = true; setCurrentPage((p) => Math.max(1, p - 1)); }}
            disabled={currentPage === 1}
            className="w-11 h-11 shrink-0 rounded-full bg-black/40 hover:bg-[#ff85a1]/30 border border-white/10 text-white text-sm font-semibold flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Página anterior"
          >
            ‹
          </button>
          {pageWindow.map((item, i) => {
            if (item === 'gap') {
              // ponytail: el elipsis es decorativo — la 1, la 2, la
              // activa y la última se tocan, y el resto se recorre con
              // ‹/›. Ancho fijo (w-3) para que la fila no dependa de
              // la fuente.
              return (
                <span
                  key={`gap-${i}`}
                  aria-hidden="true"
                  className="w-3 text-center text-xs text-stone-500"
                >
                  …
                </span>
              );
            }
            const isActive = item === currentPage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => { userChangedPageRef.current = true; setCurrentPage(item); }}
                className={`w-11 h-11 shrink-0 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#ff85a1]/30 border-[#ff85a1] text-white'
                    : 'bg-black/30 hover:bg-white/10 border-white/5 text-stone-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => { userChangedPageRef.current = true; setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
            disabled={currentPage === totalPages}
            className="w-11 h-11 shrink-0 rounded-full bg-black/40 hover:bg-[#ff85a1]/30 border border-white/10 text-white text-sm font-semibold flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </nav>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <Lightbox
          photo={activePhoto}
          allPhotos={filteredPhotos}
          onClose={() => setActivePhoto(null)}
          onNavigate={(newPhoto) => setActivePhoto(newPhoto)}
        />
      )}

      {/* Edit Metadata Modal */}
      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={async (patch) => {
            try {
              await updatePhoto(editingPhoto.id, patch);
            } catch (err) {
              alert(`Error al guardar: ${err}`);
            }
          }}
        />
      )}
    </section>
  );
};
