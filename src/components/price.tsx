import { formatMoney, type Money } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

/** Formatted price; renders a dash when unknown. Safe in server and client components. */
export function Price({ value, locale, className }: { value: Money | null | undefined; locale: string; className?: string }) {
  if (!value) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return <span className={cn("tabular-nums", className)}>{formatMoney(value, locale)}</span>;
}
