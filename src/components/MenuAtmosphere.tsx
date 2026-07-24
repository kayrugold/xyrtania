import { useEffect, useRef } from 'react';

type ParticleKind = 'snow' | 'ice' | 'ember' | 'ash' | 'mist';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  phase: number;
  rotation: number;
  spin: number;
  alpha: number;
  depth: number;
  bright: boolean;
}

type Sprites = Record<ParticleKind, HTMLCanvasElement>;

const random = (min: number, max: number) => min + Math.random() * (max - min);

function sprite(size: number, painter: (context: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) painter(context, size);
  return canvas;
}

function createSprites(): Sprites {
  return {
    snow: sprite(48, (context, size) => {
      const center = size / 2;
      const glow = context.createRadialGradient(center, center, 0, center, center, center);
      glow.addColorStop(0, 'rgba(255,255,255,.95)');
      glow.addColorStop(0.2, 'rgba(220,248,255,.82)');
      glow.addColorStop(0.55, 'rgba(150,225,255,.24)');
      glow.addColorStop(1, 'rgba(130,210,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, size, size);
      context.strokeStyle = 'rgba(238,253,255,.9)';
      context.lineWidth = 1.4;
      for (let arm = 0; arm < 3; arm += 1) {
        const angle = arm * Math.PI / 3;
        context.beginPath();
        context.moveTo(center - Math.cos(angle) * 10, center - Math.sin(angle) * 10);
        context.lineTo(center + Math.cos(angle) * 10, center + Math.sin(angle) * 10);
        context.stroke();
      }
    }),
    ice: sprite(40, (context, size) => {
      const gradient = context.createLinearGradient(0, 5, 0, size - 5);
      gradient.addColorStop(0, 'rgba(245,255,255,.95)');
      gradient.addColorStop(0.45, 'rgba(120,220,255,.72)');
      gradient.addColorStop(1, 'rgba(40,120,180,.06)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(size / 2, 4);
      context.lineTo(size * 0.72, size * 0.72);
      context.lineTo(size * 0.36, size - 5);
      context.closePath();
      context.fill();
    }),
    ember: sprite(52, (context, size) => {
      const center = size / 2;
      const glow = context.createRadialGradient(center, center, 0, center, center, center);
      glow.addColorStop(0, 'rgba(255,255,210,1)');
      glow.addColorStop(0.16, 'rgba(255,190,60,.95)');
      glow.addColorStop(0.42, 'rgba(255,70,0,.52)');
      glow.addColorStop(1, 'rgba(255,40,0,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, size, size);
    }),
    ash: sprite(18, (context, size) => {
      context.fillStyle = 'rgba(130,105,95,.55)';
      context.beginPath();
      context.ellipse(size / 2, size / 2, 4, 1.5, 0.5, 0, Math.PI * 2);
      context.fill();
    }),
    mist: sprite(128, (context, size) => {
      const center = size / 2;
      const haze = context.createRadialGradient(center, center, 0, center, center, center);
      haze.addColorStop(0, 'rgba(205,235,245,.12)');
      haze.addColorStop(0.45, 'rgba(165,210,225,.06)');
      haze.addColorStop(1, 'rgba(150,200,220,0)');
      context.fillStyle = haze;
      context.fillRect(0, 0, size, size);
    }),
  };
}

function createParticle(kind: ParticleKind, width: number, height: number, initial: boolean): Particle {
  const fire = kind === 'ember' || kind === 'ash';
  const depth = Math.random();
  const bright = kind === 'ember' && Math.random() < 0.12;
  if (kind === 'mist') {
    return {
      kind,
      x: initial ? random(width * 0.25, width * 0.7) : width * 0.2,
      y: random(height * 0.28, height * 0.82),
      size: random(90, 150),
      vx: random(2.5, 6),
      vy: random(-0.8, 0.8),
      phase: random(0, Math.PI * 2),
      rotation: 0,
      spin: 0,
      alpha: random(0.12, 0.22),
      depth: 0.35,
      bright: false,
    };
  }
  return {
    kind,
    x: fire ? random(width * 0.58, width + 20) : random(-20, width * 0.48),
    y: initial ? random(-20, height + 20) : (fire ? height + 20 : -20),
    size: kind === 'snow'
      ? (depth < 0.35 ? random(1.5, 3) : depth > 0.86 ? random(8, 13) : random(3, 7))
      : kind === 'ice'
        ? random(4, 9)
        : kind === 'ember'
          ? (bright ? random(2.2, 4) : depth < 0.42 ? random(1.2, 2.8) : random(2.2, 5))
          : (depth > 0.86 ? random(5, 8) : random(1.5, 4)),
    vx: fire ? random(-15, 2) : random(10, 30),
    vy: fire ? (bright ? random(-78, -48) : random(-48, -20)) : random(18, 44),
    phase: random(0, Math.PI * 2),
    rotation: random(0, Math.PI * 2),
    spin: random(-1.4, 1.4),
    alpha: bright ? random(0.72, 0.9) : random(0.26, 0.64),
    depth,
    bright,
  };
}

export function MenuAtmosphere({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const sprites = createSprites();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderScale = 0.5;
    const frameInterval = 1000 / 24;
    let width = 1;
    let height = 1;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let previousFrame = 0;
    let simulationTime = performance.now();

    const populate = () => {
      const compact = width < 760;
      const counts: Record<ParticleKind, number> = compact
        ? { snow: 25, ice: 4, ember: 35, ash: 9, mist: 2 }
        : { snow: 36, ice: 6, ember: 50, ash: 13, mist: 3 };
      particles = (Object.keys(counts) as ParticleKind[]).flatMap((kind) =>
        Array.from({ length: counts[kind] }, () => createParticle(kind, width, height, true)),
      );
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.max(1, Math.floor(width * renderScale));
      canvas.height = Math.max(1, Math.floor(height * renderScale));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      populate();
    };

    const reset = (particle: Particle) => {
      Object.assign(particle, createParticle(particle.kind, width, height, false));
    };

    const draw = (particle: Particle, time: number, delta: number, gust: number) => {
      const fire = particle.kind === 'ember' || particle.kind === 'ash';
      const sway = Math.sin(time * 0.0017 + particle.phase) * (particle.kind === 'mist' ? 1.5 : fire ? 5 : 10);
      const wind = particle.kind === 'snow' || particle.kind === 'ice' ? gust * (0.35 + particle.depth * 0.65) : 0;
      particle.x += (particle.vx + sway + wind) * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.spin * delta;

      if (
        particle.y < -70
        || particle.y > height + 70
        || particle.x < -70
        || particle.x > width + 70
      ) reset(particle);

      const image = sprites[particle.kind];
      const drawWidth = particle.kind === 'mist'
        ? particle.size * 2.4
        : particle.size * (particle.kind === 'ember' ? (particle.bright ? 2.8 : 2.2) : 2.4);
      const drawHeight = particle.kind === 'ember'
        ? drawWidth * (particle.bright ? 1.8 : 1.35)
        : particle.kind === 'mist'
          ? particle.size
          : drawWidth;
      context.globalAlpha = particle.alpha;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      context.restore();
    };

    const render = (time: number) => {
      animationFrame = requestAnimationFrame(render);
      if (document.hidden || time - previousFrame < frameInterval) return;
      const delta = Math.min(0.055, Math.max(0.001, (time - simulationTime) / 1000));
      previousFrame = time;
      simulationTime = time;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';
      const gustCycle = Math.sin(time * 0.00022);
      const gust = gustCycle > 0.72 ? (gustCycle - 0.72) * 95 : 0;
      for (const particle of particles) draw(particle, time, delta, gust);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    };

    const handleVisibility = () => {
      simulationTime = performance.now();
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    if (reducedMotion) {
      context.clearRect(0, 0, width, height);
      for (const particle of particles.slice(0, 24)) draw(particle, performance.now(), 0, 0);
    } else {
      animationFrame = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
    />
  );
}
