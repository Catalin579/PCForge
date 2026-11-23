import { ExternalLink, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToBuildButton } from "@/components/catalog/add-to-build-button";
import { CategoryIcon } from "@/components/catalog/category-icon";
import { StockBadge } from "@/components/catalog/stock-badge";
import { Price } from "@/components/price";
import { PriceHistoryChart } from "@/components/product/price-history-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deliveryLabel, specRows, specSummary } from "@/lib/catalog/format";
import {
  getAlternatives,
  getCategory,
  getPriceHistory,
  getProductBySlug,
  getVariantOffers,
} from "@/lib/catalog/queries";
import { tierForScore } from "@/lib/compatibility";
import { getRegion } from "@/lib/region/server";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description ?? specSummary(product.category, product.specs),
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const requested = typeof sp.variant === "string" ? sp.variant : undefined;
  const variant = product.variants.find((v) => v.id === requested) ?? product.variants[0];
  const [category, region] = await Promise.all([getCategory(product.category), getRegion()]);
  if (!category) notFound();

  const [offers, history, alternatives] = await Promise.all([
    variant ? getVariantOffers(variant.id, product.category, region) : Promise.resolve([]),
    variant ? getPriceHistory(variant.id, region) : Promise.resolve([]),
    getAlternatives(product, region),
  ]);
  const best = offers[0];
  const rows = specRows(product.category, variant?.specs ?? product.specs);
  const tier = product.performanceScore !== null ? tierForScore(product.performanceScore) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <Link href="/catalog" className="hover:underline">
          Catalog
        </Link>{" "}
        /{" "}
        <Link href={`/catalog/${category.slug}`} className="hover:underline">
          {category.pluralName}
        </Link>{" "}
        / <span aria-current="page">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row">
            <div
              className="bg-muted text-muted-foreground flex aspect-[2/1] w-full shrink-0 items-center justify-center rounded-xl sm:aspect-square sm:w-48"
              aria-hidden
            >
              {product.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary retailer/CDN hosts
                <img
                  src={product.imageUrls[0]}
                  alt=""
                  className="h-full w-full rounded-xl object-contain"
                />
              ) : (
                <CategoryIcon name={category.icon} className="size-14 opacity-40" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">{product.brand.name}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{category.name}</Badge>
                {tier && product.performanceScore !== null && (
                  <Badge
                    variant="outline"
                    title="Relative performance score within its category (0–100)"
                  >
                    Performance {product.performanceScore} · {tier.replace("-", " ")}
                  </Badge>
                )}
                {product.powerDrawW !== null && (
                  <Badge variant="outline">{product.powerDrawW} W typical draw</Badge>
                )}
                {product.rating.count > 0 && product.rating.average !== null && (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                    {Number(product.rating.average).toFixed(1)} ({product.rating.count})
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-muted-foreground max-w-prose">{product.description}</p>
              )}
            </div>
          </header>

          {/* On small screens the price card sits at the bottom, so repeat the key action here. */}
          <div className="flex items-center justify-between gap-4 rounded-xl border p-4 lg:hidden">
            <div>
              <p className="text-muted-foreground text-xs">
                {best ? `Best price at ${best.retailer.name}` : "Price"}
              </p>
              <Price value={best?.price} locale={region.locale} className="text-xl font-bold" />
            </div>
            {variant && (
              <AddToBuildButton
                variantId={variant.id}
                productSlug={product.slug}
                name={product.name}
                category={product.category}
                categoryName={category.name}
                maxPerBuild={category.maxPerBuild}
              />
            )}
          </div>

          {product.variants.length > 1 && (
            <section aria-labelledby="variants-heading" className="space-y-2">
              <h2 id="variants-heading" className="text-sm font-medium">
                Variant
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <Button
                    key={v.id}
                    asChild
                    size="sm"
                    variant={v.id === variant?.id ? "default" : "outline"}
                  >
                    <Link
                      href={`/products/${product.slug}?variant=${v.id}`}
                      aria-current={v.id === variant?.id ? "true" : undefined}
                      scroll={false}
                    >
                      {v.label ?? v.sku}
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="offers-heading" className="space-y-3">
            <h2 id="offers-heading" className="text-xl font-semibold">
              Where to buy in {region.region.name}
            </h2>
            {offers.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                No retailer in {region.region.name} lists this product right now. Try another region
                or check back later.
              </p>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retailer</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Shipping</TableHead>
                      <TableHead className="hidden md:table-cell">Availability</TableHead>
                      <TableHead>
                        <span className="sr-only">Link</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o, i) => (
                      <TableRow key={o.offer.id} data-testid="offer-row">
                        <TableCell>
                          <div className="font-medium">{o.retailer.name}</div>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                            {i === 0 && o.availability === "available" && (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Best price
                              </span>
                            )}
                            {o.offer.listingType === "marketplace" && (
                              <span>Marketplace seller</span>
                            )}
                            <span className="md:hidden">
                              <StockBadge status={o.offer.stockStatus} />
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Price value={o.price} locale={region.locale} className="font-semibold" />
                          {o.listedPrice.currency !== o.price.currency && (
                            <div className="text-muted-foreground text-xs">
                              <Price value={o.listedPrice} locale={region.locale} /> listed
                            </div>
                          )}
                          <div className="text-muted-foreground text-xs sm:hidden">
                            {o.shipping.amount === 0 ? (
                              "Free shipping"
                            ) : (
                              <>
                                + <Price value={o.shipping} locale={region.locale} /> shipping
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          {o.shipping.amount === 0 ? (
                            <span className="text-muted-foreground">Free</span>
                          ) : (
                            <Price value={o.shipping} locale={region.locale} />
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col items-start gap-1">
                            <StockBadge status={o.offer.stockStatus} />
                            {deliveryLabel(o.deliveryDays.min, o.deliveryDays.max) && (
                              <span className="text-muted-foreground text-xs">
                                Delivery {deliveryLabel(o.deliveryDays.min, o.deliveryDays.max)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {o.link && (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={o.link}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                aria-label={`View at ${o.retailer.name} (opens in a new tab)`}
                              >
                                View <ExternalLink className="size-3.5" aria-hidden />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Prices include VAT and are shown in {region.currency}. Converted prices use the latest
              exchange rate; the retailer charges its listed price.
            </p>
          </section>

          <section aria-labelledby="history-heading" className="space-y-3">
            <h2 id="history-heading" className="text-xl font-semibold">
              Price history
            </h2>
            <PriceHistoryChart points={history} locale={region.locale} />
          </section>

          <section aria-labelledby="specs-heading" className="space-y-3">
            <h2 id="specs-heading" className="text-xl font-semibold">
              Specifications
            </h2>
            <dl className="divide-y rounded-xl border">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-sm">
                <dt className="text-muted-foreground">Model</dt>
                <dd>{product.model}</dd>
              </div>
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-sm"
                >
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
              {variant?.mpn && (
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">Part number</dt>
                  <dd className="break-all">{variant.mpn}</dd>
                </div>
              )}
              {product.releaseDate && (
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">Released</dt>
                  <dd>
                    {new Date(product.releaseDate).toLocaleDateString(region.locale, {
                      year: "numeric",
                      month: "long",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="hidden lg:flex">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">
                {best ? "Best price" : "Price"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Price value={best?.price} locale={region.locale} className="text-3xl font-bold" />
                {best && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    at {best.retailer.name}
                    {best.shipping.amount > 0 ? (
                      <>
                        {" "}
                        + <Price value={best.shipping} locale={region.locale} /> shipping
                      </>
                    ) : (
                      ", free shipping"
                    )}
                  </p>
                )}
              </div>
              {variant && (
                <AddToBuildButton
                  variantId={variant.id}
                  productSlug={product.slug}
                  name={product.name}
                  category={product.category}
                  categoryName={category.name}
                  maxPerBuild={category.maxPerBuild}
                  size="default"
                  className="w-full"
                />
              )}
              <p className="text-muted-foreground text-xs">
                Compatibility with your other parts is checked in the builder.
              </p>
            </CardContent>
          </Card>

          {alternatives.length > 0 && (
            <section aria-labelledby="alternatives-heading" className="space-y-3">
              <h2 id="alternatives-heading" className="font-semibold">
                Similar {category.pluralName.toLowerCase()}
              </h2>
              <ul className="divide-y rounded-xl border">
                {alternatives.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/products/${a.slug}`}
                      className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {a.brandName}
                          {a.performanceScore !== null
                            ? ` · performance ${a.performanceScore}`
                            : ""}
                        </span>
                      </span>
                      <Price
                        value={a.fromPrice}
                        locale={region.locale}
                        className="shrink-0 font-medium"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
