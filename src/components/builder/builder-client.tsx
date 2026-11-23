"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Minus,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/catalog/category-icon";
import { StockBadge } from "@/components/catalog/stock-badge";
import { Price } from "@/components/price";
import { useRegion } from "@/components/region/region-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  MAX_QUANTITY,
  useBuilder,
  useBuilderHydrated,
  type BuilderItem,
} from "@/lib/builder/store";
import type { BuildView } from "@/lib/builds/view";
import { catalogHref } from "@/lib/catalog/filters";
import { type CategorySlug } from "@/lib/catalog/specs";
import { formatMoney } from "@/lib/pricing/money";
import { type BuildStatus, type CompatibilityIssue, type UseCase } from "@/lib/compatibility/types";
import { cn } from "@/lib/utils";

export type BuilderCategory = {
  slug: CategorySlug;
  name: string;
  pluralName: string;
  icon: string | null;
  isCore: boolean;
  maxPerBuild: number | null;
};

const USE_CASE_LABELS: Record<UseCase, string> = {
  gaming: "Gaming",
  productivity: "Productivity",
  streaming: "Streaming",
  content_creation: "Content creation",
  workstation: "Workstation",
  home_office: "Home office",
};

const STATUS: Record<BuildStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> =
  {
    empty: { label: "Empty", className: "bg-muted text-muted-foreground", Icon: Info },
    incompatible: {
      label: "Incompatible",
      className: "bg-destructive/15 text-destructive border-destructive/30",
      Icon: XCircle,
    },
    incomplete: {
      label: "Incomplete",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
      Icon: AlertCircle,
    },
    warnings: {
      label: "Compatible with warnings",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      Icon: AlertTriangle,
    },
    compatible: {
      label: "Compatible",
      className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30",
      Icon: CheckCircle2,
    },
  };

const SEVERITY_ICON = { error: XCircle, warning: AlertTriangle, info: Info } as const;
const SEVERITY_CLASS = {
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
} as const;

const selectClass =
  "border-input bg-background focus-visible:ring-ring/50 h-8 w-full min-w-0 rounded-md border px-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none";

async function evaluate(body: {
  items: BuilderItem[];
  useCase: UseCase;
  includeMarketplace: boolean;
}): Promise<BuildView> {
  const res = await fetch("/api/builds/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: body.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        selectedOfferId: i.selectedOfferId ?? null,
      })),
      useCase: body.useCase,
      includeMarketplace: body.includeMarketplace,
    }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : "Could not check this build.";
    throw new Error(message);
  }
  return json as BuildView;
}

