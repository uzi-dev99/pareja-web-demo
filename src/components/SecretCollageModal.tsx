import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, X, Sparkles, Heart, AlertCircle, Cat, Feather, Plus, Trash2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { easterEggPin, siteMeta } from '../data/content';
import { Photo } from '../types';
import { audioEngine } from '../utils/audioSynth';
import { usePhotos } from '../hooks/usePhotos';
import { usePhotoUpload } from '../hooks/usePhotoUpload';

interface SecretCollageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode?: boolean;
}

export const SecretCollageModal: React.FC<SecretCollageModalProps> = ({ isOpen, onClose, isEditMode = false }) => {
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const { photos: secretPhotos, addPhotos, deletePhoto, updatePhoto } = usePhotos('secret');

  // ponytail: two parallel bulk-upload hooks — one for the add flow
  // (multi-file, since the user wants to drop a batch) and one for
  // the replace flow (single-file, since replace targets one polaroid
  // at a time). Sharing the helper keeps both consistent with the
  // public Gallery. Both expose the standard { isUploading, progress,
  // uploadFiles } shape.
  const { isUploading: isAdding, progress: addProgress, uploadFiles } = usePhotoUpload({
    addPhotos,
    onError: (err) => alert(`Error al agregar: ${err}`)
  });

  // ponytail: replace is a 2-step dance (delete old + add new), so it
  // wraps the hook in a small adapter that still owns the
  // delete-then-upload coordination.
  const handleReplaceUpload = async (file: File) => {
    if (!replacingId) return;
    const targetId = replacingId;
    setReplacingId(null);
    try {
      await deletePhoto(targetId);
      await addPhotos([file]);
    } catch (err) {
      alert(`Error al reemplazar: ${err}`);
    }
  };
  const { isUploading: isReplacing, uploadFiles: uploadReplaceFiles } = usePhotoUpload({
    addPhotos: (files) => handleReplaceUpload(files[0]).then(() => []),
    onError: (err) => alert(`Error al reemplazar: ${err}`)
  });
  const replaceProgress = 0; // ponytail: single-file replace shows indeterminate spinner.

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === easterEggPin) {
      setIsUnlocked(true);
      setErrorMsg('');
      audioEngine.playLetterOpenChime();
      confetti({
        particleCount: 70,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#eaa7b8', '#ff69b4', '#ffd700']
      });
    } else {
      setErrorMsg(`Código incorrecto. Pista: Es nuestra fecha o mes especial.`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleClose = () => {
    setPinInput('');
    setIsUnlocked(false);
    setErrorMsg('');
    onClose();
  };

  const handleAddPolaroid = () => addFileRef.current?.click();

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    // ponytail: pass the FULL FileList. The hook's Array.from does
    // the iteration. Previously the handler truncated to files[0],
    // which silently dropped every photo past the first one.
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleStartReplace = (id: string) => {
    setReplacingId(id);
    setTimeout(() => replaceFileRef.current?.click(), 0);
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    // ponytail: replace is always single-file by design (replace one
    // polaroid with one new image). Take the first picked file and
    // hand it to the replace hook which coordinates delete-then-add.
    uploadReplaceFiles(e.target.files);
    e.target.value = '';
  };

  const handleDeletePolaroid = async (id: string) => {
    if (!confirm('¿Borrar esta polaroid?')) return;
    try {
      await deletePhoto(id);
    } catch (err) {
      alert(`Error al borrar: ${err}`);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="secret-collage-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Rincón secreto de polaroids"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
        onClick={handleClose}
      >
        {isEditMode && (
          <>
            {/* ponytail: bulk-upload the whole batch — previously
                lacked `multiple` and the handler also truncated to
                files[0], so a multi-selection silently dropped the
                rest. Now both fixed.
                IMPORTANT: stopPropagation on the synthetic click — the
                inputs live OUTSIDE the motion.div that stops propagation,
                and `addFileRef.current.click()` would otherwise bubble
                up to the backdrop's onClick={handleClose}, closing the
                modal the moment the user opens the file picker. */}
            <input ref={addFileRef} type="file" accept="image/*" multiple onChange={handleAddFiles} onClick={(e) => e.stopPropagation()} className="hidden" />
            <input ref={replaceFileRef} type="file" accept="image/*" onChange={handleReplaceFile} onClick={(e) => e.stopPropagation()} className="hidden" />
          </>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="relative max-w-2xl w-full bg-[#150f20] border border-[#eaa7b8]/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-colors"
            aria-label="Cerrar modal de secretos"
          >
            <X className="w-5 h-5" />
          </button>

          {!isUnlocked ? (
            /* PIN Gate View */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#eaa7b8]/15 border border-[#eaa7b8]/30 flex items-center justify-center text-[#eaa7b8] mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white mb-1">
                Área <span className="fx-lenticular text-xl sm:text-2xl" data-text="SECRETA">SECRETA</span> 🔒
              </h3>
              <p className="text-xs sm:text-sm text-[#caa8b4] max-w-sm mx-auto mb-6">
                Para desbloquear este rincón confidencial, introduce el PIN (si es el mismo de siempre):
              </p>

              <form onSubmit={handleVerifyPin} className="max-w-xs mx-auto space-y-4">
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN secreto..."
                  className="w-full text-center text-2xl tracking-[0.4em] py-3 px-4 rounded-xl bg-[#0f0a17] border border-[#eaa7b8]/30 text-white focus:outline-none focus:border-[#eaa7b8] focus:ring-1 focus:ring-[#eaa7b8] transition-all font-mono"
                  autoFocus
                />

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-1 text-xs text-rose-400 font-medium"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#eaa7b8] to-[#dc7492] hover:from-[#f3b5c4] hover:to-[#e888a3] text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#eaa7b8]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear Rincón</span>
                </button>
              </form>
            </div>
          ) : (
            /* Unlocked Secret Memories View */
            <div className="py-2">
              <div className="flex items-center gap-2 text-center justify-center mb-6">
                <Sparkles className="w-5 h-5 text-[#eaa7b8]" />
                <h3 className="font-serif text-2xl font-bold text-white">
                  Nuestro <span className="fx-lenticular text-xl sm:text-2xl" data-text="RINCÓN">RINCÓN</span> Secreto ❤️
                </h3>
                <Sparkles className="w-5 h-5 text-[#eaa7b8]" />
              </div>

              <p className="text-xs text-center text-[#caa8b4] mb-6">
                Fotos espontáneas, recuerdos sin filtro y promesas que solo sabemos nosotros dos.
              </p>

              {/* Edit-mode add polaroid button */}
              {isEditMode && (
                <div className="mb-4">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleAddPolaroid}
                      disabled={isAdding || isReplacing}
                      className="px-4 py-2 rounded-xl bg-[#eaa7b8]/20 hover:bg-[#eaa7b8]/35 border border-[#eaa7b8]/50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isAdding ? (
                        <span className="ld-barber" aria-label="Agregando" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{isAdding ? `Subiendo ${addProgress}%` : 'Agregar foto'}</span>
                    </button>
                  </div>
                  <AnimatePresence>
                    {(isAdding || isReplacing) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3 max-w-xs mx-auto"
                      >
                        <div className="upload-progress-shell">
                          <div
                            className="upload-progress-bar"
                            style={{ width: `${isAdding ? addProgress : replaceProgress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Polaroid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {secretPhotos.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative p-3 bg-white text-stone-900 rounded-xl shadow-xl transform rotate-[-1deg] hover:rotate-0 transition-transform"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100 mb-2">
                      <img
                        src={item.thumbnailUrl || item.filePath}
                        alt={item.caption || 'Recuerdo secreto'}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-rose-500 shadow-md">
                        <Heart className="w-4 h-4 fill-rose-500" />
                      </span>

                      {/* Edit-mode per-polaroid actions */}
                      {isEditMode && (
                        <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartReplace(item.id)}
                            className="p-1.5 rounded-full bg-white/95 hover:bg-[#eaa7b8] text-stone-700 hover:text-white shadow-md transition-colors cursor-pointer"
                            title="Reemplazar foto"
                            aria-label="Reemplazar"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePolaroid(item.id)}
                            className="p-1.5 rounded-full bg-red-500/95 hover:bg-red-600 text-white shadow-md transition-colors cursor-pointer"
                            title="Borrar foto"
                            aria-label="Borrar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-serif italic text-stone-800 leading-snug px-1">
                      "{item.caption}"
                    </p>
                  </motion.div>
                ))}
                {secretPhotos.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-stone-400 text-sm">
                    {isEditMode ? 'Aún no hay polaroids. Tocá "Agregar foto" para empezar.' : 'No hay recuerdos secretos aún.'}
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <span className="text-xs text-[#eaa7b8] font-semibold">
                  Te amo con locura, {siteMeta.herName} • Por siempre tu {siteMeta.hisName}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
