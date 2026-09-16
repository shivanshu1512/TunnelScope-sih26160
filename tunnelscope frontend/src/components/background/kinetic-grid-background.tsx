"use client";

import React, { useEffect, useRef } from "react";
import { usePointerPosition } from "./use-pointer-position";
import { useTheme } from "@/features/theme";

export interface KineticGridBackgroundProps {
  /** Size of each grid cell in pixels (default: 48) */
  cellSize?: number;
  /** Radius of cursor influence in pixels (default: 240) */
  mouseRadius?: number;
  /** Strength of grid warping towards cursor (default: 0.32) */
  warpStrength?: number;
  /** Spring return stiffness (default: 0.08) */
  springStiffness?: number;
  /** Spring damping to prevent excessive oscillations (default: 0.85) */
  springDamping?: number;
  /** Base theme palette override: 'light' or 'dark' (defaults to active ThemeContext) */
  theme?: "light" | "dark";
  /** Optional custom CSS class */
  className?: string;
}

interface GridNode {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isMajor: boolean;
  activation: number; // 0 to 1 based on proximity & velocity
}

export const KineticGridBackground: React.FC<KineticGridBackgroundProps> = ({
  cellSize = 48,
  mouseRadius = 240,
  warpStrength = 0.32,
  springStiffness = 0.08,
  springDamping = 0.85,
  theme: explicitTheme,
  className = "",
}) => {
  const { theme: contextTheme } = useTheme();
  const effectiveTheme = explicitTheme || contextTheme || "light";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { pointerRef, ripplesRef, updatePointer } = usePointerPosition(0.14);

  // Store grid state in ref to avoid React state re-renders during animation
  const gridRef = useRef<{
    nodes: GridNode[][];
    cols: number;
    rows: number;
    width: number;
    height: number;
    dpr: number;
  }>({
    nodes: [],
    cols: 0,
    rows: 0,
    width: 0,
    height: 0,
    dpr: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let time = 0;

    // Initialize or recompute grid extending past boundaries to ensure no seams
    const initGrid = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const extra = 3;
      const cols = Math.ceil(width / cellSize) + extra * 2;
      const rows = Math.ceil(height / cellSize) + extra * 2;
      const offsetX = -extra * cellSize;
      const offsetY = -extra * cellSize;

      const nodes: GridNode[][] = [];

      for (let r = 0; r < rows; r++) {
        const rowNodes: GridNode[] = [];
        for (let c = 0; c < cols; c++) {
          const bx = offsetX + c * cellSize;
          const by = offsetY + r * cellSize;
          const isMajor = (c - extra) % 4 === 0 && (r - extra) % 4 === 0;

          rowNodes.push({
            baseX: bx,
            baseY: by,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            isMajor,
            activation: 0,
          });
        }
        nodes.push(rowNodes);
      }

      gridRef.current = {
        nodes,
        cols,
        rows,
        width,
        height,
        dpr,
      };
    };

    initGrid();

    // Theme-based color constants for restrained technical aesthetic
    const isDark = effectiveTheme === "dark";
    const colors = {
      background: isDark ? "#07111f" : "#fbfcfe",
      bgGradientOuter: isDark ? "#040913" : "#f0f4f8",
      lineBase: isDark
        ? "rgba(51, 65, 85, 0.4)"
        : "rgba(148, 163, 184, 0.25)",
      lineActive: isDark
        ? "rgba(56, 189, 248, 0.85)"
        : "rgba(37, 99, 235, 0.65)",
      dotBase: isDark
        ? "rgba(100, 116, 139, 0.45)"
        : "rgba(148, 163, 184, 0.4)",
      dotActive: isDark
        ? "rgba(96, 165, 250, 0.95)"
        : "rgba(37, 99, 235, 0.95)",
      crosshair: isDark
        ? "rgba(148, 163, 184, 0.3)"
        : "rgba(100, 116, 139, 0.3)",
      crosshairActive: isDark
        ? "rgba(56, 189, 248, 0.9)"
        : "rgba(37, 99, 235, 0.8)",
    };

    // Main animation loop
    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.015;
      updatePointer();

      const { nodes, cols, rows, width, height, dpr } = gridRef.current;
      const pointer = pointerRef.current;
      const ripples = ripplesRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Draw subtle ambient background
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.1,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
      );
      bgGrad.addColorStop(0, colors.background);
      bgGrad.addColorStop(1, colors.bgGradientOuter);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Physics step: update node displacements with spring physics & pointer interaction
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];

          // Subtle baseline ambient breathing for spatial depth
          const ambientOffsetX =
            Math.sin(time + node.baseY * 0.004 + node.baseX * 0.003) * 1.0;
          const ambientOffsetY =
            Math.cos(time + node.baseX * 0.004 + node.baseY * 0.003) * 1.0;

          let targetX = node.baseX + ambientOffsetX;
          let targetY = node.baseY + ambientOffsetY;
          let targetActivation = 0;

          // Pointer warp interaction
          if (pointer.isActive) {
            const dx = pointer.x - node.baseX;
            const dy = pointer.y - node.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseRadius) {
              // Smooth cosine falloff
              const normDist = dist / mouseRadius;
              const factor = Math.pow(Math.cos((normDist * Math.PI) / 2), 2);

              // Pull towards pointer
              targetX += dx * factor * warpStrength;
              targetY += dy * factor * warpStrength;
              targetActivation = Math.max(targetActivation, factor);
            }
          }

          // Ripple wave interaction
          for (let i = 0; i < ripples.length; i++) {
            const rip = ripples[i];
            const rdx = node.baseX - rip.x;
            const rdy = node.baseY - rip.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);

            const distFromWave = Math.abs(rdist - rip.radius);
            const waveWidth = 90;

            if (distFromWave < waveWidth) {
              const waveFactor =
                Math.cos((distFromWave / waveWidth) * (Math.PI / 2)) *
                rip.intensity;
              const angle = Math.atan2(rdy, rdx);
              const push = Math.sin(distFromWave * 0.09) * 14 * waveFactor;

              targetX += Math.cos(angle) * push;
              targetY += Math.sin(angle) * push;
              targetActivation = Math.max(targetActivation, waveFactor * 0.85);
            }
          }

          // Spring physics integration
          const ax = (targetX - node.x) * springStiffness;
          const ay = (targetY - node.y) * springStiffness;

          node.vx = (node.vx + ax) * springDamping;
          node.vy = (node.vy + ay) * springDamping;

          node.x += node.vx;
          node.y += node.vy;

          // Smooth activation interpolation
          node.activation += (targetActivation - node.activation) * 0.15;
        }
      }

      // 3. Render horizontal grid lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const n1 = nodes[r][c];
          const n2 = nodes[r][c + 1];

          const avgActivation = (n1.activation + n2.activation) / 2;

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);

          if (avgActivation > 0.02) {
            ctx.strokeStyle = colors.lineActive;
            ctx.lineWidth = 1 + avgActivation * 0.8;
            ctx.globalAlpha = 0.35 + avgActivation * 0.65;
          } else {
            ctx.strokeStyle = colors.lineBase;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.7;
          }
          ctx.stroke();
        }
      }

      // 4. Render vertical grid lines
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
          const n1 = nodes[r][c];
          const n2 = nodes[r + 1][c];

          const avgActivation = (n1.activation + n2.activation) / 2;

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);

          if (avgActivation > 0.02) {
            ctx.strokeStyle = colors.lineActive;
            ctx.lineWidth = 1 + avgActivation * 0.8;
            ctx.globalAlpha = 0.35 + avgActivation * 0.65;
          } else {
            ctx.strokeStyle = colors.lineBase;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.7;
          }
          ctx.stroke();
        }
      }

      // 5. Render grid dots and technical crosshair accents
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const node = nodes[r][c];
          const act = node.activation;

          // Technical crosshairs at major coordinate junctions
          if (node.isMajor) {
            const crossSize = 3.5 + act * 2.5;
            ctx.beginPath();
            ctx.moveTo(node.x - crossSize, node.y);
            ctx.lineTo(node.x + crossSize, node.y);
            ctx.moveTo(node.x, node.y - crossSize);
            ctx.lineTo(node.x, node.y + crossSize);

            ctx.strokeStyle =
              act > 0.05 ? colors.crosshairActive : colors.crosshair;
            ctx.lineWidth = act > 0.05 ? 1.2 : 0.8;
            ctx.globalAlpha = act > 0.05 ? 0.9 : 0.4;
            ctx.stroke();
          }

          // Intersection Dot
          const dotRadius = node.isMajor
            ? 1.8 + act * 2.2
            : 1.1 + act * 1.8;

          ctx.beginPath();
          ctx.arc(node.x, node.y, dotRadius, 0, Math.PI * 2);

          if (act > 0.02) {
            ctx.fillStyle = colors.dotActive;
            ctx.globalAlpha = 0.5 + act * 0.5;
          } else {
            ctx.fillStyle = colors.dotBase;
            ctx.globalAlpha = node.isMajor ? 0.65 : 0.4;
          }
          ctx.fill();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Handle window resizing
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initGrid();
      }, 100);
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };

    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(resizeTimer);
    };
  }, [
    cellSize,
    mouseRadius,
    warpStrength,
    springStiffness,
    springDamping,
    effectiveTheme,
    updatePointer,
    pointerRef,
    ripplesRef,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
};

export default KineticGridBackground;
