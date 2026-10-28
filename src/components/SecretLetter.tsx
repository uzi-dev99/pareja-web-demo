import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Feather } from 'lucide-react';
import { initialLetterDrops, siteMeta } from '../data/content';
import { LetterDrop } from '../types';
import { audioEngine } from '../utils/audioSynth';
import { audioPlayer } from '../utils/audioPlayer';
import { WriteLetterModal } from './WriteLetterModal';
import { EditableText } from './EditableText';

interface SecretLetterProps {
  isEditMode?: boolean;
}

const STORAGE_KEY_SINGLE_LETTER = 'pareja_single_letter_v1';

export const SecretLetter: React.FC<SecretLetterProps> = ({ isEditMode = false }) => {
  const [letter, setLetter] = useState<LetterDrop>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SINGLE_LETTER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.content) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return initialLetterDrops[0];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const handleOpenEnvelope = () => {
    if (isOpen || isOpening) return;
    setIsOpening(true);

    // Play tactile, acoustic resonant chime
    audioEngine.playLetterOpenChime();

    // Sequence: Seal crack -> flap rotates -> paper slides up and unfolds
    setTimeout(() => {
      setIsOpen(true);
      setIsOpening(false);
      audioPlayer.playRandom();
    }, 650);
  };

  const handleSaveEdit = (updatedLetter: LetterDrop) => {
    // ponytail: WriteLetterModal generates a fresh `custom-drop-{ts}` id on
    // every save, but the EditableText below is keyed on `${letter.id}.content`
    // and the server override for the carta lives under the initial id only.
    // Force the saved letter back onto the initial id so the override key
    // stays stable across modal saves — otherwise the inline-edit override
    // and the modal save fight over the same slot and the carta reverts to
    // its default text on reload.
    const stableLetter: LetterDrop = {
      ...updatedLetter,
      id: initialLetterDrops[0].id
    };
    setLetter(stableLetter);
    try {
      localStorage.setItem(STORAGE_KEY_SINGLE_LETTER, JSON.stringify(stableLetter));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section id="carta" className="py-20 px-4 max-w-5xl mx-auto text-center relative z-10">
      {/* Warm ambient candlelit glow behind the envelope */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full bg-rose-500/10 blur-[140px] pointer-events-none" />

      {/* Header section with CSS Lenti-Card effect */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10 flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff85a1]/15 border border-[#ff85a1]/30 text-[#ff85a1] text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
          <Feather className="w-3.5 h-3.5 text-[#ffd166]" />
          <span>Antes que nada unas palabras para mi amor</span>
          <Sparkles className="w-3.5 h-3.5 text-[#ff85a1]" />
        </div>

        {/* Animated Text Effect (86 Lenti-Card) */}
        <div className="mb-2">
          <div className="fx-lenticular text-2xl sm:text-4xl" data-text="CARTA SECRETA">
            CARTA SECRETA
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#fcd5df] mt-1 font-light max-w-lg mx-auto">
          Romantico en BIG 2026 be like:
        </p>

        {isEditMode && (
          <button
            type="button"
            onClick={() => setIsWriteModalOpen(true)}
            className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#ffd166]/15 hover:bg-[#ffd166]/25 border border-[#ffd166]/50 text-[#ffd166] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Editar texto de la carta</span>
          </button>
        )}
      </motion.div>

      {/* Interactive Envelope / Unfolded Letter Container */}
      <div className="relative max-w-2xl mx-auto min-h-[480px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* ========================================================================= */
            /* ULTRA-DETAILED PHYSICAL ENVELOPE (CLOSED)                                */
            /* ========================================================================= */
            <motion.div
              key="physical-envelope"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -15 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-xl mx-auto"
            >
              <div
                onClick={handleOpenEnvelope}
                className="group relative cursor-pointer select-none perspective-[1200px]"
              >
                {/* Envelope Container with realistic shadows & gold border */}
                <div className="relative rounded-3xl bg-gradient-to-br from-[#331126] via-[#220919] to-[#14040f] border-2 border-[#d4af37]/35 p-7 sm:p-11 shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-500 group-hover:border-[#d4af37]/70 group-hover:-translate-y-1.5 overflow-hidden">
                  
                  {/* Subtle Inner Silk Lining Accent Pattern */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffd166_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

                  {/* 3D Envelope Flap Folds (Geometric Depth) */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                    {/* Top Triangular Flap Shadow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[180px] sm:border-l-[280px] border-l-transparent border-r-[180px] sm:border-r-[280px] border-r-transparent border-t-[120px] sm:border-t-[160px] border-t-[#3f1630]/90 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" />
                    
                    {/* Gold filigree line tracing flap edge */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ffd166]/50 to-transparent" />
                    
                    {/* Left & Right Diagonal Fold Reflections */}
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-tr from-black/40 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-tl from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Vintage Postage Stamp in Top-Right Corner */}
                  <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20 pointer-events-none">
                    <div className="relative p-1.5 rounded bg-[#fff8ee] shadow-lg border border-dashed border-[#b38867] flex flex-col items-center justify-center rotate-3 w-16 sm:w-20">
                      <div className="w-full py-1 bg-rose-950/10 rounded flex flex-col items-center justify-center border border-rose-900/20">
                        <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#b7094c] fill-[#b7094c]" />
                        <span className="text-[7px] sm:text-[8px] font-mono font-bold text-[#3a1d28] uppercase mt-0.5 tracking-tighter">
                          09 • IX • 26
                        </span>
                      </div>
                      <span className="text-[6px] sm:text-[7px] font-mono text-[#8c5a45] uppercase tracking-widest mt-1">
                        AMOR
                      </span>

                      {/* Postmark Ink Stamp Cancellation */}
                      <div className="absolute -left-3 -bottom-2 w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#8c5a45]/50 flex items-center justify-center pointer-events-none -rotate-12">
                        <span className="text-[5px] sm:text-[6px] font-mono text-[#8c5a45]/70 font-semibold text-center leading-none">
                          NUBE<br />& COPO
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Envelope Front Details & Calligraphy */}
                  <div className="relative z-10 flex flex-col items-center pt-2 sm:pt-4">
                    
                    {/* Postmark Tag */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ffd166]/10 border border-[#ffd166]/30 text-[#ffd166] text-[10px] font-mono uppercase tracking-widest mb-3">
                      <Sparkles className="w-3 h-3" />
                      <span>{letter.date}</span>
                    </div>

                    {/* Hand-lettered Calligraphic Address */}
                    <div className="text-center my-3 sm:my-5">
                      <p className="text-[11px] sm:text-xs font-mono tracking-widest text-[#fcd5df]/70 uppercase">
                        Para el amor de mi vida:
                      </p>
                      <h3 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-wide mt-1.5 text-shadow-sm">
                        {siteMeta.herName}
                      </h3>
                      <p className="font-serif text-base sm:text-lg text-[#ffd166] mt-1 italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                        "La reina indiscutida de este hogar y de mi corazón"
                      </p>
                    </div>

                    {/* Highly Detailed 3D Wax Seal */}
                    <div className="relative my-4 sm:my-6 flex items-center justify-center">
                      {/* Candlelit pulse ring */}
                      <span className="absolute w-24 h-24 rounded-full border border-[#ff4d6d]/40 animate-ping pointer-events-none" />

                      {/* 3D Wax Seal Button */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 3 }}
                        whileTap={{ scale: 0.92 }}
                        animate={isOpening ? { scale: [1, 0.9, 1.25, 0], opacity: [1, 1, 0.8, 0] } : {}}
                        transition={{ duration: 0.55 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-[0_10px_25px_rgba(183,9,76,0.7),inset_0_2px_6px_rgba(255,255,255,0.4)] flex items-center justify-center border-2 border-[#ffd166]/40 transition-all cursor-pointer relative z-20"
                        style={{
                          background: 'radial-gradient(circle at 35% 30%, #e01e5a 0%, #b7094c 55%, #670527 100%)',
                        }}
                      >
                        {/* Realistic Debossed Seal Rim */}
                        <div className="w-16 h-16 sm:w-19 sm:h-19 rounded-full border border-dashed border-[#ffd166]/60 flex flex-col items-center justify-center shadow-inner">
                          <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                          <span className="text-[9px] font-mono font-bold text-white/90 tracking-widest mt-0.5 drop-shadow">
                            A ♥ S
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Sender Footnote */}
                    <div className="text-center mt-2">
                      <p className="mt-3 text-xs tracking-widest uppercase text-[#ffd166] font-semibold flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Toca el sello de cera para abrir</span>
                        <Sparkles className="w-3.5 h-3.5" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* PHYSICAL PARCHMENT LETTER (UNFOLDED & READABLE)                          */
            /* ========================================================================= */
            <motion.div
              key="physical-letter"
              initial={{ opacity: 0, y: 35, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl mx-auto"
            >
              {/* Paper parchment card */}
              <div className="relative rounded-3xl bg-gradient-to-b from-[#fffefc] via-[#fffbf2] to-[#faf5e8] text-[#2b2b2b] p-8 sm:p-12 lg:p-14 shadow-2xl shadow-black/90 border border-[#e8ded1] text-left transition-all overflow-hidden">
                
                {/* Subtle paper grain texture & luxury framing */}
                <div className="absolute inset-0 bg-[radial-gradient(#d6ccc2_1px,transparent_1px)] [background-size:18px_18px] opacity-20 pointer-events-none" />
                <div className="absolute inset-3 sm:inset-4 rounded-2xl border border-[#c9184a]/15 pointer-events-none" />

                {/* Top letterhead header */}
                <div className="relative z-10 flex items-center justify-between border-b border-amber-900/15 pb-4 mb-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#a37050] font-semibold">
                      {letter.date}
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3a1d28] mt-0.5 tracking-tight">
                      {letter.title}
                    </h3>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-rose-100/90 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                    <Heart className="w-5 h-5 fill-rose-600" />
                  </div>
                </div>

                {/* Body Content - Big, Modern, Expressive Typography */}
                <div className="relative z-10 my-4 sm:my-6">
                  <div className="text-5xl sm:text-6xl font-serif text-rose-400/25 leading-none select-none -mb-4 font-bold">
                    “
                  </div>
                  <EditableText
                    scope="letter"
                    id={`${letter.id}.content`}
                    defaultValue={letter.content}
                    isEditMode={isEditMode}
                    as="div"
                    multiline
                    className="font-serif italic text-xl sm:text-2xl lg:text-3xl leading-snug sm:leading-relaxed text-[#3a1d28] font-medium whitespace-pre-line tracking-tight"
                  />
                </div>

                {/* Signature footer */}
                <div className="relative z-10 mt-8 pt-6 border-t border-amber-900/15 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#a37050] font-mono font-medium">
                      Con todo mi amor,
                    </p>
                    <p className="font-serif italic text-3xl sm:text-4xl text-[#c9184a] font-semibold mt-1 tracking-wide">
                      {letter.author}
                    </p>
                  </div>

                  {/* Actions removed (Volver / Print / Email) per wt request — letter stays open once opened. */}

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal for editing letter text */}
      <WriteLetterModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </section>
  );
};
