/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Three-state floating music controller:
 *
 *   idle:    small circular button with a music-note icon. Only this
 *            while no song is playing, or as the collapsed resting
 *            state when audio IS playing but the user has collapsed
 *            the mini.
 *   mini:    expanded card over the FAB — song title + play/pause +
 *            next. Opens when the FAB is tapped from idle, collapses
 *            when the FAB is tapped again from mini.
 *   full:    the cheatsheet / codelist modal — almost full screen.
 *            Opens when the user taps the title text in mini, closes
 *            back to mini.
 *
 * Ponytail: reuses the existing audioPlayer singleton (no new audio
 * element, no Context provider). State is local — three discrete
 * values, no animation orchestration library beyond motion/react.
 * Hides entirely when no song has played yet so it never floats
 * uselessly before the user has heard anything.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Music,
  Pause,
  Play,
  SkipForward,
  X,
  Wand2,
  Lock,
  Unlock,
  Edit3,
  Sparkles,
  Heart,
  Flame,
  Cake,
  Smile,
  Cat
} from 'lucide-react';
import { audioPlayer } from '../utils/audioPlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import confetti from 'canvas-confetti';

type PlayerView = 'idle' | 'mini' | 'full';

const POLL_MS = 500;

interface MusicPlayerFabProps {
  isEditMode: boolean;
  onToggleEditMode: (value?: boolean) => void;
}

