import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Sparkles, X, PartyPopper, Heart } from 'lucide-react';

// Warm pastel balloon gradients for light theme
const BALLOON_COLORS = [
  { id: 'coral', color1: '#ff6b6b', color2: '#ffa8a8' },
  { id: 'sky', color1: '#74b9ff', color2: '#a9d4ff' },
  { id: 'lavender', color1: '#a29bfe', color2: '#d4d0fb' },
  { id: 'peach', color1: '#fdcb6e', color2: '#ffeaa7' },
  { id: 'mint', color1: '#55efc4', color2: '#b8f5e0' },
  { id: 'rose', color1: '#fd79a8', color2: '#fab1c9' },
  { id: 'lilac', color1: '#e17bfb', color2: '#edb6ff' },
  { id: 'ocean', color1: '#0984e3', color2: '#74b9ff' },
];

// Bright, vivid confetti colors
const CONFETTI_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#01a3a4', '#ff6348', '#ffa502', '#2ed573',
  '#ff4757', '#70a1ff', '#7bed9f', '#eccc68', '#ff6b81',
];

const BirthdayCelebrationModal = ({ employeeName, onClose }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showContent, setShowContent] = useState(false);

  const handleMouseMove = (e) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    const rotateX = -(y / (card.height / 2)) * 12;
    const rotateY = (x / (card.width / 2)) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Delayed content reveal for staggered entrance
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 80 confetti pieces for maximum festivity
  const confettiList = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const size = Math.random() * 10 + 5;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = Math.random() * 3 + 4;
      const rotation = Math.random() * 360;
      const type = Math.random();
      const isCircle = type > 0.6;
      const isTriangle = type > 0.3 && type <= 0.6;
      const isStar = type <= 0.3;
      return { id: i, size, color, left, delay, duration, rotation, isCircle, isTriangle, isStar };
    });
  }, []);

  // 50 burst particles
  const burstParticles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 250 + 100;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity - 80;
      const size = Math.random() * 10 + 5;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const delay = Math.random() * 0.2;
      const rotation = Math.random() * 360;
      const isCircle = Math.random() > 0.5;
      return { id: i, dx, dy, size, color, delay, rotation, isCircle };
    });
  }, []);

  // 10 balloons
  const balloonList = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => {
      const colorScheme = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const left = Math.random() * 85 + 7;
      const size = Math.random() * 18 + 38;
      const delay = Math.random() * 5;
      const duration = Math.random() * 5 + 8;
      const sway = Math.random() * 30 + 15;
      return { id: i, colorScheme, left, size, delay, duration, sway };
    });
  }, []);

  // Floating sparkle dots
  const sparkleDots = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 1.5,
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confettiFall {
            0% { transform: translateY(-15px) rotate(0deg) scale(1); opacity: 1; }
            50% { opacity: 0.9; }
            100% { transform: translateY(105vh) rotate(1080deg) scale(0.5); opacity: 0; }
          }
          @keyframes balloonFloat {
            0% { transform: translateY(110vh) translateX(0) rotate(0deg); opacity: 0; }
            6% { opacity: 0.75; }
            50% { transform: translateY(50vh) translateX(calc(var(--sway-x) * 0.5)) rotate(3deg); }
            90% { opacity: 0.7; }
            100% { transform: translateY(-25vh) translateX(var(--sway-x)) rotate(-3deg); opacity: 0; }
          }
          @keyframes borderGlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes burstEffect {
            0% { transform: translate(0, 0) scale(0.3) rotate(0deg); opacity: 1; }
            20% { transform: translate(var(--dx), var(--dy)) scale(1.5) rotate(270deg); opacity: 1; }
            100% { transform: translate(var(--dx), calc(var(--dy) + 55vh)) scale(0.2) rotate(720deg); opacity: 0; }
          }
          @keyframes decorFloat {
            0% { transform: translateY(0px) rotate(0deg) scale(1); }
            33% { transform: translateY(-10px) rotate(8deg) scale(1.05); }
            66% { transform: translateY(-5px) rotate(-5deg) scale(0.98); }
            100% { transform: translateY(0px) rotate(0deg) scale(1); }
          }
          @keyframes shimmer {
            0% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0.3; transform: scale(0.8); }
          }
          @keyframes gentlePulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.08); }
          }
          @keyframes cakeWiggle {
            0%, 100% { transform: translateZ(50px) rotate(0deg); }
            25% { transform: translateZ(50px) rotate(-5deg); }
            75% { transform: translateZ(50px) rotate(5deg); }
          }
          .animate-confetti {
            animation-name: confettiFall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          .animate-balloon {
            animation-name: balloonFloat;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }
          .animate-glow-border {
            background-size: 300% 300%;
            animation: borderGlow 3s ease infinite;
          }
          .animate-burst {
            animation-name: burstEffect;
            animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1);
            animation-fill-mode: forwards;
          }
          .animate-decor {
            animation: decorFloat 4s ease-in-out infinite;
          }
          .animate-shimmer {
            animation: shimmer ease-in-out infinite;
          }
          .animate-gentle-pulse {
            animation: gentlePulse ease-in-out infinite;
          }
        `}} />

        {/* Translucent tinted wash — lets the page behind show through */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'linear-gradient(135deg, rgba(253,246,240,0.35) 0%, rgba(240,244,255,0.3) 35%, rgba(254,243,240,0.3) 65%, rgba(245,240,255,0.35) 100%)' }} />

        <div
          className="absolute pointer-events-none z-0 rounded-full animate-gentle-pulse"
          style={{
            top: '10%', left: '15%', width: '350px', height: '350px',
            background: 'radial-gradient(circle, rgba(255,182,193,0.18) 0%, transparent 70%)',
            filter: 'blur(60px)', animationDuration: '6s',
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full animate-gentle-pulse"
          style={{
            bottom: '15%', right: '10%', width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)', animationDuration: '7s', animationDelay: '1.5s',
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full animate-gentle-pulse"
          style={{
            top: '40%', right: '25%', width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(253,224,71,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)', animationDuration: '5s', animationDelay: '3s',
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full animate-gentle-pulse"
          style={{
            bottom: '30%', left: '20%', width: '280px', height: '280px',
            background: 'radial-gradient(circle, rgba(196,181,253,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)', animationDuration: '8s', animationDelay: '2s',
          }}
        />

        {/* Tiny floating sparkle dots */}
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {sparkleDots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full animate-shimmer"
              style={{
                left: `${dot.left}%`,
                top: `${dot.top}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: 'rgba(255, 215, 0, 0.6)',
                animationDelay: `${dot.delay}s`,
                animationDuration: `${dot.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Confetti rain */}
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
                borderRadius: item.isCircle ? '50%' : item.isStar ? '2px' : '2px',
                clipPath: item.isTriangle
                  ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  : item.isStar
                  ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                  : undefined,
                animationDelay: `${item.delay}s`,
                animationDuration: `${item.duration}s`,
                top: '-20px',
                transform: `rotate(${item.rotation}deg)`,
                opacity: 0.85,
                boxShadow: item.isCircle ? `0 0 4px ${item.color}40` : 'none',
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
                boxShadow: `0 0 6px ${p.color}50`,
              }}
            />
          ))}
        </div>

        {/* Floating Balloons */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {balloonList.map((balloon) => (
            <div
              key={balloon.id}
              className="absolute animate-balloon"
              style={{
                left: `${balloon.left}%`,
                width: `${balloon.size}px`,
                height: `${balloon.size * 4.5}px`,
                animationDelay: `${balloon.delay}s`,
                animationDuration: `${balloon.duration}s`,
                '--sway-x': `${balloon.sway}px`,
                bottom: '-160px',
              }}
            >
              <svg viewBox="0 0 30 90" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
                <defs>
                  <radialGradient id={`bg-${balloon.id}`} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                    <stop offset="40%" stopColor={balloon.colorScheme.color1} />
                    <stop offset="100%" stopColor={balloon.colorScheme.color2} />
                  </radialGradient>
                </defs>
                <path
                  d="M15,5 C7,5 1,12 1,21 C1,31 7,39 15,39 C23,39 29,31 29,21 C29,12 23,5 15,5 Z"
                  fill={`url(#bg-${balloon.id})`}
                />
                {/* Highlight gleam */}
                <ellipse cx="11" cy="15" rx="4" ry="6" fill="rgba(255,255,255,0.35)" />
                <polygon points="15,38 12,42 18,42" fill={balloon.colorScheme.color2} />
                <path d="M15,42 Q12,58 18,74 T15,90" stroke="#c4b5a8" strokeWidth="0.8" fill="none" strokeDasharray="2,2" />
              </svg>
            </div>
          ))}
        </div>

        {/* Backdrop — translucent overlay, page content visible behind */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-20"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)', backdropFilter: 'blur(4px)' }}
        />

        {/* Card Container with 3D perspective */}
        <div className="relative w-full max-w-[420px] mx-4 z-35" style={{ perspective: '1200px' }}>

          {/* Radiant glow behind card */}
          <div
            className="absolute -inset-3 rounded-[28px] animate-glow-border pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #ff9a9e, #fecfef, #a18cd1, #fbc2eb, #a6c1ee, #ffecd2, #ff9a9e)',
              filter: 'blur(25px)',
              opacity: 0.5,
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
            className="relative w-full rounded-[24px] overflow-hidden cursor-default"
          >
            {/* Animated rainbow border — subtle warm gradient */}
            <div
              className="absolute inset-0 rounded-[24px] animate-glow-border"
              style={{
                background: 'linear-gradient(135deg, #f093fb, #f5576c, #fda085, #f6d365, #96e6a1, #89f7fe, #c471f5, #f093fb)',
                padding: '3px',
              }}
            />

            {/* Inner Card — bright warm frosted glass */}
            <div
              className="relative m-[3px] rounded-[21px] px-8 py-9 md:px-10 md:py-10 flex flex-col items-center text-center overflow-hidden"
              style={{
                transformStyle: 'preserve-3d',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(255,252,249,0.95) 40%, rgba(248,245,255,0.95) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              {/* Inner subtle gradient overlay for depth */}
              <div
                className="absolute inset-0 pointer-events-none rounded-[21px]"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(255,200,220,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(180,200,255,0.1) 0%, transparent 50%)',
                }}
              />

              {/* Floating decorations inside card */}
              <div
                className="absolute left-3 top-[28%] text-2xl select-none pointer-events-none animate-decor"
                style={{ transform: 'translateZ(60px)', animationDelay: '0.5s' }}
              >
                🎈
              </div>
              <div
                className="absolute right-3 top-[20%] text-2xl select-none pointer-events-none animate-decor"
                style={{ transform: 'translateZ(55px)', animationDelay: '1.2s' }}
              >
                🎉
              </div>
              <div
                className="absolute left-5 bottom-[22%] text-xl select-none pointer-events-none animate-decor"
                style={{ transform: 'translateZ(45px)', animationDelay: '0.2s' }}
              >
                🎁
              </div>
              <div
                className="absolute right-5 bottom-[28%] text-lg select-none pointer-events-none animate-decor"
                style={{ transform: 'translateZ(40px)', animationDelay: '1.8s' }}
              >
                ✨
              </div>
              <div
                className="absolute left-[45%] top-3 text-sm select-none pointer-events-none animate-decor"
                style={{ transform: 'translateZ(35px)', animationDelay: '2.5s' }}
              >
                🎊
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full transition-all duration-200 cursor-pointer z-10"
                style={{
                  color: '#94a3b8',
                  background: 'rgba(241,245,249,0.8)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.background = 'rgba(226,232,240,0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'rgba(241,245,249,0.8)';
                }}
              >
                <X size={16} />
              </button>

              {/* Party Popper top accent */}
              {showContent && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.2 }}
                  className="absolute -top-1 -left-1 text-3xl select-none pointer-events-none"
                  style={{ transform: 'translateZ(65px)' }}
                >
                  🎊
                </motion.div>
              )}

              {/* Cake Icon Badge */}
              {showContent && (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
                  whileHover={{ rotate: 360, scale: 1.15 }}
                  style={{ transform: 'translateZ(50px)' }}
                  className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full mb-5 cursor-pointer"
                >
                  {/* Gradient ring behind the icon */}
                  <div
                    className="absolute inset-0 rounded-full animate-glow-border"
                    style={{
                      background: 'linear-gradient(135deg, #ff9a9e, #fad0c4, #fbc2eb, #a6c1ee, #ff9a9e)',
                      padding: '2px',
                    }}
                  />
                  <div
                    className="absolute inset-[2px] rounded-full"
                    style={{
                      background: 'linear-gradient(145deg, #fff5f5, #fff0f6)',
                      boxShadow: 'inset 0 1px 3px rgba(255,150,170,0.15)',
                    }}
                  />
                  <Cake
                    size={30}
                    className="relative z-10 stroke-[1.75]"
                    style={{ color: '#e11d48' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles size={16} style={{ color: '#f59e0b' }} />
                  </motion.div>
                </motion.div>
              )}

              {/* Heading */}
              {showContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="relative mb-2"
                  style={{ transform: 'translateZ(40px)' }}
                >
                  <h2
                    className="text-[28px] font-black tracking-tight leading-tight px-2"
                    style={{
                      background: 'linear-gradient(135deg, #e11d48 0%, #be185d 25%, #7c3aed 50%, #2563eb 75%, #0891b2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Happy Birthday!
                  </h2>
                  <p
                    className="text-[22px] font-extrabold mt-0.5"
                    style={{ color: '#1e293b' }}
                  >
                    {employeeName} 🎂
                  </p>
                </motion.div>
              )}

              {/* Decorative divider */}
              {showContent && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                  className="w-16 h-[2px] rounded-full my-3"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #f472b6, #a78bfa, #60a5fa, transparent)',
                  }}
                />
              )}

              {/* Message */}
              {showContent && (
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="text-[13.5px] leading-relaxed max-w-[300px] mb-7 px-1 font-medium"
                  style={{ color: '#64748b', transform: 'translateZ(30px)' }}
                >
                  Wishing you a wonderful year ahead filled with happiness, success, and good health. Thank you for being an amazing part of our team!
                </motion.p>
              )}

              {/* CTA Button */}
              {showContent && (
                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  whileHover={{ scale: 1.04, boxShadow: '0 8px 25px -5px rgba(225,29,72,0.25)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="w-full sm:w-auto px-10 py-3 text-white font-bold text-sm rounded-xl cursor-pointer transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #e11d48 0%, #be185d 40%, #9333ea 100%)',
                    transform: 'translateZ(55px)',
                    boxShadow: '0 4px 15px -3px rgba(225,29,72,0.2)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Heart size={15} className="fill-current" />
                    Thank You!
                    <PartyPopper size={15} />
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default BirthdayCelebrationModal;
