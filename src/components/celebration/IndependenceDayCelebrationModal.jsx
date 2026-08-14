import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Tricolor themed confetti colors
const TRICOLOR_CONFETTI = [
  '#FF671F', '#FF9933', '#FFA500', // Saffron hues
  '#FFFFFF', '#F8FAFC', '#E2E8F0', // White/Silver hues
  '#046A38', '#138808', '#22C55E', // Green hues
  '#000080', '#1E40AF', '#3B82F6', // Navy Blue hues
  '#F59E0B', '#EAB308'             // Gold accents
];

// Ashoka Chakra Component with 24 Spokes
const AshokaChakra = ({ size = 52, className = '' }) => {
  const spokes = Array.from({ length: 24 });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`animate-spin-slow ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(0, 0, 128, 0.25))' }}
    >
      {/* Outer Ring */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#000080" strokeWidth="4" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#000080" strokeWidth="1.5" strokeDasharray="3,3" />
      {/* Inner Hub */}
      <circle cx="50" cy="50" r="10" fill="#000080" />
      <circle cx="50" cy="50" r="5" fill="#ffffff" />
      {/* 24 Spokes */}
      {spokes.map((_, i) => {
        const angle = (i * 360) / 24;
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2="50"
            y2="8"
            stroke="#000080"
            strokeWidth="2.2"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
    </svg>
  );
};

const IndependenceDayCelebrationModal = ({ onClose }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showContent, setShowContent] = useState(false);

  const handleMouseMove = (e) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    const rotateX = -(y / (card.height / 2)) * 8;
    const rotateY = (x / (card.width / 2)) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Confetti particles for ambient festive fall
  const confettiList = useMemo(() => {
    return Array.from({ length: 65 }).map((_, i) => {
      const size = Math.random() * 8 + 5;
      const color = TRICOLOR_CONFETTI[Math.floor(Math.random() * TRICOLOR_CONFETTI.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 4;
      const duration = Math.random() * 3 + 3.5;
      const rotation = Math.random() * 360;
      const type = Math.random();
      const isCircle = type > 0.6;
      const isTriangle = type > 0.3 && type <= 0.6;
      return { id: i, size, color, left, delay, duration, rotation, isCircle, isTriangle };
    });
  }, []);

  // Radial burst particles
  const burstParticles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 240 + 80;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity - 60;
      const size = Math.random() * 8 + 4;
      const color = TRICOLOR_CONFETTI[Math.floor(Math.random() * TRICOLOR_CONFETTI.length)];
      const delay = Math.random() * 0.12;
      const rotation = Math.random() * 360;
      const isCircle = Math.random() > 0.5;
      return { id: i, dx, dy, size, color, delay, rotation, isCircle };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999999] flex items-center justify-center overflow-hidden"
        onClick={onClose}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confettiFall {
            0% { transform: translateY(-15px) rotate(0deg) scale(1); opacity: 1; }
            50% { opacity: 0.95; }
            100% { transform: translateY(105vh) rotate(900deg) scale(0.6); opacity: 0; }
          }
          @keyframes tricolorGlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes burstEffect {
            0% { transform: translate(0, 0) scale(0.3) rotate(0deg); opacity: 1; }
            25% { transform: translate(var(--dx), var(--dy)) scale(1.4) rotate(180deg); opacity: 1; }
            100% { transform: translate(var(--dx), calc(var(--dy) + 50vh)) scale(0.2) rotate(540deg); opacity: 0; }
          }
          .animate-confetti {
            animation-name: confettiFall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          .animate-tricolor-glow {
            background-size: 300% 300%;
            animation: tricolorGlow 4s ease infinite;
          }
          .animate-spin-slow {
            animation: spinSlow 20s linear infinite;
          }
          .animate-burst {
            animation-name: burstEffect;
            animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1);
            animation-fill-mode: forwards;
          }
        `}} />

        {/* Bold Indian Flag-Inspired Gradient Background */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `
              linear-gradient(180deg, 
                rgba(255, 103, 31, 0.65) 0%, 
                rgba(255, 140, 0, 0.45) 22%, 
                rgba(255, 255, 255, 0.60) 48%, 
                rgba(255, 255, 255, 0.60) 52%, 
                rgba(19, 136, 8, 0.45) 78%, 
                rgba(4, 106, 56, 0.68) 100%
              ),
              linear-gradient(90deg, 
                rgba(255, 103, 31, 0.35) 0%, 
                rgba(255, 255, 255, 0.25) 50%, 
                rgba(4, 106, 56, 0.35) 100%
              )
            `
          }}
        />

        {/* Ambient Blur Lights - Enhanced bold tricolor glows with preserved 60px blur */}
        <div
          className="absolute pointer-events-none z-0 rounded-full"
          style={{
            top: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '650px',
            height: '380px',
            background: 'radial-gradient(ellipse at center, rgba(255, 103, 31, 0.65) 0%, rgba(255, 140, 0, 0.35) 45%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full"
          style={{
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            height: '250px',
            background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.7) 0%, rgba(240, 244, 255, 0.3) 50%, transparent 80%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full"
          style={{
            bottom: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '650px',
            height: '380px',
            background: 'radial-gradient(ellipse at center, rgba(4, 106, 56, 0.65) 0%, rgba(19, 136, 8, 0.35) 45%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Confetti Rain */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {confettiList.map((item) => (
            <div
              key={item.id}
              className="absolute animate-confetti"
              style={{
                left: `${item.left}%`,
                width: `${item.size}px`,
                height: `${item.size}px`,
                backgroundColor: item.color,
                borderRadius: item.isCircle ? '50%' : '2px',
                clipPath: item.isTriangle ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                animationDelay: `${item.delay}s`,
                animationDuration: `${item.duration}s`,
                top: '-20px',
                transform: `rotate(${item.rotation}deg)`,
                opacity: 0.9,
                boxShadow: item.isCircle ? `0 0 5px ${item.color}50` : 'none',
              }}
            />
          ))}
        </div>

        {/* Burst Particles */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          {burstParticles.map((p) => (
            <div
              key={p.id}
              className="absolute animate-burst"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: p.isCircle ? '50%' : '2px',
                animationDelay: `${p.delay}s`,
                animationDuration: '3.5s',
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                transform: `rotate(${p.rotation}deg)`,
                boxShadow: `0 0 8px ${p.color}60`,
              }}
            />
          ))}
        </div>

        {/* Backdrop overlay - Preserving exact blur effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 cursor-pointer"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(5px)' }}
        />

        {/* 3D Modal Card Container - stopPropagation to prevent backdrop close on card click */}
        <div
          className="relative w-full max-w-[420px] mx-4 z-30"
          style={{ perspective: '1000px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Radiant tricolor aura glow */}
          <div
            className="absolute -inset-3 rounded-[32px] animate-tricolor-glow pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 103, 31, 0.55), rgba(255, 255, 255, 0.75), rgba(4, 106, 56, 0.55), rgba(0, 0, 128, 0.35), rgba(255, 103, 31, 0.55))',
              filter: 'blur(25px)',
              opacity: 0.6,
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.84, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            transition={{ type: 'spring', damping: 20, stiffness: 160, delay: 0.05 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
            className="relative w-full rounded-[26px] overflow-hidden cursor-default shadow-2xl"
          >
            {/* Animated Indian Tricolor Border Frame */}
            <div
              className="absolute inset-0 rounded-[26px] animate-tricolor-glow"
              style={{
                background: 'linear-gradient(135deg, #FF671F 0%, #FFA500 25%, #FFFFFF 50%, #138808 75%, #046A38 100%)',
                padding: '3.5px',
              }}
            />

            {/* Inner Frosted Glass Card */}
            <div
              className="relative m-[3.5px] rounded-[23px] px-4 py-8 sm:px-8 sm:py-10 flex flex-col items-center text-center overflow-hidden bg-white/95 backdrop-blur-xl w-full"
              style={{
                transformStyle: 'preserve-3d',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
              }}
            >
              {/* Top Tricolor Ribbon Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{
                  background: 'linear-gradient(90deg, #FF671F 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #046A38 66.66%)'
                }}
              />

              {/* Close Cross Icon Button */}
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100/90 hover:bg-slate-200 transition-all duration-150 cursor-pointer z-30 shadow-xs"
              >
                <X size={18} />
              </button>

              {/* Top Ashoka Chakra Visual */}
              {showContent && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
                  className="relative flex items-center justify-center mb-4 sm:mb-5"
                  style={{ transform: 'translateZ(40px)' }}
                >
                  <div className="relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full shadow-lg p-1.5">
                    {/* Ring Gradient */}
                    <div
                      className="absolute inset-0 rounded-full animate-tricolor-glow"
                      style={{
                        background: 'linear-gradient(135deg, #FF671F, #FFFFFF, #046A38, #FF671F)',
                        padding: '2.5px',
                      }}
                    />
                    {/* Inner Hub */}
                    <div className="relative w-full h-full rounded-full bg-gradient-to-b from-orange-50/70 via-white to-emerald-50/70 flex items-center justify-center border border-slate-100">
                      <AshokaChakra size={44} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Main Heading: Only "Happy Independence Day" */}
              {showContent && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.45 }}
                  className="my-1 sm:my-2 w-full px-1"
                  style={{ transform: 'translateZ(45px)' }}
                >
                  <h2
                    className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-snug w-full"
                    style={{
                      background: 'linear-gradient(135deg, #E65100 0%, #D97706 28%, #000080 50%, #059669 72%, #046A38 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Happy Independence Day
                  </h2>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default IndependenceDayCelebrationModal;
