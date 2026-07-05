"use client";

import { useEffect, useRef } from "react";

export function Aurora() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = window.innerWidth;
      canvas.height = parent.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const layers = [
        { baseY: 0.25, amp: 0.15, freq: 0.003, speed: 1, color: "200, 200, 200", alpha: 0.2 },
        { baseY: 0.3, amp: 0.12, freq: 0.005, speed: 1.2, color: "100, 100, 100", alpha: 0.15 },
        { baseY: 0.18, amp: 0.18, freq: 0.002, speed: 0.6, color: "50, 50, 50", alpha: 0.12 },
        { baseY: 0.35, amp: 0.1, freq: 0.006, speed: 1.5, color: "0, 0, 0", alpha: 0.2 },
        { baseY: 0.22, amp: 0.14, freq: 0.004, speed: 0.9, color: "150, 150, 150", alpha: 0.15 },
      ];

      for (const layer of layers) {
        ctx.beginPath();

        for (let x = 0; x <= w; x += 2) {
          const ny =
            Math.sin(x * layer.freq + time * layer.speed) * layer.amp +
            Math.sin(x * layer.freq * 2.1 + time * layer.speed * 0.8 + 1.5) * layer.amp * 0.5 +
            Math.sin(x * layer.freq * 0.5 + time * layer.speed * 1.3 + 3.2) * layer.amp * 0.3 +
            Math.sin(x * layer.freq * 3.7 + time * layer.speed * 0.4 + 5.1) * layer.amp * 0.2 +
            layer.baseY;

          const y = ny * h;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        const g = ctx.createLinearGradient(0, 0, w, h * 0.5);
        g.addColorStop(0, `rgba(${layer.color}, 0)`);
        g.addColorStop(0.2, `rgba(${layer.color}, ${layer.alpha + 0.06})`);
        g.addColorStop(0.5, `rgba(${layer.color}, ${layer.alpha})`);
        g.addColorStop(1, `rgba(${layer.color}, 0)`);

        ctx.fillStyle = g;
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(w / 2, h * 0.2, 0, w / 2, h * 0.2, w * 0.7);
      glow.addColorStop(0, `rgba(200, 200, 200, ${0.06 + Math.sin(time * 0.3) * 0.025})`);
      glow.addColorStop(0.4, `rgba(100, 100, 100, ${0.04 + Math.sin(time * 0.2 + 1) * 0.015})`);
      glow.addColorStop(1, "rgba(50, 50, 50, 0)");

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
