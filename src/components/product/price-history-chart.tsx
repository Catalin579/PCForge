import { formatMoney } from "@/lib/pricing/money";
import { type PricePoint } from "@/lib/catalog/queries";

const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

/**
 * Lowest daily price as a small server-rendered SVG line chart.
 * The summary line above it gives screen readers the key numbers.
 */
export function PriceHistoryChart({ points, locale }: { points: PricePoint[]; locale: string }) {
  if (points.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        Not enough price history yet. Prices are recorded each time a retailer updates an offer.
      </p>
    );
  }
  const currency = points[0]!.currency;
  const values = points.map((p) => p.min);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const t0 = Date.parse(points[0]!.date);
  const t1 = Date.parse(points.at(-1)!.date);
  const tSpan = t1 - t0 || 1;
  const x = (d: string) => PAD.left + ((Date.parse(d) - t0) / tSpan) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom);
  // Step line: a price holds until the next change.
  const path = points
    .map((p, i) => {
      const px = x(p.date).toFixed(1);
      const py = y(p.min).toFixed(1);
      if (i === 0) return `M${px},${py}`;
      return `H${px} V${py}`;
    })
    .join(" ");
  const fmt = (v: number) => formatMoney({ amount: v, currency }, locale);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const last = points.at(-1)!;
  const lowest = points.reduce((a, b) => (b.min < a.min ? b : a));

  return (
    <figure className="space-y-2">
      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          Now <span className="text-foreground font-medium tabular-nums">{fmt(last.min)}</span>
        </span>
        <span>
          Lowest <span className="text-foreground font-medium tabular-nums">{fmt(lowest.min)}</span>{" "}
          on {fmtDate(lowest.date)}
        </span>
        <span>
          Highest <span className="text-foreground font-medium tabular-nums">{fmt(hi)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="text-primary h-auto w-full"
        role="img"
        aria-label={`Lowest price over time, from ${fmt(points[0]!.min)} to ${fmt(last.min)}`}
      >
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(lo)}
          y2={y(lo)}
          className="stroke-border"
          strokeDasharray="4 4"
        />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(hi)}
          y2={y(hi)}
          className="stroke-border"
          strokeDasharray="4 4"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(last.date)} cy={y(last.min)} r={4} fill="currentColor" />
        <text x={PAD.left} y={H - 6} className="fill-muted-foreground text-[11px]">
          {fmtDate(points[0]!.date)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          className="fill-muted-foreground text-[11px]"
        >
          {fmtDate(last.date)}
        </text>
      </svg>
      <figcaption className="sr-only">
        Lowest price per day across retailers in your region.
      </figcaption>
    </figure>
  );
}
