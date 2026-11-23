import { Badge } from "@/components/ui/badge";
import { STOCK_LABELS } from "@/lib/catalog/format";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  in_stock: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30",
  low_stock: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  preorder: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  backorder: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  out_of_stock: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

export function StockBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STYLES[status], className)}>
      {STOCK_LABELS[status] ?? status}
    </Badge>
  );
}
