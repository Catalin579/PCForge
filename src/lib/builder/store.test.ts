// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { useBuilder } from "./store";

const cpu = { variantId: "c1", productSlug: "cpu-1", name: "CPU 1", category: "cpu" as const };
const cpu2 = { variantId: "c2", productSlug: "cpu-2", name: "CPU 2", category: "cpu" as const };
const ssd = { variantId: "s1", productSlug: "ssd-1", name: "SSD", category: "storage" as const };

describe("builder store", () => {
  beforeEach(() => useBuilder.getState().clear());

  it("replaces single-per-build categories", () => {
    useBuilder.getState().add(cpu, { singlePerBuild: true });
    useBuilder.getState().add(cpu2, { singlePerBuild: true });
    expect(useBuilder.getState().items.map((i) => i.variantId)).toEqual(["c2"]);
  });

  it("stacks multi-item categories up to the category limit", () => {
    const add = () => useBuilder.getState().add(ssd, { singlePerBuild: false, max: 3 });
    add();
    add();
    add();
    add();
    expect(useBuilder.getState().items).toEqual([expect.objectContaining({ variantId: "s1", quantity: 3 })]);
  });

  it("sets quantity, removes at zero, selects offers and clears", () => {
    useBuilder.getState().add(ssd, { singlePerBuild: false });
    useBuilder.getState().setQuantity("s1", 4);
    expect(useBuilder.getState().items[0]!.quantity).toBe(4);
    useBuilder.getState().selectOffer("s1", "o1");
    expect(useBuilder.getState().items[0]!.selectedOfferId).toBe("o1");
    useBuilder.getState().setQuantity("s1", 0);
    expect(useBuilder.getState().items).toEqual([]);
  });

  it("loads a saved build", () => {
    useBuilder.getState().load([{ ...cpu, quantity: 1 }], { buildId: "b1", buildName: "Mine" });
    expect(useBuilder.getState()).toMatchObject({ buildId: "b1", buildName: "Mine", items: [{ variantId: "c1" }] });
  });
});
