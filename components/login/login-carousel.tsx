"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import type { CarouselApi } from "@/components/ui/carousel";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { LOGIN_SLIDES } from "./slides";
import { brand } from "@/lib/tenant";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function LoginCarousel() {
  const autoplayRef = React.useRef(
    Autoplay({
      delay: 8000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  const [api, setApi] = React.useState<CarouselApi | undefined>(undefined);
  const [current, setCurrent] = React.useState<number>(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="relative m-4 overflow-hidden rounded-sm bg-black md:m-5 hidden md:block">
      <Carousel
        setApi={setApi}
        plugins={[Fade(), autoplayRef.current]}
        opts={{
          loop: true,
          containScroll: false,
        }}
        className="h-full"
        onMouseEnter={() => autoplayRef.current.stop()}
        onMouseLeave={() => autoplayRef.current.play()}
      >
        <CarouselContent className="h-full ml-0">
          {LOGIN_SLIDES.map((s) => (
            <CarouselItem key={s.id} className="h-full pl-0">
              <div className="relative h-full w-full">
                <Image
                  src={s.imageSrc}
                  alt={`${brand.name} visual`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 55vw"
                />

                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute inset-x-6 bottom-20 z-10 text-white">
                  <p className="max-w-xl text-3xl font-semibold leading-tight md:text-[40px] md:leading-[1.05]">
                    &ldquo;{s.headline}&rdquo;
                  </p>
                  <p className="mt-4 max-w-xl text-sm text-white/85 md:text-base">
                    {s.subline}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Controls */}
        <div className="absolute inset-x-6 bottom-6 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CarouselPrevious
              className={cn(
                "static translate-y-0 h-10 w-10 rounded-full",
                "bg-white/10 ring-1 ring-white/20 backdrop-blur",
                "hover:bg-white/15 text-white border-0",
              )}
              aria-label="Previous"
            />
            <CarouselNext
              className={cn(
                "static translate-y-0 h-10 w-10 rounded-full",
                "bg-white/10 ring-1 ring-white/20 backdrop-blur",
                "hover:bg-white/15 text-white border-0",
              )}
              aria-label="Next"
            />
          </div>

          <Link
            href={brand.marketingUrl}
            className="text-sm text-white/90 hover:text-white"
          >
            Learn more →
          </Link>
        </div>

        {/* Dots */}
        <div className="absolute inset-x-6 top-16 z-20 flex items-center gap-2">
          {LOGIN_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => api?.scrollTo(idx)}
              className={cn(
                "h-1.5 w-6 rounded-full transition",
                idx === current
                  ? "bg-white/90"
                  : "bg-white/30 hover:bg-white/50",
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
}
