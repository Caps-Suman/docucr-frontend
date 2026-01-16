import React, { useEffect, useRef, useState } from 'react';
import './IntroAnimation.css';

const IntroAnimation = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Configuration
    const particleDensity = 4; // Lower is more dense
    const mouseRadius = 100;
    const textToRender = "docucr";
    const fontStyle = "bold 15vw 'Comfortaa'"; // Large font relative to viewport

    class Particle {
      constructor(x, y) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.targetX = x;
        this.targetY = y;
        this.size = Math.random() * 2 + 1;
        this.color = 'white';
        // Physics for movement
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.93; // Deceleration
        this.ease = 0.05; // Acceleration towards target
      }

      update() {
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        // Simple easing
        this.x += dx * this.ease;
        this.y += dy * this.ease;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      particles = [];

      // Draw text to get positions
      ctx.fillStyle = 'white';
      ctx.font = fontStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textToRender, canvas.width / 2, canvas.height / 2);

      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Sample pixels
      for (let y = 0; y < textCoordinates.height; y += particleDensity) {
        for (let x = 0; x < textCoordinates.width; x += particleDensity) {
          // Check alpha value (4th byte)
          if (textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 3] > 128) {
            particles.push(new Particle(x, y));
          }
        }
      }
    };

    // Handle font loading
    document.fonts.ready.then(() => {
      init();
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Connect particles responsible for the network effect
      // Optimized: only connect close neighbors to avoid N^2 performance hit with many particles
      // For text, we might have too many particles for full connectivity, 
      // let's just do a subtle connectivity or skip it for performance if high density
      // Let's connect really close ones only

      for (let i = 0; i < particles.length; i++) {
        // Only check a subset or nearby? Naive check for now but limited distance
        // Checking every particle against every other is too slow for text density (~2k+ particles)
        // Let's skip lines for this effect to ensure smooth text formation, 
        // OR simply rely on the density of dots to form the shape which looks like ElevenLabs "sound wave" style if moving.
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', init);

    // Sequence
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
    <div className={`intro-container ${isFading ? 'fade-out' : ''}`}>
      <div style={{ fontFamily: 'Comfortaa', position: 'absolute', visibility: 'hidden' }}>.</div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default IntroAnimation;
