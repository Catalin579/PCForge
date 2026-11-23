import { CircuitBoard, Globe2, ShieldCheck, Tags } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Globe2,
    title: "Your market, your prices",
    body: "Listings, retailers, VAT and delivery estimates for the country you shop in, in your currency.",
  },
  {
    icon: CircuitBoard,
    title: "Build part by part",
    body: "Pick a CPU, motherboard, memory, GPU and the rest, and watch the total and power draw update.",
  },
  {
    icon: ShieldCheck,
    title: "Compatibility checked",
    body: "Sockets, memory type, GPU length, cooler height, PSU wattage and connectors, M.2 slots and form factors.",
  },
  {
    icon: Tags,
    title: "Compare retailers",
    body: "Every offer side by side with stock status and price history, so you buy at the right moment.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          PCForge: build the right PC for where you live
        </h1>
        <p className="text-muted-foreground mt-4 text-lg text-pretty">
          Research components, check that they fit together, and compare real prices from retailers
          in your country.
        </p>
      </section>

      <section aria-labelledby="features" className="mt-14">
        <h2 id="features" className="sr-only">
          Features
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <CardHeader>
                  <Icon className="text-primary size-6" aria-hidden />
                  <CardTitle className="mt-2 text-base">{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
