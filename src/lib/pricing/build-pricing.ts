import { convert } from "./exchange";
import { add, money, multiply, sum, zero, type Money } from "./money";
import {
  findRetailerRegion,
  quoteOffer,
  rankQuotes,
  type BestOfferOptions,
  type OfferQuote,
  type OfferRow,
  type PricingContext,
} from "./offers";

export type BuildItemInput = {
  variantId: string;
  categorySlug: string;
  quantity: number;
  /** The offer the user picked; otherwise the best offer is used. */
  selectedOfferId?: string | null;
};

export type LineStatus =
  /** Priced from an offer that can be bought now. */
  | "ok"
  /** Priced, but the chosen offer is pre-order, backorder or unknown stock. */
  | "limited"
  /** Priced from an out-of-stock offer because nothing better exists. */
  | "unavailable"
  /** No offers in this region. Not included in totals. */
  | "no_offers";

export type PricedLine = {
  variantId: string;
  categorySlug: string;
  quantity: number;
  status: LineStatus;
  quote: OfferQuote | null;
  /** True when the user's selected offer was used. */
  usedSelectedOffer: boolean;
  /** The user picked an offer that no longer exists or is inactive. */
  selectedOfferMissing: boolean;
  unitPrice: Money | null;
  lineTotal: Money | null;
  /** Cheapest alternative when the selected offer is not the cheapest. */
  cheaperAlternative: OfferQuote | null;
};

export type Shipment = {
  retailerId: string;
  /** Marketplace listings ship separately from the retailer's own stock. */
  offerId: string | null;
  itemsTotal: Money;
  shipping: Money;
  freeShippingApplied: boolean;
};

export type BuildPrice = {
  currency: string;
  lines: PricedLine[];
  shipments: Shipment[];
  itemsTotal: Money;
  shippingTotal: Money;
  /** VAT contained in itemsTotal. */
  taxIncluded: Money;
  grandTotal: Money;
  /** Items without any offer in the region (not in the totals). */
  unpricedCount: number;
  /** Lines whose chosen offer is out of stock. */
  unavailableCount: number;
};

/**
 * Price a whole build in one region and currency.
 *
 * Each line uses the user's selected offer when it is still valid, otherwise
 * the best offer (see rankQuotes). Shipping is charged once per shipment: one
 * per retailer for retail stock, one per marketplace listing, with the
 * retailer's free-shipping threshold applied to the shipment total.
 */
export function priceBuild(
  items: BuildItemInput[],
  offers: OfferRow[],
  ctx: PricingContext,
  options: BestOfferOptions = {},
): BuildPrice {
  const currency = ctx.displayCurrency.toUpperCase();
  const offersByVariant = new Map<string, OfferRow[]>();
  for (const o of offers) {
    if (o.regionCode !== ctx.regionCode || !o.isActive) continue;
    const list = offersByVariant.get(o.variantId) ?? [];
    list.push(o);
    offersByVariant.set(o.variantId, list);
  }

  const lines: PricedLine[] = items
    .filter((i) => i.quantity > 0)
    .map((item) => {
      const quotes = (offersByVariant.get(item.variantId) ?? []).map((o) =>
        quoteOffer(o, item.categorySlug, ctx),
      );
      const ranked = rankQuotes(quotes, options);
      const selected = item.selectedOfferId
        ? quotes.find((q) => q.offer.id === item.selectedOfferId)
        : undefined;
      const quote = selected ?? ranked[0] ?? null;

      const base = {
        variantId: item.variantId,
        categorySlug: item.categorySlug,
        quantity: item.quantity,
        usedSelectedOffer: Boolean(selected),
        selectedOfferMissing: Boolean(item.selectedOfferId) && !selected,
      };
      if (!quote) {
        return {
          ...base,
          status: "no_offers",
          quote: null,
          unitPrice: null,
          lineTotal: null,
          cheaperAlternative: null,
        };
      }

      const cheapestBuyable = ranked.find(
        (q) => q.availability === "available" || q.availability === "orderable",
      );
      const cheaperAlternative =
        selected &&
        cheapestBuyable &&
        cheapestBuyable.landedPrice.amount < selected.landedPrice.amount
          ? cheapestBuyable
          : null;

      return {
        ...base,
        status:
          quote.availability === "available"
            ? "ok"
            : quote.availability === "unavailable"
              ? "unavailable"
              : "limited",
        quote,
        unitPrice: quote.price,
        lineTotal: multiply(quote.price, item.quantity),
        cheaperAlternative,
      };
    });

  // Group priced lines into shipments.
  const groups = new Map<
    string,
    { retailerId: string; offerId: string | null; lines: PricedLine[] }
  >();
  for (const line of lines) {
    if (!line.quote) continue;
    const o = line.quote.offer;
    const offerId = o.listingType === "marketplace" ? o.id : null;
    const key = `${o.retailerId}|${offerId ?? "retail"}`;
    const group = groups.get(key) ?? { retailerId: o.retailerId, offerId, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  }

  const shipments: Shipment[] = [...groups.values()].map((g) => {
    const itemsTotal = sum(
      g.lines.map((l) => l.lineTotal!),
      currency,
    );
    const explicit = g.lines
      .map((l) => l.quote!.offer)
      .filter((o) => o.shippingCost !== null)
      .map((o) => convert(money(o.shippingCost!, o.currencyCode), currency, ctx.rates, ctx.at));
    const rr = findRetailerRegion(ctx, g.retailerId);

    let shipping = zero(currency);
    let freeShippingApplied = false;
    if (explicit.length > 0) {
      // One parcel: charge the highest per-offer shipping once.
      shipping = explicit.reduce((a, b) => (b.amount > a.amount ? b : a));
    } else if (rr) {
      const threshold =
        rr.freeShippingOver === null ? null : money(rr.freeShippingOver, rr.currencyCode);
      const totalInRetailerCurrency = convert(itemsTotal, rr.currencyCode, ctx.rates, ctx.at);
      if (threshold && totalInRetailerCurrency.amount >= threshold.amount) {
        freeShippingApplied = true;
      } else {
        shipping = convert(money(rr.shippingCost, rr.currencyCode), currency, ctx.rates, ctx.at);
      }
    }
    return {
      retailerId: g.retailerId,
      offerId: g.offerId,
      itemsTotal,
      shipping,
      freeShippingApplied,
    };
  });

  const priced = lines.filter((l) => l.lineTotal !== null);
  const itemsTotal = sum(
    priced.map((l) => l.lineTotal!),
    currency,
  );
  const taxIncluded = sum(
    priced.map((l) => multiply(l.quote!.tax, l.quantity)),
    currency,
  );
  const shippingTotal = sum(
    shipments.map((s) => s.shipping),
    currency,
  );

  return {
    currency,
    lines,
    shipments,
    itemsTotal,
    shippingTotal,
    taxIncluded,
    grandTotal: add(itemsTotal, shippingTotal),
    unpricedCount: lines.filter((l) => l.status === "no_offers").length,
    unavailableCount: lines.filter((l) => l.status === "unavailable").length,
  };
}
