import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EnrichedGoal } from "./types";

export function DeleteGoalDialog({
  open,
  onOpenChange,
  pendingDelete,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingDelete: EnrichedGoal | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete goal?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDelete ? (
              <>
                This will permanently remove{" "}
                <span className="font-medium text-foreground">
                  {pendingDelete.title}
                </span>
                . You can&apos;t undo this action.
              </>
            ) : (
              "This will permanently remove this goal. You can&apos;t undo this action."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