export const MusicPlayerFab: React.FC<MusicPlayerFabProps> = ({ isEditMode, onToggleEditMode }) => {
  const [currentSong, setCurrentSong] = useState(() => audioPlayer.getCurrent());
  const [playerView, setPlayerView] = useState<PlayerView>('idle');
  const [isPlaying, setIsPlaying] = useState(true);

  // ponytail: refresh cache once + poll the singleton's current song.
  // Without polling, the UI would never learn about auto-loop swaps
  // or external next() calls (e.g. the `next` keyboard cheat).
  useEffect(() => {
    audioPlayer.refreshCache();
    const id = window.setInterval(() => {
      setCurrentSong(audioPlayer.getCurrent());
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // ponytail: a new song implies it is playing. User toggles flip
  // isPlaying explicitly below.
  useEffect(() => {
    if (currentSong) setIsPlaying(true);
  }, [currentSong?.id]);

  // ponytail: ALL hooks (useState / useEffect / useCallback) MUST be
  // called in the same order on every render. The earlier version had
  // the useCallback trio AFTER the `if (!currentSong) return null`,
  // which made the first render call 3 fewer hooks than the second —
  // triggering React error #310 ("Rendered more hooks than during the
  // previous render"). All hooks live up here, then we conditionally
  // render below.

  const handleCircleClick = useCallback(() => {
    setPlayerView((v) => (v === 'idle' ? 'mini' : 'idle'));
  }, []);

  const handleTitleClick = useCallback(() => {
    setPlayerView('full');
  }, []);

  const handleCloseFull = useCallback(() => {
    setPlayerView('mini');
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.resume();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    audioPlayer.next();
    setIsPlaying(true);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    onToggleEditMode();
    if (!isEditMode) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.9 },
        colors: ['#ffd166', '#ff85a1', '#ffffff']
      });
    }
  }, [isEditMode, onToggleEditMode]);

  // Hide entirely when nothing has played yet — same rule as before,
  // now also collapses back to idle once the user dismisses mini.
  if (!currentSong) return null;

  return (
    <>
      {/* ===== Floating anchor (idle + mini share the same DOM node) ===== */}
      <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-6 z-40">
        <AnimatePresence>
          {playerView !== 'full' && (
            <motion.div
              key="player-shell"
              className="relative"
              initial={false}
            >
              {/* ===== Mini card (rendered over the FAB) ===== */}
              <AnimatePresence>
                {playerView === 'mini' && (
                  <motion.div
                    key="player-card"
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.92 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute bottom-16 right-0 w-64 sm:w-72 bg-[#1b0c19]/95 backdrop-blur-xl border border-[#ff85a1]/35 rounded-2xl p-3 shadow-2xl"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <button
                        type="button"
                        onClick={handleTitleClick}
                        className="flex-1 min-w-0 text-left rounded-lg px-2 py-1 -mx-2 hover:bg-white/5 transition-colors cursor-pointer"
                        aria-label="Abrir codelist completo"
                        title="Toca el título para abrir el codelist"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-[#ff85a1] font-semibold">
                          Sonando ahora
                        </p>
                        <p className="text-xs font-bold text-white truncate mt-0.5">
                          {currentSong.title}
                        </p>
                        {currentSong.artist && (
                          <p className="text-[11px] text-[#fcd5df] font-light truncate mt-0.5">
                            {currentSong.artist}
                          </p>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff85a1] hover:bg-[#ff4d6d] text-white text-xs font-semibold transition-colors cursor-pointer"
                        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        aria-label="Siguiente canción"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ===== Compact circle FAB (idle and the toggle for mini) ===== */}
              <motion.button
                type="button"
                onClick={handleCircleClick}
                whileTap={{ scale: 0.94 }}
                aria-label={playerView === 'mini' ? 'Replegar reproductor' : 'Expandir reproductor'}
                className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#ff85a1] to-[#ff4d6d] hover:brightness-110 text-white shadow-[0_8px_24px_rgba(255,77,109,0.45)] flex items-center justify-center transition-all hover:scale-105 cursor-pointer border border-white/15"
              >
                <Music className="w-5 h-5" />
                {/* ponytail: small pulse signals playback is live, regardless of state. */}
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Full cheatsheet + music library modal ===== */}
      <AnimatePresence>
        {playerView === 'full' && (
          <FullPlayerModal
            isEditMode={isEditMode}
            onClose={handleCloseFull}
            onToggleEditMode={handleToggleEditMode}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ===== Full modal component (the cheatsheet + music library combined) =====

interface FullPlayerModalProps {
  isEditMode: boolean;
  onClose: () => void;
  onToggleEditMode: () => void;
  currentSong: { title: string; artist: string };
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
}

const secretCommandsBase = [
  { cmd: 'pareja', label: 'Dedicado a Sam', icon: Heart },
  { cmd: 'amor', label: 'Amor Infinito', icon: Heart },
  { cmd: 'beso', label: 'Besos Dulces', icon: Flame },
  { cmd: 'canela', label: 'Los 4 Michis', icon: Cat },
  { cmd: 'cumple', label: 'Celebrar Cumple', icon: Cake },
  { cmd: 'magia', label: 'Lluvia de Estrellas', icon: Sparkles },
  { cmd: 'abrazo', label: 'Abrazo Cálido', icon: Smile },
  { cmd: 'copo', label: 'Copo', icon: Cat },
  { cmd: 'nube', label: 'Nube', icon: Cat },
  { cmd: 'demo', label: 'Nota de Alex', icon: Sparkles }
];

const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  isEditMode,
  onClose,
  onToggleEditMode,
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext
}) => {
  // ponytail: the 'editar' entry's label and icon depend on the
  // toggle state, so it is built here rather than in the static list.
  const editCommand = {
    cmd: 'editar',
    label: isEditMode ? 'Desactivar Edición' : 'Modo Edición',
    icon: isEditMode ? Lock : Edit3
  };
  const commands = [...secretCommandsBase, editCommand];

  // ponytail: we use the usePlaylist hook directly so upload + list
  // share the same source of truth as MusicLibraryModal. Preview uses
  // a separate inline <audio> so the singleton's auto-loop is not
  // disturbed (see MusicLibraryModal for the same pattern).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const { songs, loading, error, refresh, addSongs, deleteSong, deleteAll } = usePlaylist();

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

  const handlePreview = (songId: string, filePath: string) => {
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    const a = previewAudioRef.current;
    if (previewingId === songId) {
      a.pause();
      setPreviewingId(null);
    } else {
      a.src = filePath;
      a.play().catch(() => {});
      setPreviewingId(songId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center sm:justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-2xl sm:max-h-[90vh] overflow-y-auto bg-[#180c16] border border-[#ff85a1]/30 rounded-none sm:rounded-3xl shadow-2xl z-10 text-left"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Cerrar reproductor"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-8">
          {/* === Header: title + current song card === */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff85a1]/20 border border-[#ff85a1]/40 flex items-center justify-center text-[#ff85a1] shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Palabras Mágicas & Efectos
              </h3>
              <p className="text-xs text-[#fcd5df] font-light">
                Toca los comandos para activarlos, o escribí las palabras en el teclado.
              </p>
            </div>
          </div>

          {/* === Current song player card === */}
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-br from-[#ff85a1]/15 to-[#ff4d6d]/10 border border-[#ff85a1]/30">
            <p className="text-[10px] uppercase tracking-wider text-[#ff85a1] font-semibold mb-0.5">
              Sonando ahora
            </p>
            <p className="text-sm font-bold text-white truncate">{currentSong.title}</p>
            {currentSong.artist && (
              <p className="text-[11px] text-[#fcd5df] font-light truncate mt-0.5">{currentSong.artist}</p>
            )}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={onTogglePlay}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff85a1] hover:bg-[#ff4d6d] text-white text-xs font-semibold transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                aria-label="Siguiente canción"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Next</span>
              </button>
            </div>
          </div>

          {/* === Edit mode status + toggle === */}
          <div className="my-4 p-3.5 rounded-2xl bg-[#230f20] border border-[#ff85a1]/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${isEditMode ? 'bg-[#ffd166] animate-pulse' : 'bg-stone-500'}`} />
              <div>
                <div className="text-xs font-bold text-white">
                  Modo Edición: {isEditMode ? 'ACTIVADO' : 'DESACTIVADO'}
                </div>
                <div className="text-[11px] text-[#fcd5df] font-light">
                  {isEditMode
                    ? 'Los botones para agregar recuerdos y drops son visibles.'
                    : 'Activa para gestionar contenido y subir canciones.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleEditMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isEditMode
                  ? 'bg-[#ffd166] text-black border-transparent hover:bg-[#ffe082]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              {isEditMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isEditMode ? 'Bloquear' : 'Activar'}</span>
            </button>
          </div>

          {/* === Cheatsheet commands === */}
          <div className="flex flex-col gap-2 mb-5">
            {commands.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => {
                    // ponytail: each command dispatches a window event that
                    // SecretEffectsManager listens to. Keeps the cheatsheet
                    // decoupled from the manager's internal state.
                    window.dispatchEvent(new CustomEvent('trigger-secret-effect', { detail: item.cmd }));
                    if (item.cmd !== 'editar') {
                      // Collapse back to mini after triggering an effect
                      // (except 'editar', which keeps the modal open so the
                      // user can also upload songs).
                      onClose();
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#200e1e] hover:bg-[#2e142b] border border-white/10 hover:border-[#ff85a1]/50 transition-colors flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-[#ff85a1]/20 flex items-center justify-center text-[#ff85a1] transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white flex-1 text-left">
                    {item.label}
                  </span>
                  <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#ff85a1] border border-white/5">
                    {item.cmd}
                  </code>
                </button>
              );
            })}
          </div>

          {/* === Music library: upload + list === */}
          <div className="pt-4 border-t border-[#ff85a1]/15">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-[#ff85a1]" />
                Biblioteca de Canciones
              </h4>
              <span className="text-[11px] text-stone-400">
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
              </span>
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
              className="w-full px-4 py-2.5 rounded-xl bg-[#ff85a1]/15 hover:bg-[#ff85a1]/25 border border-[#ff85a1]/40 text-[#ff85a1] text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span className="text-base">＋</span>
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
              <p className="mt-2 text-xs text-rose-400">Error cargando canciones: {error}</p>
            )}

            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {loading && <p className="text-xs text-stone-400">Cargando…</p>}
              {!loading && songs.length === 0 && (
                <p className="text-xs text-stone-400 italic text-center py-3">
                  Aún no subiste ninguna canción.
                </p>
              )}
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#120710] border border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => handlePreview(song.id, song.filePath)}
                    className={`p-1.5 rounded-full ${previewingId === song.id ? 'bg-[#eaa7b8] text-[#130d1a]' : 'bg-[#251222] text-[#eaa7b8]'} hover:brightness-110 transition-all`}
                    aria-label={previewingId === song.id ? 'Pausar preview' : 'Probar'}
                  >
                    {previewingId === song.id ? '⏸' : '▶'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{song.title}</p>
                    {song.artist && (
                      <p className="text-[10px] text-stone-400 truncate">{song.artist}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Borrar "${song.title}"?`)) {
                        deleteSong(song.id);
                      }
                    }}
                    className="p-1 rounded-full hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                    aria-label="Borrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {songs.length > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Borrar todas las canciones?')) deleteAll();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs text-stone-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Borrar todas
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-[#fcd5df] text-center font-light flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd166] shrink-0" />
            <span>
              <strong>Tip:</strong> También podés presionar{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white text-[10px]">Ctrl+E</kbd>{' '}
              para alternar el modo edición.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
