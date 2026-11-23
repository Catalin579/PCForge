import { describe, expect, it } from "vitest";

import { priceBuild } from "./build-pricing";
import {
  quoteOffer,
  rankQuotes,
  selectBestOffer,
  type OfferRow,
  type PricingContext,
} from "./offers";

const ctx: PricingContext = {
  regionCode: "RO",
  displayCurrency: "RON",
  at: new Date("2026-11-23T12:00:00Z"),
  rates: [{ base: "EUR", quote: "RON", rate: 5, validAt: "2026-11-01T00:00:00Z" }],
  taxRules: [
    { regionCode: "RO", categorySlug: null, rate: 0.21, validFrom: "2025-08-01", validTo: null },
  ],
  retailerRegions: [
    {
      retailerId: "emag",
      regionCode: "RO",
      currencyCode: "RON",
      shippingCost: "0",
      freeShippingOver: "250",
      deliveryDaysMin: 1,
      deliveryDaysMax: 3,
      isActive: true,
    },
    {
      retailerId: "pcg",
      regionCode: "RO",
      currencyCode: "RON",
      shippingCost: "25",
      freeShippingOver: "500",
      deliveryDaysMin: 1,
      deliveryDaysMax: 2,
      isActive: true,
    },
    {
      retailerId: "altex",
      regionCode: "RO",
      currencyCode: "RON",
      shippingCost: "20",
      freeShippingOver: null,
      deliveryDaysMin: 2,
      deliveryDaysMax: 4,
      isActive: true,
    },
  ],
};

let n = 0;
function offer(
  partial: Partial<OfferRow> & Pick<OfferRow, "variantId" | "retailerId" | "price">,
): OfferRow {
  n += 1;
  return {
    id: `o${n}`,
    regionCode: "RO",
    currencyCode: "RON",
    priceIncludesTax: true,
    shippingCost: null,
    stockStatus: "in_stock",
    listingType: "retail",
    deliveryDaysMin: null,
    deliveryDaysMax: null,
    isActive: true,
    ...partial,
  };
}

describe("quoteOffer", () => {
  it("keeps tax-inclusive prices and extracts the VAT", () => {
    const q = quoteOffer(offer({ variantId: "cpu", retailerId: "pcg", price: "1210" }), "cpu", ctx);
    expect(q.price.amount).toBe(121000);
    expect(q.tax.amount).toBe(21000);
    expect(q.availability).toBe("available");
  });

  it("adds VAT to net prices and converts currency", () => {
    const q = quoteOffer(
      offer({
        variantId: "cpu",
        retailerId: "pcg",
        price: "100",
        currencyCode: "EUR",
        priceIncludesTax: false,
      }),
      "cpu",
      ctx,
    );
    // 100 EUR net → 121 EUR gross → 605 RON
    expect(q.price).toEqual({ amount: 60500, currency: "RON" });
    expect(q.listedPrice).toEqual({ amount: 10000, currency: "EUR" });
  });

  it("applies retailer shipping and free-shipping thresholds", () => {
    expect(
      quoteOffer(offer({ variantId: "a", retailerId: "pcg", price: "100" }), "cpu", ctx).shipping
        .amount,
    ).toBe(2500);
    expect(
      quoteOffer(offer({ variantId: "a", retailerId: "pcg", price: "600" }), "cpu", ctx).shipping
        .amount,
    ).toBe(0);
    expect(
      quoteOffer(
        offer({ variantId: "a", retailerId: "pcg", price: "1", shippingCost: "9.99" }),
        "cpu",
        ctx,
      ).shipping.amount,
    ).toBe(999);
  });

  it("falls back to retailer delivery estimates", () => {
    const q = quoteOffer(offer({ variantId: "a", retailerId: "altex", price: "10" }), "cpu", ctx);
    expect(q.deliveryDays).toEqual({ min: 2, max: 4 });
  });

  it("rejects offers from another region", () => {
    expect(() =>
      quoteOffer(
        offer({ variantId: "a", retailerId: "pcg", price: "1", regionCode: "DE" }),
        "cpu",
        ctx,
      ),
    ).toThrow();
  });
});

describe("best offer", () => {
  const quotes = [
    offer({
      id: "cheap-oos",
      variantId: "g",
      retailerId: "pcg",
      price: "900",
      stockStatus: "out_of_stock",
    }),
    offer({ id: "pcg", variantId: "g", retailerId: "pcg", price: "1000" }),
    offer({ id: "emag", variantId: "g", retailerId: "emag", price: "1010" }),
    offer({
      id: "mkt",
      variantId: "g",
      retailerId: "emag",
      price: "950",
      listingType: "marketplace",
    }),
    offer({
      id: "pre",
      variantId: "g",
      retailerId: "altex",
      price: "800",
      stockStatus: "preorder",
    }),
    offer({ id: "inactive", variantId: "g", retailerId: "altex", price: "1", isActive: false }),
  ].map((o) => quoteOffer(o, "gpu", ctx));

  it("prefers in-stock offers, then the lowest price including shipping", () => {
    // 950 marketplace (free shipping over 250) beats 1000 + 0 at PC Garage.
    expect(selectBestOffer(quotes)?.offer.id).toBe("mkt");
  });

  it("can exclude marketplace listings", () => {
    expect(selectBestOffer(quotes, { includeMarketplace: false })?.offer.id).toBe("pcg");
  });

  it("ranks orderable before unknown and out-of-stock, and drops inactive offers", () => {
    const order = rankQuotes(quotes).map((q) => q.offer.id);
    expect(order).toEqual(["mkt", "pcg", "emag", "pre", "cheap-oos"]);
  });

  it("can require something orderable", () => {
    const onlyOos = [quotes[0]!];
    expect(selectBestOffer(onlyOos)?.offer.id).toBe("cheap-oos");
    expect(selectBestOffer(onlyOos, { orderableOnly: true })).toBeNull();
  });

  it("breaks price ties by delivery time", () => {
    const tie = [
      offer({ id: "slow", variantId: "t", retailerId: "pcg", price: "600", deliveryDaysMax: 5 }),
      offer({ id: "fast", variantId: "t", retailerId: "pcg", price: "600", deliveryDaysMax: 1 }),
    ].map((o) => quoteOffer(o, "cpu", ctx));
    expect(selectBestOffer(tie)?.offer.id).toBe("fast");
  });
});

