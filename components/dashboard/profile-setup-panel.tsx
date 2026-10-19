"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Circle, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { useProfilePanel } from "./profile-panel-context";
import {
  useProfileChecklistUI,
  type ProfileChecklistUIItem,
} from "@/hooks/useProfileChecklistUI";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { dashboardTheme } from "@/lib/dashboard-theme";

type ChecklistItem = ProfileChecklistUIItem;

// ─── Row ──────────────────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const { dismiss } = useProfilePanel();
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        item.completed ? "opacity-50 bg-gray-50/60" : "bg-white"
      }`}
    >
      <div
        className={`shrink-0 ${item.completed ? "text-emerald-500" : "text-muted-foreground"}`}
      >
        {item.completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>

      <div
        className={`p-1.5 rounded-md shrink-0 ${
          item.completed
            ? "bg-emerald-50 text-emerald-600"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-medium leading-snug ${
            item.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {item.label}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {item.description}
        </p>
      </div>

      {!item.completed &&
        (item.onAction ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1 text-[11px] h-7 px-2"
            onClick={() => {
              dismiss();
              item.onAction!();
            }}
          >
            {item.actionLabel}
            <ChevronRight className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 gap-1 text-[11px] h-7 px-2"
            onClick={dismiss}
          >
            <Link href={item.href!}>
              {item.actionLabel}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        ))}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function ChecklistSection({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const completedCount = items.filter((i) => i.completed).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={dashboardTheme.sectionLabelChecklist}>{title}</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {completedCount}/{items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ProfileSetupPanel() {
  const { isOpen, dismiss, openRiskQuiz } = useProfilePanel();
  const isMobile = useIsMobile();
  const {
    basicsItems,
    completePictureItems,
    completedItems,
    totalItems,
    score,
  } = useProfileChecklistUI({ onRiskQuiz: openRiskQuiz });

  return (
    <AnimatePresence>
      {isOpen && isMobile && (
        <motion.button
          key="profile-panel-backdrop"
          type="button"
          aria-label="Dismiss profile setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-40 bg-black/50"
          onClick={dismiss}
        />
      )}
      {isOpen && (
        <motion.div
          key="profile-panel-wrapper"
          initial={isMobile ? { transform: "translateX(100%)" } : { width: 0 }}
          animate={isMobile ? { transform: "translateX(0%)" } : { width: 360 }}
          exit={isMobile ? { transform: "translateX(100%)" } : { width: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className={cn(
            "overflow-hidden",
            isMobile
              ? "fixed inset-y-0 right-0 z-50 w-full max-w-[360px]"
              : "shrink-0",
          )}
        >
          <motion.aside
            initial={isMobile ? false : { transform: "translateX(100%)" }}
            animate={{ transform: "translateX(0%)" }}
            exit={isMobile ? undefined : { transform: "translateX(100%)" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="flex flex-col h-svh w-full md:w-[360px] border-l border-gray-200 bg-white overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Complete your profile
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {completedItems} of {totalItems} done
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Score bar */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Profile completeness
                </p>
                <span className="text-sm font-bold tabular-nums text-[#160b35]">
                  {score}%
                </span>
              </div>
              <Progress value={score} className="h-2" />
              {score === 100 && (
                <p className="text-xs text-emerald-600 font-medium">
                  Your profile is fully set up!
                </p>
              )}
            </div>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <ChecklistSection title="Financial Basics" items={basicsItems} />
              <Separator />
              <ChecklistSection
                title="Complete Your Picture"
                items={completePictureItems}
              />
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
