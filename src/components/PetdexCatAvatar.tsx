// PetdexCatAvatar — thin React shell over computeAvatarStyle.
// ponytail: zero deps. All nontrivial logic lives in src/pets/frames.ts and
// is unit-tested there. The shell only owns the frame ticker (setInterval
// reset on state change) and the JSX.

import React, { useEffect, useState } from 'react';
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

  // ponytail: reset to frame 0 whenever the state changes so animations don't
  // freeze mid-cycle or play frames out of the wrong row.
  useEffect(() => {
    setFrame(0);
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % framesInRow);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [resolved, framesInRow]);

  const style = computeAvatarStyle({ catType, state, direction, frame });

  return (
    <div
      role="img"
      aria-label={`${catType} cat sprite`}
      className="select-none pointer-events-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
      style={style}
    />
  );
};
