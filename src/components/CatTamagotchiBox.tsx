import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Fish,
  Sparkles,
  Music,
  Camera,
  Feather,
  Package,
  Sparkle,
  Volume2,
  Disc,
  Brush
} from 'lucide-react';
import { audioEngine } from '../utils/audioSynth';
import { triggerClickWhisper } from './ClickWhisper';
import { PetdexCatAvatar } from './PetdexCatAvatar';
// ponytail: FurnitureLayer was retired when the sanctuary backdrop switched
// to /box/sanctuary-background.jpg — the new image already contains desk,
// lamp, rug, bookshelf, etc. The legacy SVG assets still live in
// public/furniture/ for reuse elsewhere.
import { applyDragDelta } from '../pets/drag';

export type CatType = 'orange' | 'black' | 'grey' | 'white';

interface CatData {
  id: CatType;
  name: string;
  breed: string;
  personality: string;
  themeColor: string;
  /** ponytail: override for the speech-bubble label text color. Falls back to
   *  `themeColor` when omitted. Needed when `themeColor` is too dark to read
   *  as text — Trufa's #1f1f2e renders dark-on-dark otherwise. */
  labelTextColor?: string;
  tagColor: string;
  x: number; // percentage (10 to 86)
  y: number; // percentage (35 to 76)
  targetX: number;
  direction: 1 | -1;
  state: 'idle' | 'walking' | 'sleeping' | 'eating' | 'playing' | 'jumping' | 'in_box' | 'petted' | 'spinning';
  hunger: number;
  happiness: number;
  pettedCount: number;
  thought: string;
  specialTrait: string;
}

const CAT_THOUGHTS: Record<CatType, string[]> = {
  orange: [
    'Soy Canela, el rey naranja de tus días🦁💛',
    'Atunn porfa 🥺',
    'Amo acostarme encima de tu cabeza🐾',
    'Amo a mis papisss ✨',
    'Tengo el estómago sensible dame poco atún o vomito'
  ],
  black: [
    'Soy Trufa, la panterita elegante con ojos esmeralda 🖤✨',
    ' Vigilando la energia para que todo esté en paz en nuestro hogar 🌙',
    'MIAUU MIAAAAAAAAAUUU MIAAAAU 🖤',
    'bajame bajame bajame bajame bajame quiero salir quiero salir 🐾',
    'Amo dormir en sus pies papisss 🐈‍⬛'
  ],
  grey: [
    ' La princesa de la casa, aquiii NUBE🩶',
    'ATUNN MAAAMAAA DAME ATUNNNNN💤',
    'Qué linda que estás hoy mami, te amo 🌸',
    'Amo las caricias detrás de las orejitas, no pares por favor 🥰',
    'abrime la habitacion que extraño la mantitaaaaa 🥺'
  ],
  white: [
    'Aquii la Copo, estoy loquita pero amo a mis papis',
    'A veces me cuesta limpiarme el culo shhhh 🫣',
    'QUIERO JUGUETES 💕',
    'Pisar con elegancia es mi especialidad ✨',
    'Amo dormir en la almohada al lado de mis papis🎀'
  ]
};


