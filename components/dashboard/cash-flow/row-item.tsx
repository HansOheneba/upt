import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ProgressBar } from "./progress-bar";
import { formatCurrency } from "@/lib/client-data";
import { useUserCurrency } from "@/hooks/useUserCurrency";

export type MoneyRow = {
  id: string;
  name: string;
  amount: number; // monthly
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function RowItem({
  row,
  total,
  onEdit,
  onDelete,
}: {
  row: MoneyRow;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const currency = useUserCurrency();
  const share = pct(row.amount, total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{row.name}</div>

        <div className="flex items-center gap-2">
          <div className="text-sm font-medium tabular-nums">
            {formatCurrency(row.amount, currency)}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="Row actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProgressBar value={share} />
    </div>
  );
}
