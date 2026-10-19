"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export type EditMode = "income" | "expense";

export type DeleteTarget = {
  type: EditMode;
  row: {
    id: string;
    name: string;
    amount: number;
  };
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: DeleteTarget | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item?</AlertDialogTitle>
          <AlertDialogDescription>
            {target ? (
              <>
                This will remove{" "}
                <span className="font-medium text-foreground">
                  {target.row.name}
                </span>{" "}
                from your {target.type === "income" ? "income" : "expenses"}.
              </>
            ) : (
              "This will remove the selected item."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
