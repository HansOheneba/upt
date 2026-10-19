"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { brand } from "@/lib/tenant";

interface BrandLoaderProps {
  onDone?: () => void;
  duration?: number; // total duration in ms
}

export function CelereyLoader({ onDone, duration = 1500 }: BrandLoaderProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const enterTime = duration * 0.25;
    const holdTime = duration * 0.5;
    const exitTime = duration;

    const t1 = setTimeout(() => setPhase("hold"), enterTime);
    const t2 = setTimeout(() => setPhase("out"), holdTime);
    const t3 = setTimeout(() => onDone?.(), exitTime);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [duration, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(circle at 30% 30%, rgba(47,107,255,0.12), transparent 55%),
          radial-gradient(circle at 70% 70%, rgba(168,85,247,0.12), transparent 55%),
          #ffffff
        `,
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes logoEnter {
          0% { transform: scale(0.95); opacity: 0; filter: blur(6px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }

        @keyframes logoPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }

        @keyframes glowPulse {
          0%   { opacity: 0.4; transform: scale(0.9); }
          50%  { opacity: 0.7; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(47,107,255,0.25), rgba(168,85,247,0.15), transparent 70%)",
            animation: "glowPulse 2.2s ease-in-out infinite",
            filter: "blur(12px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(53,199,255,0.25), transparent 70%)",
            animation: "glowPulse 2.6s ease-in-out infinite",
            filter: "blur(10px)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            animation: `
              logoEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              logoPulse 2.2s ease-in-out 0.35s infinite
            `,
          }}
        >
          <Image
            src={brand.logo.dark}
            alt={brand.name}
            width={220}
            height={68}
            priority
            className={brand.logoClassName?.wordmark ?? "h-12 w-auto max-w-[12rem] object-contain sm:h-14"}
          />
        </div>
      </div>
    </div>
  );
}
