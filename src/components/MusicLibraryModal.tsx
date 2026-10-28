/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit-mode-only modal for uploading, previewing, renaming and deleting songs.
 * Mirrors AddMemoryModal for visual consistency.
 *
 * ponytail: preview audio uses a separate inline <audio> owned by the modal
 * (not the audioPlayer singleton), so the singleton's auto-loop keeps
 * playing the background song untouched.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Music, Trash2 } from 'lucide-react';
import { usePlaylist } from '../hooks/usePlaylist';
import { Song } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicLibraryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const { songs, loading, error, refresh, addSongs, updateSong, deleteSong, deleteAll } = usePlaylist();

  useEffect(() => {
    if (!isOpen && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setProgress(0);
    try {
      await addSongs(Array.from(files), { onProgress: setProgress });
    } catch (e) {
      window.alert(`Error subiendo canciones: ${e}`);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const handlePreview = (song: Song) => {
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    const a = previewAudioRef.current;
    if (previewingId === song.id) {
      a.pause();
      setPreviewingId(null);
    } else {
      a.src = song.filePath;
      a.play().catch(() => {});
      setPreviewingId(song.id);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('¿Borrar todas las canciones?')) return;
    await deleteAll();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#180c16] border border-[#ff85a1]/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-left"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-full bg-[#ff85a1]/20 border border-[#ff85a1]/40 flex items-center justify-center text-[#ff85a1]">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Biblioteca de Canciones
              </h3>
              <p className="text-xs text-[#fcd5df] font-light">
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'} subida{songs.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/wav"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-[#251222] hover:bg-[#32172d] border border-[#ff85a1]/30 text-xs text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-[#ff85a1]" />
            <span>{busy ? `Subiendo… ${progress}%` : 'Subir canciones'}</span>
          </button>

          {busy && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#251222] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff85a1] to-[#ff4d6d] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-rose-400">Error cargando canciones: {error}</p>
          )}

          <div className="mt-6 space-y-2">
            {loading && <p className="text-xs text-stone-400">Cargando…</p>}
            {!loading && songs.length === 0 && (
              <p className="text-xs text-stone-400 italic">
                Aún no subiste ninguna canción. La carta sonará en silencio hasta que subas al menos una.
              </p>
            )}
            {songs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                previewing={previewingId === song.id}
                onPreview={() => handlePreview(song)}
                onRename={(title, artist) => updateSong(song.id, { title, artist })}
                onDelete={() => {
                  if (window.confirm(`¿Borrar "${song.title}"?`)) deleteSong(song.id);
                }}
              />
            ))}
          </div>

          {songs.length > 0 && (
            <div className="mt-6 pt-3 border-t border-[#ff85a1]/15 flex justify-end">
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-3 py-1.5 rounded-xl text-xs text-stone-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar todas</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface SongRowProps {
  song: Song;
  previewing: boolean;
  onPreview: () => void;
  onRename: (title: string, artist: string) => Promise<unknown>;
  onDelete: () => void;
}

const SongRow: React.FC<SongRowProps> = ({ song, previewing, onPreview, onRename, onDelete }) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const dirty = title !== song.title || artist !== song.artist;

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#120710] border border-white/10">
      <button
        type="button"
        onClick={onPreview}
        className={`p-2 rounded-full ${previewing ? 'bg-[#eaa7b8] text-[#130d1a]' : 'bg-[#251222] text-[#eaa7b8]'} hover:brightness-110 transition-all`}
        aria-label={previewing ? 'Pausar preview' : 'Probar'}
      >
        {previewing ? '⏸' : '▶'}
      </button>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => dirty && onRename(title, artist)}
        className="flex-1 px-2 py-1 rounded-lg bg-transparent border border-transparent focus:border-[#ff85a1]/30 text-white text-xs focus:outline-none"
      />
      <input
        type="text"
        value={artist}
        placeholder="Artista"
        onChange={(e) => setArtist(e.target.value)}
        onBlur={() => dirty && onRename(title, artist)}
        className="w-32 px-2 py-1 rounded-lg bg-transparent border border-transparent focus:border-[#ff85a1]/30 text-[#fcd5df] text-xs focus:outline-none"
      />
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-full hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
        aria-label="Borrar"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};