"use client";

import * as React from "react";
import Image from "next/image";

import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import type { CarouselApi } from "@/components/ui/carousel";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { LOGIN_SLIDES } from "./slides";
import { brand } from "@/lib/tenant";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface MobileWelcomeProps {
  onGetStarted: () => void;
}

type BlobOrigin = {
  x: number;
  y: number;
  size: number;
};

function blobSizeForPoint(x: number, y: number) {
  const maxDist = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  // Diameter large enough to cover the farthest corner from the click.
  return Math.ceil(maxDist * 2) + 24;
}

export function MobileWelcome({ onGetStarted }: MobileWelcomeProps) {
  const autoplayRef = React.useRef(
    Autoplay({
      delay: 5500,
      stopOnInteraction: false,
    }),
  );

  const [api, setApi] = React.useState<CarouselApi | undefined>(undefined);
  const [current, setCurrent] = React.useState(0);
  const [blob, setBlob] = React.useState<BlobOrigin | null>(null);
  const [blobExpanded, setBlobExpanded] = React.useState(false);
  const finishedRef = React.useRef(false);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  function finishTransition() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onGetStarted();
  }

  function handleGetStarted(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (blob) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      event.clientX > 0
        ? event.clientX
        : rect.left + rect.width / 2;
    const y =
      event.clientY > 0
        ? event.clientY
        : rect.top + rect.height / 2;

    setBlob({
      x,
      y,
      size: blobSizeForPoint(x, y),
    });

    // Expand on the next frame so the scale-up transition runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBlobExpanded(true));
    });

    window.setTimeout(finishTransition, 720);
  }

  return (
    <div className="relative h-svh w-full overflow-hidden bg-white md:hidden">
      {/* Image carousel — ~70% */}
      <div className="absolute inset-x-0 top-0 h-[70%]">
        <Carousel
          setApi={setApi}
          plugins={[Fade(), autoplayRef.current]}
          opts={{
            loop: true,
            containScroll: false,
          }}
          className="absolute inset-0"
        >
          <CarouselContent className="ml-0 h-full">
            {LOGIN_SLIDES.map((slide) => (
              <CarouselItem key={slide.id} className="h-full pl-0">
                <div className="relative h-full w-full">
                  <Image
                    src={slide.imageSrc}
                    alt=""
                    fill
                    priority
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-black/10" />

                  <div className="absolute inset-x-0 bottom-12 z-10 px-6">
                    <p className="text-[1.35rem] font-semibold leading-snug tracking-tight text-white">
                      {slide.headline}
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-white/80">
                      {slide.subline}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 w-full text-white"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,48 C240,80 480,0 720,24 C960,48 1200,80 1440,32 L1440,80 L0,80 Z"
          />
        </svg>
      </div>

      {/* Brand + CTA — ~30% */}
      <div className="absolute inset-x-0 bottom-0 top-[70%] z-30 flex flex-col bg-white">
        <div className="flex h-full flex-col items-center justify-center px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Image
            src={brand.logo.dark}
            alt={brand.name}
            width={220}
            height={68}
            priority
            className={brand.logoClassName?.wordmark ?? "h-12 w-auto object-contain"}
          />
          <p className="mt-3 max-w-[16rem] text-center text-xs leading-relaxed text-muted-foreground">
            Unlocking Professional Wealth Advisory for All.
          </p>

          <div
            className="mt-6 flex items-center gap-2"
            role="tablist"
            aria-label="Slides"
          >
            {LOGIN_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === current}
                disabled={!!blob}
                onClick={() => api?.scrollTo(idx)}
                className={cn(
                  "h-2 rounded-full transition-[width,background-color,transform] duration-160 ease-out active:scale-[0.97]",
                  idx === current
                    ? "w-5 bg-primary"
                    : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40",
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            disabled={!!blob}
            className="mt-8 h-12 w-full max-w-sm text-base font-medium"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* Click-origin white blob */}
      {blob ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none fixed z-50 rounded-full bg-white",
            "transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            blobExpanded ? "scale-100" : "scale-[0.08]",
          )}
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            marginLeft: -blob.size / 2,
            marginTop: -blob.size / 2,
          }}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.propertyName !== "transform") return;
            if (!blobExpanded) return;
            finishTransition();
          }}
        />
      ) : null}
    </div>
  );
}