export const CatTamagotchiBox: React.FC = () => {
  const [cats, setCats] = useState<CatData[]>([
    {
      id: 'orange',
      name: 'Canela',
      breed: 'Gato Atigrado Naranja',
      personality: 'Travieso, juguetón y mimoso',
      themeColor: '#f39c12',
      tagColor: 'bg-[#f39c12]/20 text-[#ffd166] border-[#f39c12]/40',
      x: 18,
      y: 54,
      targetX: 25,
      direction: 1,
      state: 'idle',
      hunger: 80,
      happiness: 95,
      pettedCount: 0,
      thought: 'Soy lío y tengo el estómago sensible🦁💛',
      specialTrait: 'Pide atún haciendo ojitos tiernos'
    },
    {
      id: 'black',
      name: 'Trufa',
      breed: 'Panterita Negra',
      personality: 'Elegante, protectora con ojos esmeralda',
      // ponytail: Trufa's sprite is a black panther — pick a deep neutral
      // theme so the speech bubble, food bowl and tag read "michi negro"
      // instead of the previous lavender that didn't match the cat.
      themeColor: '#1f1f2e',
      // ponytail: themeColor is also used as label text — override with the
      // same light slate that tagColor uses, so Trufa's name reads on the
      // dark speech-bubble background.
      labelTextColor: '#e2e8f0',
      tagColor: 'bg-[#1f1f2e]/40 text-[#e2e8f0] border-[#1f1f2e]/60',
      x: 42,
      y: 48,
      targetX: 45,
      direction: -1,
      state: 'idle',
      hunger: 75,
      happiness: 90,
      pettedCount: 0,
      thought: 'MIAAAAUUUU lapaz nunca fue OPCION 🖤',
      specialTrait: 'Duerme enrollado como donita'
    },
    {
      id: 'grey',
      name: 'Nube',
      breed: 'Tabby Gris Plateada',
      personality: 'Dormilona profesional con cascabelito azul',
      // ponytail: Nube's sprite is the grey tabby — theme must read
      // "gatita gris" so the bubble border / bowl tint match the sprite.
      themeColor: '#94a3b8',
      tagColor: 'bg-[#94a3b8]/20 text-[#cbd5e1] border-[#94a3b8]/40',
      x: 64,
      y: 58,
      targetX: 68,
      direction: 1,
      state: 'sleeping',
      hunger: 70,
      happiness: 88,
      pettedCount: 0,
      thought: 'MAMAA QUIERO ATUNNNNN... 💤',
      specialTrait: 'Su cascabel suena ring-ring'
    },
    {
      id: 'white',
      name: 'Copo',
      breed: 'Ragdoll Esponjosa Blanca',
      personality: 'Peluche viviente con ojos de zafiro',
      // ponytail: Copo's sprite is the white ragdoll — pick a soft white
      // tone so the bubble / bowl tint reads "gatita blanca" instead of
      // the previous slate that didn't match.
      themeColor: '#f5f5f4',
      tagColor: 'bg-[#f5f5f4]/15 text-[#f5f5f4] border-[#f5f5f4]/40',
      x: 82,
      y: 50,
      targetX: 78,
      direction: -1,
      state: 'idle',
      hunger: 85,
      happiness: 98,
      pettedCount: 0,
      thought: 'Soy un conejo hablador y?? 👑🩶',
      specialTrait: 'Pelaje de nube ultra suave'
    }
  ]);

  const [activeSpeechCat, setActiveSpeechCat] = useState<CatType | null>(null);
  const [foodInBowls, setFoodInBowls] = useState<boolean>(false);
  const [ballPosition, setBallPosition] = useState<{ x: number; y: number } | null>(null);
  const [featherPosition, setFeatherPosition] = useState<{ x: number; y: number } | null>(null);
  const [catnipActive, setCatnipActive] = useState(false);
  const [lullabyActive, setLullabyActive] = useState(false);
  const [isBrushing, setIsBrushing] = useState(false);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const [polaroidOpen, setPolaroidOpen] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [catInBoxId, setCatInBoxId] = useState<CatType | null>(null);

  const [totalPets, setTotalPets] = useState<number>(() => {
    return parseInt(localStorage.getItem('cat_box_total_pets') || '12', 10);
  });
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number; text?: string }[]>([]);

  const boxRef = useRef<HTMLDivElement>(null);

  // Drag state — see handleCatPointerDown / Move / Up. Pure math lives in
  // src/pets/drag.ts (tested). The refs avoid re-renders during drag.
  const [draggingCatId, setDraggingCatId] = useState<CatType | null>(null);
  const dragStartRef = useRef<{
    catId: CatType;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startCatX: number;
    startCatY: number;
  } | null>(null);
  const didDragRef = useRef(false);

  const handleCatPointerDown = (cat: CatData, e: React.PointerEvent) => {
    // ponytail: capture the pointer so pointermove / up keep firing even when
    // the cursor leaves the cat's box — no window/document listeners needed.
    dragStartRef.current = {
      catId: cat.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCatX: cat.x,
      startCatY: cat.y,
    };
    didDragRef.current = false;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleCatPointerMove = (cat: CatData, e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dxPx = e.clientX - start.startClientX;
    const dyPx = e.clientY - start.startClientY;
    // 5px threshold avoids triggering drag on tiny accidental moves
    if (!didDragRef.current && Math.abs(dxPx) + Math.abs(dyPx) < 5) return;
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const next = applyDragDelta(
      start.startCatX,
      start.startCatY,
      dxPx,
      dyPx,
      rect.width,
      rect.height,
    );
    didDragRef.current = true;
    if (draggingCatId !== cat.id) setDraggingCatId(cat.id);
    setCats((prev) => prev.map((c) => (c.id === cat.id ? { ...c, x: next.x, y: next.y } : c)));
  };

  const handleCatPointerUp = (e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* element might already have lost capture — safe to ignore */
    }
    dragStartRef.current = null;
    setDraggingCatId(null);
    // didDragRef stays as-is until the next pointerdown resets it; the onClick
    // handler below consumes it.
  };

  // Autonomous wandering loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCats((prevCats) =>
        prevCats.map((cat) => {
          // If in special state, don't wander randomly
          if (
            cat.state === 'sleeping' ||
            cat.state === 'eating' ||
            cat.state === 'petted' ||
            cat.state === 'in_box' ||
            cat.state === 'spinning'
          ) {
            return cat;
          }

          // ponytail: don't fight the user while they're dragging this cat.
          if (draggingCatId === cat.id) {
            return cat;
          }

          const actionRoll = Math.random();
          if (actionRoll < 0.38) {
            const newX = Math.max(12, Math.min(84, cat.x + (Math.random() * 26 - 13)));
            const newY = Math.max(38, Math.min(74, cat.y + (Math.random() * 12 - 6)));
            const newDirection = (newX >= cat.x ? 1 : -1) as 1 | -1;

            return {
              ...cat,
              x: newX,
              y: newY,
              direction: newDirection,
              state: 'walking'
            };
          } else if (actionRoll < 0.65) {
            return {
              ...cat,
              state: 'idle'
            };
          }
          return cat;
        })
      );
    }, 3600);

    return () => clearInterval(interval);
  }, []);

  // 1. Action: FEED CATS
  const handleFeed = () => {
    setFoodInBowls(true);
    audioEngine.playEatChomp();
    audioEngine.playSparkle();

    setCats((prev) =>
      prev.map((cat, idx) => ({
        ...cat,
        state: 'eating',
        hunger: 100,
        happiness: 100,
        thought: '¡Mmm ATUNN SIII DELICIOSO ATUNNN, gracias papis 💕',
        x: 28 + idx * 14,
        y: 85
      }))
    );

    setTimeout(() => {
      setFoodInBowls(false);
      setCats((prev) =>
        prev.map((cat) => ({
          ...cat,
          state: 'idle'
        }))
      );
    }, 4500);
  };

  // 2. Action: PET CAT
  const handlePetCat = (catId: CatType, e?: React.MouseEvent) => {
    audioEngine.playCatPurr();
    audioEngine.playCatMeow(catId === 'white' ? 1.25 : catId === 'black' ? 0.9 : 1.05);

    const newPets = totalPets + 1;
    setTotalPets(newPets);
    localStorage.setItem('cat_box_total_pets', newPets.toString());

    if (e && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setFloatingHearts((prev) => [
        ...prev.slice(-8),
        { id: Date.now() + Math.random(), x: clickX, y: clickY, text: '❤️ +1 Mimo' }
      ]);
    }

    setCats((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          const thoughts = CAT_THOUGHTS[catId];
          const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
          return {
            ...c,
            state: 'petted',
            happiness: 100,
            pettedCount: c.pettedCount + 1,
            thought: randomThought
          };
        }
        return c;
      })
    );

    setActiveSpeechCat(catId);

    setTimeout(() => {
      setCats((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, state: 'idle' } : c))
      );
    }, 3200);
  };

  // 3. Action: THROW YARN BALL
  const handleThrowBall = () => {
    audioEngine.playSparkle();
    const randX = 25 + Math.random() * 50;
    const randY = 48 + Math.random() * 22;
    setBallPosition({ x: randX, y: randY });

    setCats((prev) =>
      prev.map((c) => ({
        ...c,
        state: 'playing',
        direction: (randX >= c.x ? 1 : -1) as 1 | -1,
        x: Math.min(84, Math.max(12, randX + (Math.random() * 16 - 8))),
        y: Math.min(72, Math.max(42, randY + (Math.random() * 10 - 5))),
        happiness: 100
      }))
    );

    setTimeout(() => {
      setBallPosition(null);
      setCats((prev) => prev.map((c) => ({ ...c, state: 'idle' })));
    }, 4500);
  };

  // 4. Action: FEATHER WAND (VARITA DE PLUMAS)
  const handleFeatherTeaser = () => {
    audioEngine.playFeatherSwish();
    const fx = 35 + Math.random() * 30;
    const fy = 35 + Math.random() * 20;
    setFeatherPosition({ x: fx, y: fy });

    // 2 random cats jump excitedly towards the feather
    setCats((prev) =>
      prev.map((c, i) => {
        if (i % 2 === 0) {
          return {
            ...c,
            state: 'jumping',
            direction: (fx >= c.x ? 1 : -1) as 1 | -1,
            x: fx + (i === 0 ? -10 : 10),
            y: fy + 18,
            happiness: 100,
            thought: '¡MODO CAZADOR ACTIVADO! ¡MIOOO! 🪶✨'
          };
        }
        return { ...c, direction: (fx >= c.x ? 1 : -1) as 1 | -1 };
      })
    );

    setTimeout(() => {
      audioEngine.playCatMeow(1.1);
      setFeatherPosition(null);
      setCats((prev) => prev.map((c) => ({ ...c, state: 'idle' })));
    }, 3800);
  };

  // 5. Action: CARDBOARD BOX SURPRISE ("SI QUEPO ME SIENTO")
  const handleBoxJump = () => {
    audioEngine.playSparkle();
    const candidateCats: CatType[] = ['orange', 'black', 'grey', 'white'];
    const chosenCat = candidateCats[Math.floor(Math.random() * candidateCats.length)];
    setCatInBoxId(chosenCat);

    setCats((prev) =>
      prev.map((c) => {
        if (c.id === chosenCat) {
          return {
            ...c,
            state: 'in_box',
            x: 86, // Inside the box on right
            y: 52,
            happiness: 100,
            thought: '📦 CAJA LOVERRR AMMMOOORRCH'
          };
        }
        return c;
      })
    );

    setActiveSpeechCat(chosenCat);

    setTimeout(() => {
      setCatInBoxId(null);
      setCats((prev) =>
        prev.map((c) => (c.id === chosenCat ? { ...c, state: 'idle', x: 74, y: 55 } : c))
      );
    }, 5500);
  };

  // 6. Action: LULLABY MUSIC BOX (CANCIÓN DE CUNA Y SIESTA GRUPAL)
  const handleLullaby = () => {
    setLullabyActive(true);
    audioEngine.playCatLullaby();

    // All cats gather together on the fluffy rug and sleep in unison
    setCats((prev) =>
      prev.map((c, i) => ({
        ...c,
        state: 'sleeping',
        x: 36 + i * 9,
        y: 60,
        happiness: 100,
        thought: 'Zzz... mantras tranquilizadores, a mimiirrr ZZzzZ'
      }))
    );

    setTimeout(() => {
      setLullabyActive(false);
      setCats((prev) => prev.map((c) => ({ ...c, state: 'idle' })));
    }, 6000);
  };

  // 7. Action: CATNIP MAGIC (HIERBA GATUNA MÁGICA)
  const handleCatnip = () => {
    setCatnipActive(true);
    audioEngine.playCatnipMagic();

    // Cats spin with joy and starry eyes
    setCats((prev) =>
      prev.map((c) => ({
        ...c,
        state: 'spinning',
        happiness: 100,
        thought: '🌿 FALOPAAA SIIII CAT DRUGS AAA 😻✨'
      }))
    );

    setTimeout(() => {
      setCatnipActive(false);
      setCats((prev) => prev.map((c) => ({ ...c, state: 'idle' })));
    }, 4500);
  };

  // 8. Action: GROOMING BRUSH SPA
  const handleBrushSpa = () => {
    setIsBrushing(true);
    audioEngine.playCatPurr();
    audioEngine.playWhisperSound();
    setBrushPos({ x: 50, y: 50 });

    setCats((prev) =>
      prev.map((c) => ({
        ...c,
        state: 'petted',
        happiness: 100,
        thought: '✨ Spa SESSION ammmooorrrr🧼'
      }))
    );

    setTimeout(() => {
      setIsBrushing(false);
      setBrushPos(null);
      setCats((prev) => prev.map((c) => ({ ...c, state: 'idle' })));
    }, 4000);
  };

  // 9. Action: POLAROID SNAPSHOT
  const handleTakeSnapshot = () => {
    audioEngine.playCameraShutter();
    setFlashTrigger(true);
    setTimeout(() => setFlashTrigger(false), 280);
    setTimeout(() => setPolaroidOpen(true), 350);
  };

  return (
    <section
      id="gatos-sanctuary"
      aria-label="Rincón de los 4 Gatos Tamagotchi"
      className="py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-[#130712] via-[#1a0c1a] to-[#120613]"
    >
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#ffd166]/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-[#ff758f]/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffd166]/10 border border-[#ffd166]/30 mb-3 text-xs font-semibold text-[#ffd166]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ellos merecian su seccion ammmoooorrr 🫰</span>
          </div>

          <h2
            onClick={(e) =>
              triggerClickWhisper(
                e,
                'Rodeados de amor gatuno 🐾'
              )
            }
            className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-3 cursor-pointer select-none"
          >
            Nuestros amores <span className="fx-gold-shimmer">:))</span>
          </h2>

          <p className="text-sm sm:text-base text-[#fcd5df] font-light leading-relaxed">
            <motion.span
              className="inline-block"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="inline w-3.5 h-3.5 fill-[#ff85a1] text-[#ff85a1]" />{' '}
              <span className="fx-lenticular font-semibold text-[#cbd5e1]" data-text="Nube">Nube</span>{' '}
              <Heart className="inline w-3.5 h-3.5 fill-[#ff85a1] text-[#ff85a1]" />{' '}
              <span className="fx-lenticular font-semibold text-[#f5f5f4]" data-text="Copo">Copo</span>{' '}
              <Heart className="inline w-3.5 h-3.5 fill-[#ff85a1] text-[#ff85a1]" />{' '}
              <span className="fx-lenticular font-semibold text-[#ffd166]" data-text="Canela">Canela</span>{' '}
              <Heart className="inline w-3.5 h-3.5 fill-[#ff85a1] text-[#ff85a1]" />{' '}
              <span className="fx-lenticular font-semibold text-[#cbd5e1]" data-text="Trufa">Trufa</span>{' '}
              <Heart className="inline w-3.5 h-3.5 fill-[#ff85a1] text-[#ff85a1]" />
            </motion.span>
          </p>
        </div>

        {/* =========================================================================
            THE TAMAGOTCHI LIVING BOX (HIGHLY DETAILED & COZY INTERIOR)
           ========================================================================= */}
        <div
          ref={boxRef}
          className="relative w-full rounded-3xl border-4 border-[#5e3852] overflow-hidden bg-gradient-to-b from-[#2e192c] via-[#221022] to-[#170918] transition-all duration-700 shadow-[0_25px_60px_rgba(0,0,0,0.75)]"
          style={{ minHeight: '460px', height: '510px' }}
        >
          {/* Sanctuary background (replaces the old CSS decor + FurnitureLayer). */}
          <img
            src="/box/sanctuary-background.jpg"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
          />

          {/* Feed bowls overlay (anchored to the new sanctuary background). */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            {cats.map((cat) => (
              <div
                key={`bowl-${cat.id}`}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${28 + cats.findIndex((c) => c.id === cat.id) * 14}%`,
                  top: '85%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div
                  className="w-12 h-7 sm:w-14 sm:h-8 rounded-b-xl border-2 flex items-center justify-center relative shadow-md"
                  style={{
                    backgroundColor: `${cat.themeColor}22`,
                    borderColor: cat.themeColor
                  }}
                >
                  {foodInBowls && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs"
                    >
                      🐟
                    </motion.div>
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold text-white/70 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>

          {/* Camera Flash Overlay */}
          <AnimatePresence>
            {flashTrigger && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 z-50 bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Catnip Star Particles */}
          <AnimatePresence>
            {catnipActive && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.div
                    key={`catnip-${i}`}
                    initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 0 }}
                    animate={{
                      y: ['0%', '100%'],
                      opacity: [0, 1, 0],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 2.5 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 1.5
                    }}
                    className="absolute text-sm"
                  >
                    {['🌿', '✨', '⭐', '🐾', '💚'][i % 5]}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Lullaby Musical Notes Cloud */}
          <AnimatePresence>
            {lullabyActive && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={`note-${i}`}
                    initial={{ y: 80, opacity: 0, scale: 0.5 }}
                    animate={{
                      y: -120,
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.4, 0.8],
                      x: Math.sin(i) * 60
                    }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      delay: i * 0.4
                    }}
                    className="absolute text-[#ffd166] text-xl font-bold font-mono"
                  >
                    {['♪', '♫', '💤', '✨', '♬'][i % 5]}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Grooming Spa Brush Floating */}
          <AnimatePresence>
            {isBrushing && brushPos && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x: [0, 40, -40, 20, 0],
                  y: [0, -20, 10, -10, 0]
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 3.5, ease: 'easeInOut' }}
                className="absolute z-40 pointer-events-none text-3xl filter drop-shadow-lg"
                style={{ top: '48%', left: '48%' }}
              >
                🪮✨
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouncing Yarn Ball if thrown */}
          <AnimatePresence>
            {ballPosition && (
              <motion.div
                initial={{ scale: 0, y: -40, x: ballPosition.x + '%' }}
                animate={{
                  scale: 1,
                  y: [0, -25, 0, -12, 0],
                  x: [
                    `${ballPosition.x}%`,
                    `${ballPosition.x + 4}%`,
                    `${ballPosition.x - 3}%`,
                    `${ballPosition.x}%`
                  ]
                }}
                exit={{ scale: 0 }}
                transition={{ duration: 2.2, ease: 'easeOut' }}
                className="absolute z-30 pointer-events-none text-2xl"
                style={{ top: `${ballPosition.y}%`, left: `${ballPosition.x}%` }}
              >
                🧶
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Feather Teaser Wand */}
          <AnimatePresence>
            {featherPosition && (
              <motion.div
                initial={{ scale: 0, y: -60 }}
                animate={{
                  scale: 1,
                  y: [0, 15, -10, 10, 0],
                  rotate: [-15, 20, -10, 15, 0]
                }}
                exit={{ scale: 0, y: -60 }}
                transition={{ duration: 2.8, ease: 'easeInOut' }}
                className="absolute z-30 pointer-events-none text-3xl filter drop-shadow-md"
                style={{ top: `${featherPosition.y}%`, left: `${featherPosition.x}%` }}
              >
                🪶✨
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Hearts on Pet */}
          {floatingHearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -40, scale: 1.4 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute z-40 pointer-events-none text-[#ff85a1] font-bold text-sm sm:text-base drop-shadow-md"
              style={{ left: h.x, top: h.y }}
            >
              {h.text || '❤️ +1 Mimo'}
            </motion.div>
          ))}

          {/* ======================= INTERACTIVE CAT AVATARS ======================= */}
          {cats.map((cat) => {
            const isSpeaking = activeSpeechCat === cat.id;
            const isDragging = draggingCatId === cat.id;

            return (
              <div
                key={cat.id}
                style={{
                  position: 'absolute',
                  left: `${cat.x}%`,
                  top: `${cat.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(cat.y),
                  transition: isDragging
                    ? 'none'
                    : 'left 1.2s ease-in-out, top 1.2s ease-in-out',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handleCatPointerDown(cat, e)}
                onPointerMove={(e) => handleCatPointerMove(cat, e)}
                onPointerUp={(e) => handleCatPointerUp(e)}
                onPointerCancel={(e) => handleCatPointerUp(e)}
                onClick={(e) => {
                  // ponytail: if the gesture was a drag, swallow the synthetic
                  // click — only short taps should trigger the pet reaction.
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  handlePetCat(cat.id, e);
                }}
                className="group select-none"
              >
                {/* Speech Bubble with Thought and Personality */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: -14, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 w-48 sm:w-56 p-2.5 rounded-2xl bg-[#140a17]/95 border-2 shadow-2xl backdrop-blur-md pointer-events-none"
                      style={{ borderColor: cat.themeColor }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: `${cat.themeColor}33`,
                            color: cat.labelTextColor ?? cat.themeColor
                          }}
                        >
                          {cat.name} • {cat.breed}
                        </span>
                        <Heart className="w-3 h-3 text-[#ff758f] fill-current" />
                      </div>
                      <p className="text-[11px] text-[#fff4d1] font-medium leading-tight text-center">
                        {cat.thought}
                      </p>
                      <div
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#140a17] border-b-2 border-r-2 rotate-45"
                        style={{ borderColor: cat.themeColor }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cat Status Indicator on Hover */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow backdrop-blur-md flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    style={{
                      backgroundColor: `${cat.themeColor}cc`,
                      borderColor: cat.themeColor,
                      color: '#ffffff'
                    }}
                  >
                    <span>{cat.name}</span>
                    <span>•</span>
                    <span className="text-[#ffd166]">{cat.specialTrait}</span>
                  </span>
                </div>

                {/* Petdex Cat Avatar */}
                <div className="relative transition-transform duration-200 group-hover:scale-110">
                  <PetdexCatAvatar
                    catType={cat.id}
                    state={cat.state}
                    direction={cat.direction}
                  />

                  {/* Sleeping Zzz animation */}
                  {cat.state === 'sleeping' && (
                    <motion.span
                      animate={{ y: [-2, -16], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                      className="absolute -top-3 right-0 text-xs font-mono font-bold text-[#ffd166]"
                    >
                      Zzz...
                    </motion.span>
                  )}

                  {/* Eating sparkles */}
                  {cat.state === 'eating' && (
                    <motion.span
                      animate={{ scale: [0.8, 1.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="absolute -top-2 left-0 text-xs"
                    >
                      ✨
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Stats overlay (inside the box) */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md rounded-full px-3 py-1 border border-white/10">
              <Heart className="w-3.5 h-3.5 text-[#ff758f] animate-pulse" />
              <div className="text-[11px]">
                <span className="text-[#fcd5df] font-light">Mimos: </span>
                <strong className="text-white font-mono font-bold">{totalPets}</strong>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md rounded-full px-3 py-1 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
              <div className="text-[11px]">
                <span className="text-[#fcd5df] font-light">Felicidad: </span>
                <strong className="text-[#ffd166] font-mono font-bold">100%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TAMAGOTCHI INTERACTIVE CONTROL BAR (RICH ACTIONS & SURPRISES)
           ========================================================================= */}
        <div className="mt-6 p-4 sm:p-5 rounded-3xl bg-[#1b0c19]/90 border border-white/10 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-center gap-2">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Feed */}
            <button
              type="button"
              onClick={handleFeed}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Atún para ellos"
            >
              <Fish className="w-4 h-4" />
              <span>Dar Comidita</span>
            </button>

            {/* 2. Yarn ball */}
            <button
              type="button"
              onClick={handleThrowBall}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Tirar pelotita fabricada artesanalmente"
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Ovillo</span>
            </button>

            {/* 3. Feather Teaser */}
            <button
              type="button"
              onClick={handleFeatherTeaser}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Cazar la varita de plumas"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Varita Plumas</span>
            </button>

            {/* 4. Lullaby Music Box */}
            <button
              type="button"
              onClick={handleLullaby}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Reproducir mantras gatunos"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Caja Musical</span>
            </button>

            {/* 5. Catnip Magic */}
            <button
              type="button"
              onClick={handleCatnip}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Catnip"
            >
              <Sparkle className="w-3.5 h-3.5" />
              <span>Catnip</span>
            </button>

            {/* 6. Grooming Brush */}
            <button
              type="button"
              onClick={handleBrushSpa}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Cepillado suave y spa de mimos"
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Cepillar</span>
            </button>

            {/* 7. Polaroid Snapshot */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Sacar foto instantánea a los 4 michis"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Fotooo</span>
            </button>
          </div>

          {/* Stats moved inside the box (see top overlay). */}
        </div>

        {/* =========================================================================
            POLAROID SNAPSHOT MODAL POPUP
           ========================================================================= */}
        <AnimatePresence>
          {polaroidOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPolaroidOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, rotate: -4, y: 30 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                exit={{ scale: 0.8, rotate: 4, y: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm p-4 pb-6 bg-[#fdfbf7] rounded-xl shadow-2xl border-4 border-[#eae5d9] flex flex-col items-center select-none"
              >
                {/* Polaroid Photo Canvas */}
                <div className="w-full h-64 rounded-lg bg-gradient-to-b from-[#2e192c] via-[#221022] to-[#170918] border-2 border-stone-800 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute top-2 left-3 text-[10px] text-[#ffd166]/80 font-mono">
                    ✦ Instantánea Felina ✦
                  </div>
                  {/* 4 Michis posing together */}
                  <div className="flex items-center justify-center gap-1 sm:gap-2 scale-90">
                    <PetdexCatAvatar catType="orange" state="idle" direction={1} />
                    <PetdexCatAvatar catType="black" state="idle" direction={1} />
                    <PetdexCatAvatar catType="grey" state="sleeping" direction={1} />
                    <PetdexCatAvatar catType="white" state="idle" direction={-1} />
                  </div>
                  <div className="absolute bottom-2 text-center text-[10px] text-[#ffccd5]">
                    Canela • Trufa • Nube • Copo
                  </div>
                </div>

                {/* Handwritten Note Below */}
                <div className="w-full text-center mt-4">
                  <h4 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                    Nuestra Familia de 4 Patitas
                  </h4>
                  <p className="text-xs text-stone-600 font-serif italic mt-1">
                    "Con Alex y Sam para siempre ❤️"
                  </p>
                  <p className="text-[10px] font-mono text-stone-400 mt-2">
                    Cumpleaños 25 • 9 de Septiembre
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPolaroidOpen(false)}
                  className="mt-4 px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Guardar en el corazón ✨
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

