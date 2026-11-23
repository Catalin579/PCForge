import type { Metadata } from "next";
import Link from "next/link";

import { CategoryIcon } from "@/components/catalog/category-icon";
import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseCatalogParams } from "@/lib/catalog/filters";
import { getCategories, searchProducts } from "@/lib/catalog/queries";
import { getRegion } from "@/lib/region/server";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseCatalogParams(raw, null);
  const [categories, region] = await Promise.all([getCategories(), getRegion()]);
  const results = params.q ? await searchProducts(null, params, region) : null;
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Component catalog</h1>
          <p className="text-muted-foreground mt-1">
            Prices and stock for {region.region.name}, in {region.currency}.
          </p>
        </div>
        <form role="search" action="/catalog" className="flex w-full gap-2 sm:w-96">
          <label htmlFor="catalog-search" className="sr-only">
            Search all components
          </label>
          <Input
            id="catalog-search"
            name="q"
            type="search"
            placeholder="Search, e.g. 7800X3D or RTX 5070"
            defaultValue={params.q}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {results ? (
        <section aria-labelledby="results-heading" className="mt-8">
          <h2 id="results-heading" className="text-lg font-semibold">
            {results.total} {results.total === 1 ? "result" : "results"} for “{params.q}”
          </h2>
          {results.items.length === 0 ? (
            <p className="text-muted-foreground mt-4">
              Nothing matched. Try a shorter search or browse a category below.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {results.items.map((p) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    category={bySlug.get(p.category)!}
                    locale={region.locale}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="text-lg font-semibold">
          Browse by category
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/catalog/${c.slug}`}
                className="block h-full rounded-xl focus-visible:outline-2"
              >
                <Card className="hover:bg-accent/50 h-full transition-colors">
                  <CardHeader>
                    <CategoryIcon name={c.icon} className="text-primary size-6" />
                    <CardTitle className="mt-2 text-base">{c.pluralName}</CardTitle>
                    <CardDescription>{c.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
