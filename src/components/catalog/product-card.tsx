import { Cpu } from "lucide-react";
import Link from "next/link";

import { Price } from "@/components/price";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { specSummary } from "@/lib/catalog/format";
import { type Category, type ProductCard as ProductCardData } from "@/lib/catalog/queries";

import { AddToBuildButton } from "./add-to-build-button";

export function ProductCard({
  product,
  category,
  locale,
}: {
  product: ProductCardData;
  category: Category;
  locale: string;
}) {
  const available = product.inStockCount > 0;
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0" data-testid="product-card">
      <Link href={`/products/${product.slug}`} className="group flex flex-1 flex-col gap-3 p-4">
        <div
          className="bg-muted text-muted-foreground flex aspect-[16/9] items-center justify-center rounded-md sm:aspect-[4/3]"
          aria-hidden
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary retailer/CDN hosts
            <img
              src={product.imageUrl}
              alt=""
              className="h-full w-full rounded-md object-contain"
              loading="lazy"
            />
          ) : (
            <Cpu className="size-10 opacity-40" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{product.brandName}</p>
          <h3 className="leading-snug font-medium group-hover:underline">{product.name}</h3>
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {specSummary(product.category, product.specs)}
          </p>
        </div>
      </Link>
      <CardContent className="px-4 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-muted-foreground text-xs">
              {product.offerCount > 1 ? "from " : ""}
            </span>
            <Price value={product.fromPrice} locale={locale} className="text-lg font-semibold" />
          </div>
          <span
            className={
              available
                ? "text-xs text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground text-xs"
            }
          >
            {product.offerCount === 0
              ? "Not sold here"
              : available
                ? `In stock at ${product.inStockCount} ${product.inStockCount === 1 ? "store" : "stores"}`
                : "Out of stock"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4">
        {product.defaultVariantId && (
          <AddToBuildButton
            variantId={product.defaultVariantId}
            productSlug={product.slug}
            name={product.name}
            category={product.category}
            categoryName={category.name}
            maxPerBuild={category.maxPerBuild}
            className="w-full"
          />
        )}
      </CardFooter>
    </Card>
  );
}
