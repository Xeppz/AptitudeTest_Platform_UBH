"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const PARTICLE_COUNT = 110;
const POINTER_RADIUS = 140;
const POINTER_FORCE = 0.035;
const DRIFT_SPEED = 0.15;

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * DRIFT_SPEED,
      vy: (Math.random() - 0.5) * DRIFT_SPEED,
      radius: 1 + Math.random() * 2,
    }));

    const pointer = { x: -9999, y: -9999, active: false };

    function setPointer(x: number, y: number) {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    }
    function clearPointer() {
      pointer.active = false;
    }

    function onMouseMove(e: MouseEvent) {
      setPointer(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) setPointer(touch.clientX, touch.clientY);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", clearPointer);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", clearPointer);

    let frameId: number;

    function step() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < POINTER_RADIUS && dist > 0.01) {
            const pull = (1 - dist / POINTER_RADIUS) * POINTER_FORCE;
            p.vx += (dx / dist) * pull;
            p.vy += (dy / dist) * pull;
          }
        }

        // gentle drag so velocity doesn't accumulate indefinitely
        p.vx *= 0.96;
        p.vy *= 0.96;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(37, 99, 235, 0.75)"; // blue-600, brighter
        ctx!.fill();
      }

      frameId = requestAnimationFrame(step);
    }

    if (prefersReducedMotion) {
      // Draw one static frame instead of animating continuously.
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(37, 99, 235, 0.75)";
        ctx.fill();
      }
    } else {
      frameId = requestAnimationFrame(step);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", clearPointer);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", clearPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}
