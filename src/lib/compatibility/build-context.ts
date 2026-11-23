import { type CategorySlug } from "@/lib/catalog/specs";

import { type AnyBuildComponent, type BuildComponent } from "./types";

/** Typed access to a build's components by category. */
export class BuildContext {
  readonly components: AnyBuildComponent[];

  constructor(components: AnyBuildComponent[]) {
    this.components = components.filter((c) => c.quantity > 0);
  }

  /** All components of a category. */
  all<C extends CategorySlug>(category: C): BuildComponent<C>[] {
    return this.components.filter((c) => c.category === category) as unknown as BuildComponent<C>[];
  }

  /** The single component of a category (the first, if several were added). */
  one<C extends CategorySlug>(category: C): BuildComponent<C> | undefined {
    return this.all(category)[0];
  }

  has(category: CategorySlug): boolean {
    return this.components.some((c) => c.category === category);
  }

  /** Total units of a category, counting quantities. */
  count(category: CategorySlug): number {
    return this.all(category).reduce((n, c) => n + c.quantity, 0);
  }

  get isEmpty(): boolean {
    return this.components.length === 0;
  }
}
