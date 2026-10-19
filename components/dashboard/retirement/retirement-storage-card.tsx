"use client";

import * as React from "react";
import { MapPin, PiggyBank, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getRetirementStorageLabel,
  getRetirementStorageTip,
  STORAGE_TIP_TONE_COLORS,
} from "@/lib/retirement-storage";

interface RetirementStorageCardProps {
  storageLocation?: string | null;
  monthlySavings?: number;
  onEdit?: () => void;
}

export function RetirementStorageCard({
  storageLocation,
  monthlySavings = 0,
  onEdit,
}: RetirementStorageCardProps) {
  const storageTip = getRetirementStorageTip(storageLocation);
  const hasLocation = Boolean(storageLocation);

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md shrink-0 bg-indigo-50">
              <PiggyBank className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight">
                Where your retirement money lives
              </p>
              <p className="text-xs text-muted-foreground">
                Account type for your long-term savings
              </p>
            </div>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Primary account:</span>
          <span className="font-medium text-foreground">
            {getRetirementStorageLabel(storageLocation)}
          </span>
        </div>

        {!hasLocation && (
          <div className="rounded-lg px-3 py-2.5 bg-muted/50 border border-border">
            <p className="text-xs font-semibold text-foreground">
              Not specified yet
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {monthlySavings > 0
                ? "Tell us where your retirement contributions go so we can suggest better options if needed."
                : "Add where your retirement savings are held when you edit your plan."}
            </p>
          </div>
        )}

        {storageTip && (
          <>
            <Separator />
            <div
              className={`rounded-lg px-3 py-2.5 border ${STORAGE_TIP_TONE_COLORS[storageTip.tone].bg} ${STORAGE_TIP_TONE_COLORS[storageTip.tone].border}`}
            >
              <p
                className={`text-xs font-semibold ${STORAGE_TIP_TONE_COLORS[storageTip.tone].text}`}
              >
                {storageTip.title}
              </p>
              <p
                className={`text-xs mt-0.5 ${STORAGE_TIP_TONE_COLORS[storageTip.tone].sub}`}
              >
                {storageTip.text}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
