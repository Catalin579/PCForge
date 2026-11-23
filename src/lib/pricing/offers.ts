import { convert, type ExchangeRate } from "./exchange";
import { add, money, type Money } from "./money";
import { addTax, findTaxRule, splitGross, type TaxRule } from "./tax";

export type StockStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "backorder" | "unknown";
export type ListingType = "retail" | "marketplace";

/** An `offers` row (numeric columns may arrive as strings). */
export type OfferRow = {
  id: string;
  variantId: string;
  retailerId: string;
  regionCode: string;
  currencyCode: string;
  price: string | number;
  priceIncludesTax: boolean;
  shippingCost: string | number | null;
  stockStatus: StockStatus;
  listingType: ListingType;
  url?: string | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  isActive: boolean;
};

/** A `retailer_regions` row. */
export type RetailerRegionRow = {
  retailerId: string;
  regionCode: string;
  currencyCode: string;
  shippingCost: string | number;
  freeShippingOver: string | number | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  isActive: boolean;
};

export type PricingContext = {
  regionCode: string;
  /** Currency prices are shown in; usually the region default. */
  displayCurrency: string;
  rates: ExchangeRate[];
  taxRules: TaxRule[];
  retailerRegions: RetailerRegionRow[];
  /** Moment for exchange and tax rates; pass it explicitly for reproducible results. */
  at: Date;
};

/** An offer normalised to the display currency with tax made explicit. */
export type OfferQuote = {
  offer: OfferRow;
  /** Tax-inclusive unit price in the display currency. */
  price: Money;
  /** VAT contained in `price`. */
  tax: Money;
  taxRate: number;
  /** Price as listed by the retailer, in its own currency. */
  listedPrice: Money;
  /** Shipping if this item were bought alone, in the display currency. */
  shipping: Money;
  /** Price plus standalone shipping: the fair number for ranking offers. */
  landedPrice: Money;
  availability: "available" | "orderable" | "unknown" | "unavailable";
  deliveryDays: { min: number | null; max: number | null };
};

const AVAILABILITY: Record<StockStatus, OfferQuote["availability"]> = {
  in_stock: "available",
  low_stock: "available",
  preorder: "orderable",
  backorder: "orderable",
  unknown: "unknown",
  out_of_stock: "unavailable",
};

const AVAILABILITY_RANK: Record<OfferQuote["availability"], number> = {
  available: 0,
  orderable: 1,
  unknown: 2,
  unavailable: 3,
};

export function findRetailerRegion(
  ctx: PricingContext,
  retailerId: string,
): RetailerRegionRow | undefined {
  return ctx.retailerRegions.find(
    (r) => r.retailerId === retailerId && r.regionCode === ctx.regionCode && r.isActive,
  );
}

/**
 * Normalise one offer: make the price tax-inclusive, convert to the display
 * currency and work out standalone shipping and delivery.
 */
export function quoteOffer(
  offer: OfferRow,
  categorySlug: string | null,
  ctx: PricingContext,
): OfferQuote {
  if (offer.regionCode !== ctx.regionCode) {
    throw new Error(`Offer ${offer.id} is for ${offer.regionCode}, not ${ctx.regionCode}`);
  }
  const rule = findTaxRule(ctx.taxRules, ctx.regionCode, categorySlug, ctx.at);
  const listed = money(offer.price, offer.currencyCode);
  const grossListed = offer.priceIncludesTax ? listed : addTax(listed, rule.rate).gross;

  const price = convert(grossListed, ctx.displayCurrency, ctx.rates, ctx.at);
  const { tax } = splitGross(price, rule.rate);

  const rr = findRetailerRegion(ctx, offer.retailerId);
  let shippingListed: Money;
  if (offer.shippingCost !== null) {
    shippingListed = money(offer.shippingCost, offer.currencyCode);
  } else if (rr) {
    const threshold =
      rr.freeShippingOver === null ? null : money(rr.freeShippingOver, rr.currencyCode);
    const grossInRetailerCurrency = convert(grossListed, rr.currencyCode, ctx.rates, ctx.at);
    shippingListed =
      threshold && grossInRetailerCurrency.amount >= threshold.amount
        ? money(0, rr.currencyCode)
        : money(rr.shippingCost, rr.currencyCode);
  } else {
    shippingListed = money(0, offer.currencyCode);
  }
  const shipping = convert(shippingListed, ctx.displayCurrency, ctx.rates, ctx.at);

  return {
    offer,
    price,
    tax,
    taxRate: rule.rate,
    listedPrice: listed,
    shipping,
    landedPrice: add(price, shipping),
    availability: AVAILABILITY[offer.stockStatus],
    deliveryDays: {
      min: offer.deliveryDaysMin ?? rr?.deliveryDaysMin ?? null,
      max: offer.deliveryDaysMax ?? rr?.deliveryDaysMax ?? null,
    },
  };
}

export type BestOfferOptions = {
  /** Include third-party marketplace listings. Default true. */
  includeMarketplace?: boolean;
  /** Only consider offers that can be bought now (in stock or orderable). Default false. */
  orderableOnly?: boolean;
};

/**
 * Rank quotes best first: buyable now, then lowest landed price (price +
 * shipping), then fastest delivery, then retail over marketplace.
 */
export function rankQuotes(quotes: OfferQuote[], options: BestOfferOptions = {}): OfferQuote[] {
  const { includeMarketplace = true, orderableOnly = false } = options;
  return quotes
    .filter((q) => q.offer.isActive)
    .filter((q) => includeMarketplace || q.offer.listingType === "retail")
    .filter(
      (q) => !orderableOnly || q.availability === "available" || q.availability === "orderable",
    )
    .sort(
      (a, b) =>
        AVAILABILITY_RANK[a.availability] - AVAILABILITY_RANK[b.availability] ||
        a.landedPrice.amount - b.landedPrice.amount ||
        (a.deliveryDays.max ?? 99) - (b.deliveryDays.max ?? 99) ||
        Number(a.offer.listingType === "marketplace") -
          Number(b.offer.listingType === "marketplace") ||
        a.offer.id.localeCompare(b.offer.id),
    );
}

export function selectBestOffer(
  quotes: OfferQuote[],
  options: BestOfferOptions = {},
): OfferQuote | null {
  return rankQuotes(quotes, options)[0] ?? null;
}
