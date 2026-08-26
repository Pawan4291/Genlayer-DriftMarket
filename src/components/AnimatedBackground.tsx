"use client";
import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;

    canvas.width = w;
    canvas.height = h;

    // Particle grid
    const cols = Math.floor(w / 40);
    const rows = Math.floor(h / 40);

    type Particle = {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      phase: number;
      speed: number;
    };

    const particles: Particle[] = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        particles.push({
          x: (c / cols) * w,
          y: (r / rows) * h,
          baseX: (c / cols) * w,
          baseY: (r / rows) * h,
          size: Math.random() * 1.5 + 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.5 + 0.2,
        });
      }
    }

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.005;

      // Draw connections
      ctx.strokeStyle = "rgba(0,0,0,0.04)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.baseX + Math.sin(t * p.speed + p.phase) * 8;
        p.y = p.baseY + Math.cos(t * p.speed * 0.7 + p.phase) * 8;
      }

      // Draw lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 55) {
            ctx.globalAlpha = (1 - dist / 55) * 0.3;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.globalAlpha = 1;
      for (const p of particles) {
        ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(t + p.phase) * 0.04})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
