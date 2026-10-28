import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Smile,
  Heart,
  MapPin,
  Calendar,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  Plus,
  Quote
} from 'lucide-react';
import { timelineEvents, photos } from '../data/content';
import { Photo, TimelineEvent } from '../types';
import { TimelineCarousel } from './TimelineCarousel';
import { usePhotos } from '../hooks/usePhotos';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { AddMemoryModal } from './AddMemoryModal';
import { EditableText } from './EditableText';
import { MONTHS_PER_PAGE, monthKey, monthOrdinal, visibleTimeline } from '../utils/timelineMonths';

interface TimelineProps {
  onOpenGalleryMonth?: (month: string) => void;
  isEditMode?: boolean;
}

// ponytail: birthday photo persistence used to live in localStorage
// (under the cumple year key). Two components wrote to that key with
// different shapes (JSON array vs bare string) — a race condition that
// silently dropped the user's upload on reload. The birthday now reads/
// writes through the server carousel bucket (eventId = the cumple's
// eventAnchor), same path as every other carousel in this file.
const STORAGE_KEY_CUSTOM_EVENTS = 'pareja_custom_timeline_events';

export const Timeline: React.FC<TimelineProps> = ({
  onOpenGalleryMonth,
  isEditMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleMonths, setVisibleMonths] = useState(MONTHS_PER_PAGE);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  // ponytail: carousel overrides fetched from API. Key = monthAnchor
  // for month recaps, and eventAnchor for the cumple (kind === 'event').
  // Same server-side carousel bucket either way.
  const [carouselOverrides, setCarouselOverrides] = useState<Record<string, Photo[]>>({});

  const fetchCarouselOverrides = useCallback(async () => {
    // ponytail: only fetch for events that have static images worth
    // overriding, plus the cumple event which is the only kind === 'event'
    // that owns a dedicated carousel slot.
    const allEvents = [...timelineEvents];
    const map: Record<string, Photo[]> = {};
    await Promise.all(
      allEvents.map(async (ev) => {
        // Use eventAnchor for events, monthAnchor for month recaps.
        const carouselKey = ev.kind === 'event' && ev.eventAnchor
          ? ev.eventAnchor
          : ev.monthAnchor;
        const hasStatic = ev.images && ev.images.length > 0;
        const isCumple = ev.kind === 'event';
        if (!hasStatic && !isCumple) return;
        try {
          const r = await fetch(`/api/photos?bucket=carousel&eventId=${encodeURIComponent(carouselKey)}`);
          if (!r.ok) return;
          const list = (await r.json()) as Photo[];
          if (list.length > 0) map[carouselKey] = list;
        } catch {
          // silent fail — keep static fallback
        }
      })
    );
    setCarouselOverrides(map);
  }, []);

  useEffect(() => {
    fetchCarouselOverrides();
  }, [fetchCarouselOverrides]);

  // Custom events added by user (persisted in localStorage)
  const [customEvents, setCustomEvents] = useState<TimelineEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_EVENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Add new custom event
  const handleSaveCustomEvent = (newEvent: TimelineEvent) => {
    const updated = [...customEvents, newEvent];
    setCustomEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_EVENTS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Delete custom event
  const handleDeleteCustomEvent = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Quieres eliminar este recuerdo?')) {
      const updated = customEvents.filter((ev) => ev.id !== eventId);
      setCustomEvents(updated);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_EVENTS, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Scroll progress for vertical timeline illumination line
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center']
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 25,
    restDelta: 0.001
  });

  // All events = base events + user added events
  const allTimelineEvents = [...timelineEvents, ...customEvents];
  // ponytail: dedupe by monthAnchor so a stale deploy, a re-saved
  // AddMemoryModal entry, or any future source duplication cannot
  // render the same card twice. First occurrence wins, so the
  // static seed always takes precedence over a user-added clone.
  const seenAnchors = new Set<string>();
  const uniqueTimelineEvents = allTimelineEvents.filter((ev) => {
    if (seenAnchors.has(ev.monthAnchor)) return false;
    seenAnchors.add(ev.monthAnchor);
    return true;
  });

  // ponytail: el orden (mes más nuevo primero, recap antes que sus
  // eventos) y el corte de 2 meses por página viven en el util puro
  // src/utils/timelineMonths.ts. Acá solo se le pasa cuántos meses se
  // muestran.
  const { visible: visibleEvents, months } = visibleTimeline(uniqueTimelineEvents, visibleMonths);

  return (
    <section
      id="timeline"
      ref={containerRef}
      className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ff85a1]/15 border border-[#ff85a1]/30 text-[#ff85a1] text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Gracias por este 2026 hermoso junto a vos</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight"
        >
          Nuestro álbum{' '}
          <span className="fx-lenticular ml-1" data-text="MES A MES">
            MES A MES
          </span>
        </motion.h2>
        {/* Action button to add a new memory / month (Visible only in Edit Mode) */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="mt-6 flex flex-col items-center justify-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setIsAddMemoryOpen(true)}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ffd166]/25 via-[#ff85a1]/30 to-[#ff4d6d]/30 hover:from-[#ffd166]/40 hover:to-[#ff4d6d]/40 border border-[#ffd166]/60 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#ffd166]/15 flex items-center gap-2 transition-all hover:scale-103 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#ffd166]" />
                <span>+ Agregar nuevo recuerdo / mes</span>
              </button>
              <span className="text-[11px] text-[#ffd166]/80 font-light">
                Herramienta de edición activa
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Central Illuminated Progress Line & Wide Two-Column Spread */}
      <div className="relative">
        {/* Background static line */}
        <div className="absolute left-6 md:left-1/2 top-6 bottom-6 -translate-x-1/2 w-0.5 bg-[#251322]" />

        {/* Animated glowing fill line */}
        <motion.div
          style={{ scaleY, originY: 0 }}
          className="absolute left-6 md:left-1/2 top-6 bottom-6 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#ff85a1] via-[#ffccd5] to-[#ff4d6d] shadow-[0_0_16px_rgba(255,133,161,0.8)]"
        />

        {/* Event Items */}
        <div className="space-y-16 sm:space-y-24 relative z-10">
          {visibleEvents.map((event, index) => {
            const isEven = index % 2 === 0;
            // ponytail: events (kind === 'event') get the visual treatment
            // that used to belong only to the birthday placeholder —
            // a distinct badge color and the sparkles node marker.
            const isEvent = event.kind === 'event';

            // Determine image set for this month.
            // 1. Carousel override from API (if any) wins.
            // 2. Static event.images fallback.
            // 3. Single photo via imageId.
            const override = carouselOverrides[event.monthAnchor];
            const monthImages: Photo[] = override && override.length > 0
              ? override
              : event.images && event.images.length > 0
                ? event.images.map((img) => ({
                    id: `${event.id}-${img.url}`,
                    filePath: img.url,
                    thumbnailUrl: img.url,
                    caption: img.caption || '',
                    month: event.month,
                    year: event.year,
                    location: img.location,
                    tags: event.tags
                  }))
                : event.imageId
                  ? (() => {
                      const p = photos.find((x) => x.id === event.imageId);
                      return p ? [{
                        id: event.imageId,
                        filePath: p.filePath,
                        thumbnailUrl: p.filePath,
                        caption: p.caption,
                        month: p.month,
                        year: p.year,
                        dateStr: p.dateStr,
                        location: p.location,
                        tags: p.tags
                      }] : [];
                    })()
                  : [];

            return (
              <div
                key={event.id}
                id={event.monthAnchor}
                className="relative flex flex-col md:grid md:grid-cols-2 md:gap-12 lg:gap-16 items-center"
              >
                {/* Central Node Badge */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#1b0d18] border-2 border-[#ff85a1] shadow-[0_0_12px_rgba(255,133,161,0.5)] flex items-center justify-center text-[#ff85a1] z-20 top-0 md:top-auto">
                  {isEvent ? (
                    <Sparkles className="w-4 h-4 animate-spin text-[#ffd166]" />
                  ) : (
                    <span className="text-[11px] font-bold font-mono text-[#ffe5ec]">
                      {monthOrdinal(months, monthKey(event))}
                    </span>
                  )}
                </div>

                {/* SIDE 1: THE DEDICATED CAROUSEL / PHOTO FRAME */}
                <div
                  className={`w-full pl-14 md:pl-0 order-1 ${
                    isEven ? 'md:order-1 md:text-right' : 'md:order-2 md:text-left'
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -40 : 40, scale: 0.95 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="relative inline-block w-full max-w-lg group"
                  >
                    {/* Washi Tape */}
                    <div className="washi-tape-pink" />

                    {/* ponytail: event slot reads from the server bucket
                        keyed by eventAnchor (same usePhotos hook as months).
                        No more localStorage data URLs, no more race condition. */}
                    {isEvent ? (
                      <BirthdaySlot
                        isEditMode={isEditMode}
                        onRefresh={fetchCarouselOverrides}
                      />
                    ) : monthImages.length > 0 ? (
                      /* Monthly Multi-Photo Carousel */
                      <TimelineCarousel
                        images={monthImages}
                        eventTitle={event.title}
                        eventDate={event.date}
                        isEditMode={isEditMode}
                        eventId={event.monthAnchor}
                        onReplace={fetchCarouselOverrides}
                      />
                    ) : (
                      <div className="aspect-[16/11] rounded-3xl p-3 glass-card flex items-center justify-center text-stone-500">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* SIDE 2: THE MODERN STATEMENT CARD */}
                <div
                  className={`w-full pl-14 md:pl-0 mt-4 md:mt-0 order-2 ${
                    isEven ? 'md:order-2' : 'md:order-1'
                  }`}
                >
                  <motion.article
                    initial={{ opacity: 0, x: isEven ? 40 : -40, scale: 0.95 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="glass-card rounded-3xl p-6 sm:p-8 relative transition-all duration-300 group hover:border-[#ff85a1]/50 shadow-xl"
                  >
                    {/* Header with Month & Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#ff85a1]/20">
                      <div className="flex items-center gap-2">
                        {isEvent ? (
                          // ponytail: event cards show the full date in the
                          // header badge instead of just month + year.
                          <span
                            className="fx-sundial text-xs font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-[#ffd166]/20 border border-[#ffd166]/40 text-[#ffd166]"
                            data-text={event.date.toUpperCase()}
                          >
                            {event.date}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[#ff85a1]/15 text-[#ff85a1] border border-[#ff85a1]/30">
                            {event.month} {event.year}
                          </span>
                        )}
                        {event.subtitle && (
                          <EditableText
                            scope="timeline"
                            id={`${event.id}.subtitle`}
                            defaultValue={event.subtitle}
                            isEditMode={isEditMode}
                            as="span"
                            className="text-xs text-[#fcd5df]/80 font-light hidden sm:inline"
                            before="• "
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditMode && event.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomEvent(event.id, e)}
                            className="p-1 rounded-full text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar este recuerdo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* BIG MODERN STATEMENT (THE HERO OF THE CARD) */}
                    <div className="my-5 relative">
                      <EditableText
                        scope="timeline"
                        id={`${event.id}.text`}
                        defaultValue={event.text}
                        isEditMode={isEditMode}
                        as="p"
                        multiline
                        className="font-serif text-2xl sm:text-3xl lg:text-[30px] font-semibold text-white leading-snug tracking-tight group-hover:text-[#ffe5ec] transition-colors"
                        before="“"
                        after="”"
                      />
                    </div>

                    {/* Internal Joke / Intimate Memory Box */}
                    {event.internalJoke && (
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1d0d19]/80 border border-[#ff85a1]/25 mb-5 text-xs sm:text-sm text-[#ffe5ec] flex items-stretch gap-2.5 italic min-h-[3.5rem]">
                        <Sparkles className="w-4 h-4 text-[#ffd166] shrink-0 mt-0.5" />
                        <EditableText
                          scope="timeline"
                          id={`${event.id}.internalJoke`}
                          defaultValue={event.internalJoke}
                          isEditMode={isEditMode}
                          as="span"
                          className="leading-relaxed flex-1"
                        />
                      </div>
                    )}
                  </motion.article>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Cargar más": 2 meses más por clic, hasta que están todos */}
      {visibleMonths < months.length && (
        <div className="text-center mt-16">
          <button
            type="button"
            onClick={() => setVisibleMonths((n) => n + MONTHS_PER_PAGE)}
            className="px-6 py-3 rounded-full bg-[#1e0e1a] hover:bg-[#2b1425] border border-[#ff85a1]/30 hover:border-[#ff85a1]/60 text-sm font-semibold text-white shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Cargar más</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal for adding a new memory */}
      <AddMemoryModal
        isOpen={isAddMemoryOpen}
        onClose={() => setIsAddMemoryOpen(false)}
        onSave={handleSaveCustomEvent}
      />
    </section>
  );
};

// ponytail: BirthdaySlot owns the cumple's photo slot. It reads/writes
// through the server carousel bucket keyed by eventAnchor (same path
// as every other Timeline carousel), so it inherits upload progress,
// error handling, and persistence from the shared usePhotoUpload +
// usePhotos hooks — no localStorage fork, no race condition with
// Gallery.tsx. Lives next to Timeline because only the cumple uses
// this exact layout (interactive dropzone → TimelineCarousel).
interface BirthdaySlotProps {
  isEditMode: boolean;
  onRefresh: () => Promise<void> | void;
}

export const BirthdaySlot: React.FC<BirthdaySlotProps> = ({ isEditMode, onRefresh }) => {
  const { photos, loading, addPhotos, deletePhoto } = usePhotos('carousel', {
    eventId: 'event-cumple-demo-2026'
  });
  const { isUploading, progress: uploadProgress, uploadFiles } = usePhotoUpload({
    addPhotos,
    onError: (err) => alert(`Error al subir: ${err}`)
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    uploadFiles(e.target.files);
    e.target.value = '';
  };
  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar esta foto del cumple?')) return;
    try {
      await deletePhoto(id);
      await onRefresh();
    } catch (err) {
      alert(`Error al borrar: ${err}`);
    }
  };

  return (
    <div
      onClick={() => isEditMode && handleUploadClick()}
      onDragOver={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length === 0) return;
        uploadFiles(e.dataTransfer.files);
      }}
      className={`relative aspect-[16/11] sm:aspect-[4/3] rounded-3xl p-3 glass-polaroid transition-all duration-300 overflow-hidden ${
        isEditMode ? 'cursor-pointer' : 'cursor-default'
      } ${
        isDragOver
          ? 'ring-4 ring-[#ff85a1] scale-[1.02]'
          : 'hover:border-[#ff85a1]/60 hover:shadow-[0_0_30px_rgba(255,133,161,0.25)]'
      }`}
    >
      {/* Hidden file input — only mounted in edit mode (no accidental uploads from visitors). */}
      {isEditMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* ponytail: empty state — dropzone only when there's no photo and edit mode is on.
          Outside edit mode the empty state still reads as a styled card, not a "click to upload" CTA. */}
      {photos.length === 0 ? (
        isEditMode ? (
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#ff85a1]/60 bg-[#1e0e1a]/50 hover:bg-[#2a1324]/70 flex flex-col items-center justify-center p-6 text-center transition-all">
            <div className="w-16 h-16 rounded-full bg-[#ff85a1]/20 border border-[#ff85a1]/40 flex items-center justify-center text-[#ff85a1] mb-3 shadow-[0_0_20px_rgba(255,133,161,0.3)] animate-pulse">
              <Camera className="w-8 h-8" />
            </div>
            <h4 className="font-serif text-lg sm:text-xl font-bold text-white mb-1">
              {isUploading ? `Subiendo ${uploadProgress}%` : 'Tu foto del cumple aquí'}
            </h4>
            <p className="text-xs text-[#fcd5df] max-w-xs font-light">
              Toca para elegir o arrastra nuestra foto festejando tu cumpleaños.
            </p>
          </div>
        ) : (
          <div className="w-full h-full rounded-2xl bg-[#130911] flex items-center justify-center text-stone-500 text-xs italic">
            {loading ? 'Cargando…' : 'Próximamente: nuestra foto del 09/09'}
          </div>
        )
      ) : (
        <TimelineCarousel
          images={photos}
          eventTitle="¡Tu Cumpleaños!"
          eventDate="9 de Septiembre, 2026"
          isEditMode={isEditMode}
          eventId="event-cumple-demo-2026"
          onReplace={onRefresh}
        />
      )}

      {/* ponytail: per-photo delete in edit mode — only shown when there are photos. */}
      {isEditMode && photos.length > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (photos[0]) handleDelete(photos[0].id);
            }}
            className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-red-600/80 text-white text-[11px] font-semibold backdrop-blur-md transition-colors flex items-center gap-1"
            title="Borrar foto del cumple"
          >
            <Trash2 className="w-3 h-3" />
            <span>Borrar</span>
          </button>
        </div>
      )}
    </div>
  );
};

