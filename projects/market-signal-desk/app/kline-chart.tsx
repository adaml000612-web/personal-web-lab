"use client";

import { useEffect, useRef, useState } from "react";
import type { KlinePoint } from "./kline";

const lineColors = { ma5: "#e4a83c", ma10: "#315ee7", ma20: "#9b6bd3" } as const;

export function KlineChart({ points }: { points: KlinePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const effectiveIndex = hoverIndex === null ? points.length - 1 : Math.min(hoverIndex, points.length - 1);
  const hovered = points[effectiveIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    const chartTop = 18;
    const chartBottom = height * .72;
    const volumeTop = height * .79;
    const volumeBottom = height - 18;
    const prices = points.flatMap(({ high, low }) => [high, low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = Math.max(max - min, .01);
    const step = width / points.length;
    const candleWidth = Math.max(2, Math.min(9, step * .58));
    const priceY = (value: number) => chartBottom - ((value - min) / span) * (chartBottom - chartTop);
    const maxVolume = Math.max(...points.map(({ volume }) => volume), 1);

    context.strokeStyle = "rgba(101,117,129,.2)";
    context.lineWidth = 1;
    for (let row = 0; row < 4; row += 1) {
      const y = chartTop + ((chartBottom - chartTop) / 3) * row;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    points.forEach((point, index) => {
      const x = (index + .5) * step;
      const rising = point.close >= point.open;
      context.strokeStyle = rising ? "#d4544c" : "#158b6d";
      context.fillStyle = context.strokeStyle;
      context.beginPath();
      context.moveTo(x, priceY(point.high));
      context.lineTo(x, priceY(point.low));
      context.stroke();
      const top = priceY(Math.max(point.open, point.close));
      const bodyHeight = Math.max(2, Math.abs(priceY(point.open) - priceY(point.close)));
      context.fillRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
      const volumeHeight = (point.volume / maxVolume) * (volumeBottom - volumeTop);
      context.globalAlpha = .35;
      context.fillRect(x - candleWidth / 2, volumeBottom - volumeHeight, candleWidth, volumeHeight);
      context.globalAlpha = 1;
    });

    (Object.keys(lineColors) as Array<keyof typeof lineColors>).forEach((key) => {
      context.strokeStyle = lineColors[key];
      context.lineWidth = 1.5;
      context.beginPath();
      let started = false;
      points.forEach((point, index) => {
        const value = point[key];
        if (value === null) return;
        const x = (index + .5) * step;
        const y = priceY(value);
        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else context.lineTo(x, y);
      });
      context.stroke();
    });

    if (effectiveIndex >= 0) {
      const x = (effectiveIndex + .5) * step;
      context.strokeStyle = "rgba(11,22,37,.45)";
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(x, chartTop);
      context.lineTo(x, volumeBottom);
      context.stroke();
    }
  }, [effectiveIndex, points]);

  function selectPoint(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const index = Math.floor(((clientX - rect.left) / rect.width) * points.length);
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div className="kline-chart">
      <div className="ma-legend"><span className="ma5">MA5</span><span className="ma10">MA10</span><span className="ma20">MA20</span></div>
      <canvas
        ref={canvasRef}
        onMouseMove={(event) => selectPoint(event.clientX)}
        onTouchMove={(event) => selectPoint(event.touches[0].clientX)}
        aria-label="股票 K 线与成交量图"
      />
      {hovered && (
        <div className="kline-values">
          <strong>{hovered.date}</strong>
          <span>开 {hovered.open.toFixed(2)}</span><span>高 {hovered.high.toFixed(2)}</span>
          <span>低 {hovered.low.toFixed(2)}</span><span>收 {hovered.close.toFixed(2)}</span>
          <span>量 {hovered.volume.toLocaleString("zh-CN")}</span>
        </div>
      )}
    </div>
  );
}
