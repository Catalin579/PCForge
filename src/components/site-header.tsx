import { Hammer } from "lucide-react";
import Link from "next/link";

import { BuilderLink } from "@/components/builder-link";
import { RegionSwitcher } from "@/components/region/region-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader({ email }: { email: string | null }) {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
          <Hammer className="text-primary size-5" aria-hidden />
          <span>PCForge</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/catalog">Catalog</Link>
          </Button>
          <BuilderLink />
        </nav>
        <div className="flex items-center gap-1">
          <RegionSwitcher />
          <ThemeToggle />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
