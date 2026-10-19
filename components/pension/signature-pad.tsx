"use client";

import { useEffect, useRef } from "react";

type SignaturePadProps = {
  onChange: (dataUrl: string | null) => void;
};

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    function resize() {
      if (!canvas || !context) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineWidth = 2;
      context.lineCap = "round";
      context.strokeStyle = "#0B3D5C";
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    drawing.current = true;
    canvas?.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    dirty.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current) return;
    const canvas = canvasRef.current;
    onChange(canvas ? canvas.toDataURL("image/png") : null);
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    dirty.current = false;
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-28 w-full touch-none rounded-md border border-input bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Signature"
      />
      <button
        type="button"
        onClick={clear}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Clear signature
      </button>
    </div>
  );
}
