import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Music, Server, Settings, Volume2, X } from 'lucide-react';
import { MenuAtmosphere } from './MenuAtmosphere';

interface StartMenuProps {
  isOpen: boolean;
  netStatus: 'connected' | 'disconnected' | 'reconnecting';
  netPeersCount: number;
  onMultiplayer: () => void;
  multiplayerPhase: 'idle' | 'waking' | 'terrain' | 'ready';
  waitSeconds: number;
  onCancelMultiplayer: () => void;
}

let menuAudioContext: AudioContext | null = null;

function playStoneClick(volume: number) {
  if (volume <= 0) return;
  const AudioCtor = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  menuAudioContext ??= new AudioCtor();
  void menuAudioContext.resume();

  const now = menuAudioContext.currentTime;
  const oscillator = menuAudioContext.createOscillator();
  const gain = menuAudioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(150, now);
  oscillator.frequency.exponentialRampToValueAtTime(38, now + 0.11);
  gain.gain.setValueAtTime((volume / 100) * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  oscillator.connect(gain);
  gain.connect(menuAudioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

export function StartMenu({
  isOpen,
  netStatus,
  netPeersCount,
  onMultiplayer,
  multiplayerPhase,
  waitSeconds,
  onCancelMultiplayer
}: StartMenuProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('xyrtania_menu_volume') ?? 70));
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const menuLayerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen) {
      musicRef.current?.pause();
      return;
    }
    const music = new Audio('/assets/audio/xyrtaniastartmenu.ogg');
    music.loop = true;
    music.volume = Math.min(1, Math.max(0, volume / 100));
    musicRef.current = music;
    const resume = () => void music.play().catch(() => undefined);
    resume();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
      music.pause();
      musicRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('xyrtania_menu_volume', String(volume));
    if (musicRef.current) musicRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (!isOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = menuLayerRef.current;
    if (!layer) return;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const applyParallax = () => {
      frame = 0;
      layer.style.setProperty('--menu-depth-x', `${pointerX * 7}px`);
      layer.style.setProperty('--menu-depth-y', `${pointerY * 5}px`);
      layer.style.setProperty('--menu-fire-depth-x', `${pointerX * -10}px`);
      layer.style.setProperty('--menu-fire-depth-y', `${pointerY * -7}px`);
      layer.style.setProperty('--menu-ice-depth-x', `${pointerX * -8}px`);
      layer.style.setProperty('--menu-ice-depth-y', `${pointerY * -6}px`);
    };
    const handlePointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(applyParallax);
    };
    const resetParallax = () => {
      pointerX = 0;
      pointerY = 0;
      if (!frame) frame = requestAnimationFrame(applyParallax);
    };

    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('pointerleave', resetParallax);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('pointerleave', resetParallax);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuLayerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100000] overflow-hidden bg-[#05060b] text-white"
        >
          <img
            src="/xyrtania_fire_and_ice_menu.jpg"
            alt=""
            className="menu-background-breathe absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(3,5,12,.45)_65%,rgba(0,0,0,.9)_100%)]" />
          <div className="menu-fire-glow pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_82%_72%,rgba(255,73,0,.22),rgba(255,95,0,.06)_28%,transparent_55%)] mix-blend-screen" />
          <div className="menu-ice-glow pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_18%_38%,rgba(105,220,255,.17),rgba(70,155,255,.04)_30%,transparent_58%)] mix-blend-screen" />

          <MenuAtmosphere active={isOpen} />

          <div className="relative z-10 flex h-full items-center justify-center px-5">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8 }}
              className="flex w-full max-w-md flex-col items-center gap-5"
            >
              <div className="mt-32 flex w-full flex-col gap-3 sm:mt-40">
                <button
                  onClick={() => {
                    playStoneClick(volume);
                    onMultiplayer();
                  }}
                  className="group relative h-14 w-full overflow-hidden [clip-path:polygon(7%_0,93%_0,100%_50%,93%_100%,7%_100%,0_50%)] border border-amber-500/70 bg-black/75 font-serif text-lg tracking-[0.18em] text-amber-100 transition-[border-color,background-color,color] duration-150 hover:border-orange-300 hover:bg-black/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  <span className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  MULTIPLAYER
                  <span className="block font-mono text-[8px] tracking-[0.3em] text-cyan-100/60">CLOUDFLARE PERSISTENT WORLD</span>
                </button>

                <button
                  onClick={() => {
                    playStoneClick(volume);
                    setOptionsOpen(true);
                  }}
                  className="h-11 w-full [clip-path:polygon(6%_0,94%_0,100%_50%,94%_100%,6%_100%,0_50%)] border border-slate-500/50 bg-black/65 font-serif tracking-[0.16em] text-slate-200 transition-colors hover:border-amber-400/70 hover:text-amber-100"
                >
                  OPTIONS
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-4 py-2 font-mono text-[10px] text-white/55 backdrop-blur">
                <Server size={12} className={netStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'} />
                {netStatus === 'connected' ? `Render connected · ${netPeersCount + 1} online` : 'Render connection starts with Multiplayer'}
              </div>
            </motion.section>
          </div>

          <AnimatePresence>
            {multiplayerPhase !== 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-[#03050a]/80 p-6 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.96, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  className="w-full max-w-md border border-amber-400/35 bg-black/85 px-8 py-9 text-center shadow-[0_0_70px_rgba(255,110,20,.18)]"
                >
                  <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-2 border-white/10 border-t-amber-300 border-r-cyan-300" />
                  <h2 className="font-serif text-xl tracking-[0.2em] text-amber-100">
                    {multiplayerPhase === 'ready' ? 'THE REALM IS READY' : 'ENTERING XYRTANIA'}
                  </h2>
                  <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-cyan-100/65">
                    {multiplayerPhase === 'waking' && 'WAKING THE RENDER WORLD SERVER'}
                    {multiplayerPhase === 'terrain' && 'LOADING PERSISTENT TERRAIN FROM CLOUDFLARE'}
                    {multiplayerPhase === 'ready' && 'TERRAIN SYNCHRONIZED'}
                  </p>
                  {multiplayerPhase !== 'ready' && (
                    <>
                      <p className="mt-5 text-sm text-white/55">
                        Free servers may need about a minute after resting. This screen will continue automatically.
                      </p>
                      <div className="mt-5 font-mono text-2xl tabular-nums text-white/85">
                        {String(Math.floor(waitSeconds / 60)).padStart(2, '0')}:{String(waitSeconds % 60).padStart(2, '0')}
                      </div>
                      <button
                        onClick={onCancelMultiplayer}
                        className="mt-6 border border-white/20 px-5 py-2 font-mono text-[10px] tracking-[0.2em] text-white/55 hover:border-white/50 hover:text-white"
                      >
                        CANCEL
                      </button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
            {optionsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-6 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.96, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.96, y: 12 }}
                  className="w-full max-w-sm rounded border border-amber-500/30 bg-[#0a0c12]/95 p-6 shadow-2xl"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-serif tracking-[0.2em] text-amber-200"><Settings size={16} /> OPTIONS</h2>
                    <button onClick={() => setOptionsOpen(false)} aria-label="Close options" className="text-white/50 hover:text-white"><X size={18} /></button>
                  </div>
                  <label className="flex items-center justify-between font-mono text-xs text-white/65">
                    <span className="flex items-center gap-2"><Volume2 size={14} /> Menu volume</span>
                    <span>{volume}%</span>
                  </label>
                  <input
                    className="mt-3 w-full accent-amber-500"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                  <p className="mt-5 flex items-center gap-2 text-[10px] text-white/40"><Music size={12} /> Music begins after the first browser interaction.</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <style>{`
            .menu-background-breathe {
              transform: scale(1.018);
              transform-origin: center center;
              animation: menuBackgroundBreath 18s ease-in-out infinite;
              will-change: transform;
            }
            .menu-fire-glow {
              animation: menuFireGlow 7.5s ease-in-out infinite;
              transform: scale(1.035) translate3d(
                var(--menu-fire-depth-x, 0px),
                var(--menu-fire-depth-y, 0px),
                0
              );
              transition: transform 180ms ease-out;
              will-change: opacity, transform;
            }
            .menu-ice-glow {
              animation: menuIceGlow 10s ease-in-out infinite;
              transform: scale(1.035) translate3d(
                var(--menu-ice-depth-x, 0px),
                var(--menu-ice-depth-y, 0px),
                0
              );
              transition: transform 180ms ease-out;
              will-change: opacity, transform;
            }
            @keyframes menuBackgroundBreath {
              0%, 100% {
                transform: scale(1.018) translate3d(
                  var(--menu-depth-x, 0px),
                  var(--menu-depth-y, 0px),
                  0
                );
              }
              50% {
                transform: scale(1.045) translate3d(
                  calc(var(--menu-depth-x, 0px) - .35%),
                  calc(var(--menu-depth-y, 0px) - .25%),
                  0
                );
              }
            }
            @keyframes menuFireGlow {
              0%, 100% { opacity: .42; }
              50% { opacity: .88; }
            }
            @keyframes menuIceGlow {
              0%, 100% { opacity: .36; }
              50% { opacity: .7; }
            }
            @media (prefers-reduced-motion: reduce) {
              .menu-background-breathe,
              .menu-fire-glow,
              .menu-ice-glow {
                animation: none;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
