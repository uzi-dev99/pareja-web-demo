import React, { useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export const AtmosphericBackground: React.FC = () => {
  const { scrollYProgress } = useScroll();

  // Parallax shifts for atmospheric layers
  const yLayer1 = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const yLayer2 = useTransform(scrollYProgress, [0, 1], [0, -280]);
  const yLayer3 = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const rotateOrb = useTransform(scrollYProgress, [0, 1], [0, 45]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.7, 1, 1, 0.8]);

  // Generate deterministic stars/particles
  const stars = useMemo(() => {
    return Array.from({ length: 38 }).map((_, i) => ({
      id: i,
      left: `${(i * 17 + 7) % 96 + 2}%`,
      top: `${(i * 23 + 13) % 94 + 2}%`,
      size: (i % 3) + 1.5,
      delay: (i % 5) * 0.7,
      duration: 3 + (i % 4),
      opacity: 0.25 + ((i % 5) * 0.15)
    }));
  }, []);

  // Floating gentle glowing orbs
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep baseline background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d050c] via-[#140813] to-[#0c040b]" />

      {/* Dynamic drifting cosmic radial orbs */}
      <motion.div
        style={{ y: yLayer1, rotate: rotateOrb }}
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#ff85a1]/10 blur-[140px]"
      />
      <motion.div
        style={{ y: yLayer2 }}
        className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full bg-[#e05688]/10 blur-[160px]"
      />
      <motion.div
        style={{ y: yLayer3 }}
        className="absolute top-2/3 -left-32 w-[650px] h-[650px] rounded-full bg-[#7209b7]/10 blur-[150px]"
      />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#ff758f]/08 blur-[130px]" />

      {/* Constellation SVG Lines Layer */}
      <motion.svg
        style={{ y: yLayer3, opacity: opacityFade }}
        className="absolute inset-0 w-full h-full stroke-[#ff85a1]/15 stroke-[1px] fill-none"
      >
        <line x1="12%" y1="18%" x2="24%" y2="28%" strokeDasharray="3 4" />
        <line x1="24%" y1="28%" x2="35%" y2="22%" strokeDasharray="3 4" />
        <line x1="72%" y1="15%" x2="85%" y2="26%" strokeDasharray="3 4" />
        <line x1="85%" y1="26%" x2="79%" y2="42%" strokeDasharray="3 4" />
        <line x1="18%" y1="65%" x2="30%" y2="74%" strokeDasharray="3 4" />
        <line x1="30%" y1="74%" x2="42%" y2="68%" strokeDasharray="3 4" />
        <line x1="68%" y1="78%" x2="82%" y2="86%" strokeDasharray="3 4" />
      </motion.svg>

      {/* Floating Stardust Particles */}
      <motion.div style={{ y: yLayer2 }} className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
              opacity: star.opacity
            }}
            className="absolute rounded-full bg-gradient-to-r from-white to-[#ffccd5] shadow-[0_0_6px_rgba(255,182,193,0.8)] animate-pulse"
          />
        ))}
      </motion.div>

      {/* Gentle floating dust texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-[#ff85a1]/[0.02] to-transparent opacity-60" />
    </div>
  );
};
