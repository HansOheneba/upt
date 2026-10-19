"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { dashboardTheme } from "@/lib/dashboard-theme";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";
import {
  useProfileChecklistUI,
  type ProfileChecklistUIItem,
} from "@/hooks/useProfileChecklistUI";

type ChecklistItem = ProfileChecklistUIItem;

function ChecklistSection({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={dashboardTheme.sectionLabelChecklist}>{title}</p>
        <Badge variant="secondary" className="text-[11px]">
          {completedCount}/{items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <Card className={item.completed ? "opacity-60" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`shrink-0 ${item.completed ? "text-emerald-500" : "text-muted-foreground"}`}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </div>

          <div
            className={`p-2 rounded-lg shrink-0 ${item.completed ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-muted text-muted-foreground"}`}
          >
            {item.icon}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {item.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {item.description}
            </p>
          </div>

          {!item.completed &&
            (item.onAction ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 text-xs"
                onClick={item.onAction}
              >
                {item.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 text-xs"
              >
                <Link href={item.href!}>
                  {item.actionLabel}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfileSetupPage() {
  const { openRiskQuiz } = useProfilePanel();
  const {
    basicsItems,
    completePictureItems,
    totalItems,
    completedItems,
    score,
  } = useProfileChecklistUI({
    iconClass: "h-4 w-4",
    onRiskQuiz: openRiskQuiz,
  });

  const mc = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.04 },
    },
  };
  const mi = {
    hidden: { opacity: 0, transform: "translateY(10px)" },
    show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.28 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={mc}
      className="min-h-screen"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 space-y-8">
        <motion.div variants={mi} className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Complete your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            The more we know, the better we can guide you. Every step unlocks
            deeper insights.
          </p>
        </motion.div>

        <motion.div variants={mi}>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Profile completeness
                    </p>
                    <span className="text-xl font-bold tabular-nums text-[#160b35]">
                      {score}%
                    </span>
                  </div>
                  <Progress value={score} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {completedItems} of {totalItems} sections complete
                    {score === 100
                      ? " - your profile is fully set up!"
                      : " - keep going!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={mi}>
          <ChecklistSection title="Financial Basics" items={basicsItems} />
        </motion.div>

        <Separator />

        <motion.div variants={mi}>
          <ChecklistSection
            title="Complete Your Picture"
            items={completePictureItems}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