describe("priceBuild", () => {
  const offers = [
    offer({ id: "cpu-pcg", variantId: "cpu", retailerId: "pcg", price: "1500" }),
    offer({ id: "cpu-emag", variantId: "cpu", retailerId: "emag", price: "1550" }),
    offer({ id: "ram-pcg", variantId: "ram", retailerId: "pcg", price: "450" }),
    offer({ id: "fan-altex", variantId: "fan", retailerId: "altex", price: "50" }),
    offer({
      id: "fan-mkt",
      variantId: "fan",
      retailerId: "emag",
      price: "60",
      listingType: "marketplace",
      shippingCost: "15",
    }),
    offer({
      id: "case-oos",
      variantId: "case",
      retailerId: "pcg",
      price: "400",
      stockStatus: "out_of_stock",
    }),
    offer({ id: "de-offer", variantId: "cpu", retailerId: "pcg", price: "1", regionCode: "DE" }),
  ];

  it("totals the build with per-retailer shipping and included VAT", () => {
    const result = priceBuild(
      [
        { variantId: "cpu", categorySlug: "cpu", quantity: 1 },
        { variantId: "ram", categorySlug: "memory", quantity: 2 },
        { variantId: "fan", categorySlug: "case-fan", quantity: 3 },
      ],
      offers,
      ctx,
    );
    expect(result.lines.map((l) => l.quote?.offer.id)).toEqual(["cpu-pcg", "ram-pcg", "fan-altex"]);
    // 1500 + 2 x 450 + 3 x 50 = 2550 RON
    expect(result.itemsTotal).toEqual({ amount: 255000, currency: "RON" });
    // PC Garage shipment is 2400 (free over 500); Altex charges 20.
    expect(result.shipments).toHaveLength(2);
    expect(result.shippingTotal.amount).toBe(2000);
    expect(result.grandTotal.amount).toBe(257000);
    // VAT at 21 % contained in 2550 RON
    expect(result.taxIncluded.amount).toBeCloseTo(Math.round(255000 - 255000 / 1.21), -1);
    expect(result.unpricedCount).toBe(0);
  });

  it("uses the user's selected offer and points out a cheaper one", () => {
    const result = priceBuild(
      [{ variantId: "cpu", categorySlug: "cpu", quantity: 1, selectedOfferId: "cpu-emag" }],
      offers,
      ctx,
    );
    const line = result.lines[0]!;
    expect(line.usedSelectedOffer).toBe(true);
    expect(line.quote?.offer.id).toBe("cpu-emag");
    expect(line.cheaperAlternative?.offer.id).toBe("cpu-pcg");
  });

  it("falls back when the selected offer is gone, and ignores other regions", () => {
    const result = priceBuild(
      [{ variantId: "cpu", categorySlug: "cpu", quantity: 1, selectedOfferId: "de-offer" }],
      offers,
      ctx,
    );
    expect(result.lines[0]).toMatchObject({ selectedOfferMissing: true, usedSelectedOffer: false });
    expect(result.lines[0]!.quote?.offer.id).toBe("cpu-pcg");
  });

  it("ships marketplace listings separately with their own shipping", () => {
    const result = priceBuild(
      [{ variantId: "fan", categorySlug: "case-fan", quantity: 1, selectedOfferId: "fan-mkt" }],
      offers,
      ctx,
    );
    expect(result.shipments).toEqual([
      expect.objectContaining({
        retailerId: "emag",
        offerId: "fan-mkt",
        shipping: { amount: 1500, currency: "RON" },
      }),
    ]);
  });

  it("reports unavailable and unpriced items", () => {
    const result = priceBuild(
      [
        { variantId: "case", categorySlug: "case", quantity: 1 },
        { variantId: "ghost", categorySlug: "gpu", quantity: 1 },
      ],
      offers,
      ctx,
    );
    expect(result.lines.map((l) => l.status)).toEqual(["unavailable", "no_offers"]);
    expect(result.unavailableCount).toBe(1);
    expect(result.unpricedCount).toBe(1);
    expect(result.itemsTotal.amount).toBe(40000);
  });

  it("prices in another display currency", () => {
    const result = priceBuild([{ variantId: "ram", categorySlug: "memory", quantity: 1 }], offers, {
      ...ctx,
      displayCurrency: "EUR",
    });
    expect(result.itemsTotal).toEqual({ amount: 9000, currency: "EUR" });
    // PC Garage charges 25 RON below 500 RON → 5 EUR
    expect(result.shippingTotal).toEqual({ amount: 500, currency: "EUR" });
  });

  it("handles an empty build", () => {
    const result = priceBuild([], offers, ctx);
    expect(result.grandTotal).toEqual({ amount: 0, currency: "RON" });
    expect(result.lines).toEqual([]);
  });
});
