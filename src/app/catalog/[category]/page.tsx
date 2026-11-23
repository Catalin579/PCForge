import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoSubmitSelect } from "@/components/catalog/auto-submit-select";
import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseCatalogParams,
  SORT_OPTIONS,
  SPEC_FILTERS,
  type CatalogParams,
} from "@/lib/catalog/filters";
import {
  getBrandsForCategory,
  getCategory,
  getRetailersForRegion,
  searchProducts,
} from "@/lib/catalog/queries";
import { type CategorySlug } from "@/lib/catalog/specs";
import { getRegion } from "@/lib/region/server";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).category);
  return { title: category?.pluralName ?? "Catalog" };
}

const selectClass =
  "border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none";

function hrefWith(
  category: string,
  raw: Record<string, string | string[] | undefined>,
  changes: Record<string, string | null>,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    for (const value of Array.isArray(v) ? v : [v]) params.append(k, value);
  }
  for (const [k, v] of Object.entries(changes)) {
    params.delete(k);
    if (v !== null) params.set(k, v);
  }
  const qs = params.toString();
  return `/catalog/${category}${qs ? `?${qs}` : ""}`;
}

function activeFilters(
  category: CategorySlug,
  params: CatalogParams,
  brands: Array<{ slug: string; name: string }>,
) {
  const chips: Array<{ label: string; param: string }> = [];
  if (params.q) chips.push({ label: `“${params.q}”`, param: "q" });
  for (const b of params.brand)
    chips.push({ label: brands.find((x) => x.slug === b)?.name ?? b, param: "brand" });
  if (params.minPrice !== undefined)
    chips.push({ label: `From ${params.minPrice}`, param: "minPrice" });
  if (params.maxPrice !== undefined)
    chips.push({ label: `Up to ${params.maxPrice}`, param: "maxPrice" });
  if (params.inStock) chips.push({ label: "In stock", param: "inStock" });
  if (params.retailer) chips.push({ label: `Retailer: ${params.retailer}`, param: "retailer" });
  for (const f of SPEC_FILTERS[category] ?? []) {
    const v = params.specFilters[f.param];
    if (!v) continue;
    chips.push({
      label:
        f.kind === "boolean"
          ? f.label
          : `${f.label}: ${v.join(" or ")}${f.unit ? ` ${f.unit}` : ""}`,
      param: f.param,
    });
  }
  return chips;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category: slug }, raw] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  const parsed = parseCatalogParams(raw, category.slug);
  const region = await getRegion();
  const [results, brands, retailers] = await Promise.all([
    searchProducts(category.slug, parsed, region),
    getBrandsForCategory(category.slug),
    getRetailersForRegion(region.region.code),
  ]);
  const chips = activeFilters(category.slug, parsed, brands);
  const specFilters = (SPEC_FILTERS[category.slug] ?? []).filter(
    (f) => f.visible || parsed.specFilters[f.param],
  );

  const filterForm = (
    <form action={`/catalog/${category.slug}`} className="space-y-6" aria-label="Filters">
      <div className="space-y-2">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={parsed.q}
          placeholder={`Search ${category.pluralName.toLowerCase()}`}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Price ({region.currency})</legend>
        <div className="flex items-center gap-2">
          <Input
            name="minPrice"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Min"
            defaultValue={parsed.minPrice}
            aria-label="Minimum price"
          />
          <span aria-hidden>–</span>
          <Input
            name="maxPrice"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Max"
            defaultValue={parsed.maxPrice}
            aria-label="Maximum price"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="inStock"
            value="true"
            defaultChecked={parsed.inStock === "true"}
            className="accent-primary size-4"
          />
          In stock only
        </label>
      </fieldset>

      {specFilters.map((f) => {
        const current = parsed.specFilters[f.param]?.[0];
        if (f.kind === "boolean") {
          return (
            <label key={f.param} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={f.param}
                value="true"
                defaultChecked={current === "true"}
                className="accent-primary size-4"
              />
              {f.label}
            </label>
          );
        }
        if (f.kind === "number") {
          return (
            <div key={f.param} className="space-y-2">
              <Label htmlFor={`f-${f.param}`}>
                {f.label}
                {f.unit ? ` (${f.unit})` : ""}
              </Label>
              <Input
                id={`f-${f.param}`}
                name={f.param}
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={current}
              />
            </div>
          );
        }
        return (
          <div key={f.param} className="space-y-2">
            <Label htmlFor={`f-${f.param}`}>{f.label}</Label>
            <select
              id={`f-${f.param}`}
              name={f.param}
              defaultValue={parsed.specFilters[f.param]?.join(",") ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              {parsed.specFilters[f.param] && parsed.specFilters[f.param]!.length > 1 && (
                <option value={parsed.specFilters[f.param]!.join(",")}>
                  {parsed.specFilters[f.param]!.join(" or ")}
                </option>
              )}
              {f.options?.map((o) => (
                <option key={String(o)} value={String(o)}>
                  {String(o)}
                  {f.unit ? ` ${f.unit}` : ""}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {brands.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Brand</legend>
          {brands.map((b) => (
            <label key={b.slug} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="brand"
                value={b.slug}
                defaultChecked={parsed.brand.includes(b.slug)}
                className="accent-primary size-4"
              />
              <span className="flex-1">{b.name}</span>
              <span className="text-muted-foreground text-xs">{b.count}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="space-y-2">
        <Label htmlFor="retailer">Retailer</Label>
        <select
          id="retailer"
          name="retailer"
          defaultValue={parsed.retailer ?? ""}
          className={selectClass}
        >
          <option value="">Any retailer</option>
          {retailers.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {parsed.sort && <input type="hidden" name="sort" value={parsed.sort} />}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="outline">
          <Link href={`/catalog/${category.slug}`}>Reset</Link>
        </Button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <Link href="/catalog" className="hover:underline">
          Catalog
        </Link>{" "}
        / <span aria-current="page">{category.pluralName}</span>
      </nav>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{category.pluralName}</h1>
          <p className="text-muted-foreground mt-1">{category.description}</p>
        </div>
        <form action={`/catalog/${category.slug}`} className="flex items-center gap-2">
          {Object.entries(raw).flatMap(([k, v]) =>
            k === "sort" || k === "page" || v === undefined
              ? []
              : (Array.isArray(v) ? v : [v]).map((value, i) => (
                  <input key={`${k}-${i}`} type="hidden" name={k} value={value} />
                )),
          )}
          <Label htmlFor="sort" className="text-muted-foreground shrink-0 text-sm font-normal">
            Sort by
          </Label>
          <AutoSubmitSelect
            id="sort"
            name="sort"
            defaultValue={parsed.sort ?? (parsed.q ? "relevance" : "performance")}
            className={selectClass}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <Button type="submit" size="sm">
              Sort
            </Button>
          </noscript>
        </form>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <details className="group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
              <SlidersHorizontal className="size-4" aria-hidden /> Filters
              {chips.length > 0 && <span className="text-muted-foreground">({chips.length})</span>}
            </summary>
            <div className="mt-4">{filterForm}</div>
          </details>
          <div className="hidden lg:block">{filterForm}</div>
        </aside>

        <section aria-labelledby="results-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="results-heading" className="mr-2 text-sm font-medium" aria-live="polite">
              {results.total} {results.total === 1 ? "product" : "products"}
            </h2>
            {chips.map((c) => (
              <Link
                key={`${c.param}-${c.label}`}
                href={hrefWith(category.slug, raw, { [c.param]: null, page: null })}
                className="bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label} <X className="size-3" aria-hidden />
              </Link>
            ))}
          </div>

          {results.items.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">
                No {category.pluralName.toLowerCase()} match these filters.
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Try removing a filter or widening the price range.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/catalog/${category.slug}`}>Clear all filters</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} category={category} locale={region.locale} />
                </li>
              ))}
            </ul>
          )}

          {results.pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                aria-disabled={results.page <= 1}
                className={results.page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Link href={hrefWith(category.slug, raw, { page: String(results.page - 1) })}>
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </Link>
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {results.page} of {results.pageCount}
              </span>
              <Button
                asChild
                variant="outline"
                size="sm"
                aria-disabled={results.page >= results.pageCount}
                className={
                  results.page >= results.pageCount ? "pointer-events-none opacity-50" : ""
                }
              >
                <Link href={hrefWith(category.slug, raw, { page: String(results.page + 1) })}>
                  Next <ChevronRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