export function BuilderClient({ categories }: { categories: BuilderCategory[] }) {
  const hydrated = useBuilderHydrated();
  const region = useRegion();
  const items = useBuilder((s) => s.items);
  const clear = useBuilder((s) => s.clear);
  const [useCase, setUseCase] = useState<UseCase>("gaming");
  const [includeMarketplace, setIncludeMarketplace] = useState(true);

  const query = useQuery({
    queryKey: [
      "build-evaluation",
      region.regionCode,
      region.currency,
      useCase,
      includeMarketplace,
      items,
    ],
    queryFn: () => evaluate({ items, useCase, includeMarketplace }),
    enabled: hydrated && items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const view = items.length > 0 ? query.data : undefined;

  const issuesByVariant = useMemo(() => {
    const map = new Map<string, CompatibilityIssue[]>();
    for (const issue of view?.compatibility.issues ?? []) {
      for (const id of issue.componentIds) map.set(id, [...(map.get(id) ?? []), issue]);
    }
    return map;
  }, [view]);

  const visibleCategories = categories.filter(
    (c) => c.isCore || items.some((i) => i.category === c.slug),
  );
  const extraCategories = categories.filter((c) => !visibleCategories.includes(c));

  if (!hydrated) return <BuilderSkeleton />;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-labelledby="parts-heading" className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="parts-heading" className="text-xl font-semibold">
            Parts
          </h2>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm("Remove every part from this build?")) clear();
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Clear build
            </Button>
          )}
        </div>

        <ul className="divide-y rounded-xl border" data-testid="builder-parts">
          {visibleCategories.map((category) => {
            const rows = items.filter((i) => i.category === category.slug);
            return (
              <li key={category.slug} className="p-4" data-testid={`slot-${category.slug}`}>
                <div className="flex items-start gap-3">
                  <span className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md">
                    <CategoryIcon name={category.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{category.name}</h3>
                      {(rows.length === 0 || category.maxPerBuild !== 1) && (
                        <Button
                          asChild
                          size="sm"
                          variant={rows.length === 0 ? "default" : "outline"}
                        >
                          <Link href={`/catalog/${category.slug}`}>
                            <Plus className="size-4" aria-hidden />
                            {rows.length === 0 ? `Choose` : "Add"}
                            <span className="sr-only"> {category.name.toLowerCase()}</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                    {rows.map((item) => (
                      <PartRow
                        key={item.variantId}
                        item={item}
                        category={category}
                        view={view}
                        issues={issuesByVariant.get(item.variantId) ?? []}
                        locale={region.locale}
                      />
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {extraCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Add more:</span>
            {extraCategories.map((c) => (
              <Button key={c.slug} asChild size="sm" variant="outline">
                <Link href={`/catalog/${c.slug}`}>
                  <CategoryIcon name={c.icon} className="size-4" /> {c.name}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </section>

      {view && (
        <a
          href="#build-summary"
          className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur lg:hidden"
        >
          <Badge
            variant="outline"
            className={cn("gap-1", STATUS[view.compatibility.status].className)}
          >
            {STATUS[view.compatibility.status].label}
          </Badge>
          <Price
            value={view.price.grandTotal}
            locale={region.locale}
            className="text-lg font-bold"
          />
        </a>
      )}

      <aside
        id="build-summary"
        className="scroll-mt-20 space-y-4 pb-16 lg:sticky lg:top-20 lg:self-start lg:pb-0"
        aria-label="Build summary"
      >
        {items.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">Your build is empty.</p>
              <p className="text-muted-foreground">
                Start with a processor or a graphics card. Each part you add is checked against the
                rest.
              </p>
              <Button asChild className="w-full">
                <Link href="/catalog/cpu">Choose a processor</Link>
              </Button>
            </CardContent>
          </Card>
        ) : query.isError && !view ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle>Couldn&apos;t check this build</AlertTitle>
            <AlertDescription>
              <p>{query.error.message}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : !view ? (
          <SummarySkeleton />
        ) : (
          <Summary
            view={view}
            locale={region.locale}
            useCase={useCase}
            onUseCase={setUseCase}
            includeMarketplace={includeMarketplace}
            onIncludeMarketplace={setIncludeMarketplace}
            updating={query.isFetching}
            categoryNames={Object.fromEntries(categories.map((cat) => [cat.slug, cat.name]))}
          />
        )}
      </aside>
    </div>
  );
}

function PartRow({
  item,
  category,
  view,
  issues,
  locale,
}: {
  item: BuilderItem;
  category: BuilderCategory;
  view: BuildView | undefined;
  issues: CompatibilityIssue[];
  locale: string;
}) {
  const remove = useBuilder((s) => s.remove);
  const setQuantity = useBuilder((s) => s.setQuantity);
  const selectOffer = useBuilder((s) => s.selectOffer);
  const line = view?.price.lines.find((l) => l.variantId === item.variantId);
  const offers = view?.offersByVariant[item.variantId] ?? [];
  const product = view?.products[item.variantId];
  const link = line?.quote ? view?.offerLinks[line.quote.offer.id] : null;
  const worst =
    issues.find((i) => i.severity === "error") ?? issues.find((i) => i.severity === "warning");
  const single = category.maxPerBuild === 1;

  return (
    <div className="space-y-2" data-testid="part-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/products/${item.productSlug}`} className="font-medium hover:underline">
            {product?.name ?? item.name}
          </Link>
          {worst && (
            <p className={cn("flex items-center gap-1 text-xs", SEVERITY_CLASS[worst.severity])}>
              {(() => {
                const Icon = SEVERITY_ICON[worst.severity];
                return <Icon className="size-3.5 shrink-0" aria-hidden />;
              })()}
              {worst.title}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {line ? (
            line.status === "no_offers" ? (
              <span className="text-muted-foreground text-sm">Not sold here</span>
            ) : (
              <Price value={line.lineTotal} locale={locale} className="font-semibold" />
            )
          ) : (
            <Skeleton className="h-5 w-20" />
          )}
          {line && line.quantity > 1 && line.unitPrice && (
            <div className="text-muted-foreground text-xs">
              {line.quantity} × <Price value={line.unitPrice} locale={locale} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {offers.length > 0 && (
          <div className="min-w-0 flex-1 basis-56">
            <label className="sr-only" htmlFor={`offer-${item.variantId}`}>
              Retailer for {item.name}
            </label>
            <select
              id={`offer-${item.variantId}`}
              className={selectClass}
              value={line?.usedSelectedOffer ? (item.selectedOfferId ?? "") : ""}
              onChange={(e) => selectOffer(item.variantId, e.target.value || null)}
            >
              <option value="">
                Best offer
                {offers[0]
                  ? ` (${view?.retailers[offers[0].offer.retailerId]?.name ?? "retailer"})`
                  : ""}
              </option>
              {offers.map((o) => (
                <option key={o.offer.id} value={o.offer.id}>
                  {view?.retailers[o.offer.retailerId]?.name ?? "Retailer"}
                  {o.offer.listingType === "marketplace" ? " (marketplace)" : ""} ·{" "}
                  {formatMoney(o.price, locale)}
                  {o.availability === "unavailable" ? " · out of stock" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {line?.quote && <StockBadge status={line.quote.offer.stockStatus} />}
        {!single && (
          <div
            className="flex items-center rounded-md border"
            role="group"
            aria-label={`Quantity of ${item.name}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setQuantity(item.variantId, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" aria-hidden />
            </Button>
            <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setQuantity(item.variantId, item.quantity + 1)}
              disabled={item.quantity >= (category.maxPerBuild ?? MAX_QUANTITY)}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </div>
        )}
        {link && (
          <Button asChild variant="ghost" size="icon" className="size-8">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`View ${item.name} at the retailer (opens in a new tab)`}
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => remove(item.variantId)}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      {line?.selectedOfferMissing && (
        <p className="text-muted-foreground text-xs">
          Your chosen offer is no longer available, so the best current offer is shown.
        </p>
      )}
      {line?.cheaperAlternative && (
        <p className="text-muted-foreground text-xs">
          Cheaper at{" "}
          {view?.retailers[line.cheaperAlternative.offer.retailerId]?.name ?? "another retailer"}:{" "}
          <Price value={line.cheaperAlternative.price} locale={locale} />
        </p>
      )}
    </div>
  );
}

function Summary({
  view,
  locale,
  useCase,
  onUseCase,
  includeMarketplace,
  onIncludeMarketplace,
  updating,
  categoryNames,
}: {
  categoryNames: Record<string, string>;
  view: BuildView;
  locale: string;
  useCase: UseCase;
  onUseCase: (u: UseCase) => void;
  includeMarketplace: boolean;
  onIncludeMarketplace: (v: boolean) => void;
  updating: boolean;
}) {
  const { compatibility: c, price } = view;
  const status = STATUS[c.status];
  const score = c.performance.scores[useCase];
  const power = c.power;
  const issues = [...c.issues].sort(
    (a, b) =>
      ["error", "warning", "info"].indexOf(a.severity) -
      ["error", "warning", "info"].indexOf(b.severity),
  );

  return (
    <>
      <Card aria-busy={updating}>
        <CardHeader className="space-y-3">
          <Badge
            variant="outline"
            className={cn("w-fit gap-1.5 py-1 text-sm", status.className)}
            data-testid="build-status"
          >
            <status.Icon className="size-4" aria-hidden />
            {status.label}
          </Badge>
          <div>
            <CardTitle className="text-muted-foreground text-sm font-normal">Total</CardTitle>
            <Price
              value={price.grandTotal}
              locale={locale}
              className={cn("text-3xl font-bold transition-opacity", updating && "opacity-60")}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Parts</dt>
              <dd>
                <Price value={price.itemsTotal} locale={locale} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Shipping ({price.shipments.length}{" "}
                {price.shipments.length === 1 ? "order" : "orders"})
              </dt>
              <dd>
                {price.shippingTotal.amount === 0 ? (
                  "Free"
                ) : (
                  <Price value={price.shippingTotal} locale={locale} />
                )}
              </dd>
            </div>
            <div className="text-muted-foreground flex justify-between text-xs">
              <dt>VAT included</dt>
              <dd>
                <Price value={price.taxIncluded} locale={locale} />
              </dd>
            </div>
          </dl>
          {(price.unpricedCount > 0 || price.unavailableCount > 0) && (
            <p className="text-muted-foreground text-xs">
              {price.unpricedCount > 0 &&
                `${price.unpricedCount} ${price.unpricedCount === 1 ? "part isn't" : "parts aren't"} sold in this region and ${price.unpricedCount === 1 ? "is" : "are"} not in the total. `}
              {price.unavailableCount > 0 &&
                `${price.unavailableCount} ${price.unavailableCount === 1 ? "part is" : "parts are"} out of stock everywhere.`}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="marketplace" className="text-sm font-normal">
              Include marketplace sellers
            </Label>
            <Switch
              id="marketplace"
              checked={includeMarketplace}
              onCheckedChange={onIncludeMarketplace}
            />
          </div>
        </CardContent>
      </Card>

      {(issues.length > 0 || c.missingCategories.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compatibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {c.missingCategories.length > 0 && (
              <p className="text-muted-foreground">
                Still needed:{" "}
                {c.missingCategories.map((slug, i) => (
                  <span key={slug}>
                    {i > 0 && ", "}
                    <Link
                      href={`/catalog/${slug}`}
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      {(categoryNames[slug] ?? slug).toLowerCase()}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <ul className="space-y-3" data-testid="build-issues">
              {issues.map((issue, i) => {
                const Icon = SEVERITY_ICON[issue.severity];
                return (
                  <li key={`${issue.rule}-${i}`} className="flex gap-2">
                    <Icon
                      className={cn("mt-0.5 size-4 shrink-0", SEVERITY_CLASS[issue.severity])}
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        <span className="sr-only">{issue.severity}: </span>
                        {issue.title}
                      </p>
                      <p className="text-muted-foreground">{issue.message}</p>
                      {issue.suggestion && (
                        <p>
                          {issue.suggestion.category ? (
                            <Link
                              href={catalogHref(
                                issue.suggestion.category,
                                issue.suggestion.filters,
                              )}
                              className="text-primary font-medium underline underline-offset-4"
                            >
                              {issue.suggestion.message}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">
                              {issue.suggestion.message}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Power</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated peak draw</span>
            <span className="font-medium tabular-nums" data-testid="peak-power">
              {power.peakW} W
            </span>
          </div>
          {power.psuW !== null && power.loadRatio !== null ? (
            <>
              <Progress
                value={Math.min(100, power.loadRatio * 100)}
                aria-label={`Peak load is ${Math.round(power.loadRatio * 100)}% of the ${power.psuW} W power supply`}
              />
              <p className="text-muted-foreground text-xs">
                {Math.round(power.loadRatio * 100)}% of your {power.psuW} W power supply. We
                recommend at least {power.recommendedPsuW} W.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Recommended power supply: {power.recommendedPsuW} W or more.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1">
            <Label htmlFor="use-case" className="text-muted-foreground text-xs font-normal">
              Use case
            </Label>
            <select
              id="use-case"
              className={selectClass}
              value={useCase}
              onChange={(e) => onUseCase(e.target.value as UseCase)}
            >
              {Object.entries(USE_CASE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {score === null ? (
            <p className="text-muted-foreground text-xs">
              Add a processor and a graphics card (or a processor with integrated graphics) to
              estimate performance.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold tabular-nums">{score}</span>
                {c.performance.tier && (
                  <Badge variant="secondary" className="capitalize">
                    {c.performance.tier.replace("-", " ")}
                  </Badge>
                )}
              </div>
              <Progress value={score} aria-label={`Performance score ${score} out of 100`} />
            </>
          )}
          {c.performance.bottleneck.message && (
            <p
              className={cn(
                "text-xs",
                c.performance.bottleneck.risk === "high"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {c.performance.bottleneck.message}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Checking build">
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function BuilderSkeleton() {
  return (
    <div
      className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]"
      aria-busy="true"
      aria-label="Loading your build"
    >
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <SummarySkeleton />
    </div>
  );
}
