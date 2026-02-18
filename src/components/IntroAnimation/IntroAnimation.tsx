import React, { useEffect, useRef, useState } from 'react';
import styles from './IntroAnimation.module.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

interface ParticleType {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  velocity: { x: number; y: number };
  friction: number;
  ease: number;
  update: () => void;
  draw: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: ParticleType[] = [];

    const particleDensity = 4;
    const textToRender = "docucr";
    const fontStyle = "bold 15vw 'Comfortaa'";

    class Particle implements ParticleType {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      size: number;
      color: string;
      velocity: { x: number; y: number };
      friction: number;
      ease: number;

      constructor(x: number, y: number) {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.targetX = x;
        this.targetY = y;
        this.size = Math.random() * 2 + 1;
        this.color = 'white';
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.93;
        this.ease = 0.05;
      }

      update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        this.x += dx * this.ease;
        this.y += dy * this.ease;
      }

      draw() {
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];

      ctx.fillStyle = 'white';
      ctx.font = fontStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textToRender, canvas.width / 2, canvas.height / 2);

      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < textCoordinates.height; y += particleDensity) {
        for (let x = 0; x < textCoordinates.width; x += particleDensity) {
          if (textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 3] > 128) {
            particles.push(new Particle(x, y));
          }
        }
      }
    };

    document.fonts.ready.then(() => {
      init();
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', init);

    const timer1 = setTimeout(() => {
      setIsFading(true);
    }, 3500);

    const timer2 = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className={`${styles['intro-container']} ${isFading ? styles['fade-out'] : ''}`}>
      <div style={{ fontFamily: 'Comfortaa', position: 'absolute', visibility: 'hidden' }}>.</div>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};

export default IntroAnimation;
