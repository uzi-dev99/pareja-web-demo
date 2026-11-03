// PetdexCatAvatar — thin React shell over computeAvatarStyle.
// ponytail: zero deps. All nontrivial logic lives in src/pets/frames.ts and
// is unit-tested there. The shell only owns the frame ticker (setInterval
// reset on state change) and the JSX.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeAvatarStyle,
  resolvePetdexState,
  STATE_ROW,
  FRAMES_PER_ROW,
  type PetdexCatColor,
} from '../pets/frames';

const FRAME_MS = 130; // ~7.7 fps — matches the spec

interface Props {
  catType: PetdexCatColor;
  state: string;
  direction: 1 | -1;
}

export const PetdexCatAvatar: React.FC<Props> = ({ catType, state, direction }) => {
  const resolved = resolvePetdexState(state);
  const framesInRow = FRAMES_PER_ROW[STATE_ROW[resolved]];
  const [frame, setFrame] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  // ponytail: las hojas de sprites son 2 MB en total y la sala de
  // mascotas está lejos: se enganchan sólo cuando el gato está por
  // entrar en pantalla (el resto del sitio carga primero). El ticker
  // de frames sigue igual; lo que espera es la imagen.
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ponytail: reset to frame 0 whenever the state changes so animations don't
  // freeze mid-cycle or play frames out of the wrong row.
  useEffect(() => {
    setFrame(0);
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % framesInRow);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [resolved, framesInRow]);

  const style = useMemo(() => {
    const sheet = computeAvatarStyle({ catType, state, direction, frame });
    // sin hoja no hay petición: el div conserva su tamaño (no salta el
    // layout) pero el navegador no descarga los 500 KB del sprite.
    return near ? sheet : { ...sheet, backgroundImage: 'none' };
  }, [catType, state, direction, frame, near]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={`${catType} cat sprite`}
      className="select-none pointer-events-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
      style={style}
    />
  );
};
