"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--brand-primary)",
          "--normal-text": "#ffffff",
          "--normal-border": "var(--brand-primary)",
          "--success-bg": "var(--brand-primary)",
          "--success-text": "#ffffff",
          "--success-border": "var(--brand-primary)",
          "--error-bg": "var(--brand-primary)",
          "--error-text": "#ffffff",
          "--error-border": "var(--brand-primary)",
          "--warning-bg": "var(--brand-primary)",
          "--warning-text": "#ffffff",
          "--warning-border": "var(--brand-primary)",
          "--info-bg": "var(--brand-primary)",
          "--info-text": "#ffffff",
          "--info-border": "var(--brand-primary)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
