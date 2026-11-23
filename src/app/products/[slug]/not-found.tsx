import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="text-muted-foreground mt-2">It may have been removed or renamed.</p>
      <Button asChild className="mt-6">
        <Link href="/catalog">Browse the catalog</Link>
      </Button>
    </div>
  );
}
