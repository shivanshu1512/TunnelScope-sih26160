"use client";

import { useEffect, useRef, useCallback } from "react";

export interface PointerState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isActive: boolean;
  isMoving: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  intensity: number;
  speed: number;
  decay: number;
}

export function usePointerPosition(lerpFactor = 0.15) {
  const pointerRef = useRef<PointerState>({
    x: -9999,
    y: -9999,
    targetX: -9999,
    targetY: -9999,
    isActive: false,
    isMoving: false,
  });

  const ripplesRef = useRef<Ripple[]>([]);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if device is touch-primary
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    const handlePointerMove = (e: PointerEvent) => {
      if (isTouch && e.pointerType === "touch") {
        // Degrade gracefully on touch devices
        return;
      }

      pointerRef.current.targetX = e.clientX;
      pointerRef.current.targetY = e.clientY;
      pointerRef.current.isActive = true;
      pointerRef.current.isMoving = true;

      // If pointer was offscreen, snap target
      if (pointerRef.current.x < -1000) {
        pointerRef.current.x = e.clientX;
        pointerRef.current.y = e.clientY;
      }

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        pointerRef.current.isMoving = false;
      }, 500);
    };

    const handlePointerLeave = () => {
      pointerRef.current.isActive = false;
      pointerRef.current.targetX = -9999;
      pointerRef.current.targetY = -9999;
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Add ripple on click
      if (e.clientX >= 0 && e.clientY >= 0) {
        ripplesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          radius: 0,
          maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.75,
          intensity: 1.0,
          speed: 8,
          decay: 0.985,
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const updatePointer = useCallback(() => {
    const ptr = pointerRef.current;
    if (ptr.isActive) {
      ptr.x += (ptr.targetX - ptr.x) * lerpFactor;
      ptr.y += (ptr.targetY - ptr.y) * lerpFactor;
    } else {
      // Smoothly drift offscreen
      ptr.x += (ptr.targetX - ptr.x) * 0.05;
      ptr.y += (ptr.targetY - ptr.y) * 0.05;
    }

    // Update ripples
    for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
      const r = ripplesRef.current[i];
      r.radius += r.speed;
      r.intensity *= r.decay;
      if (r.intensity < 0.01 || r.radius > r.maxRadius) {
        ripplesRef.current.splice(i, 1);
      }
    }
  }, [lerpFactor]);

  return {
    pointerRef,
    ripplesRef,
    updatePointer,
  };
}
