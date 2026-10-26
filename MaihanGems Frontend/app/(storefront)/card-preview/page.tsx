import ProductCard from "@/components/ProductCard";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center golden-cloud-gallery p-6 sm:p-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <ProductCard
          category="Rings"
          name="Elysian Ring"
          material="Natural Diamond"
          carat="2.15 CT"
          price="$12,800"
          image="/images/elysian-ring.jpg"
          href="/products/elysian-ring"
        />
        <ProductCard
          category="Necklaces"
          name="Verdant Drop"
          material="Natural Emerald"
          carat="4.32 CT"
          price="$18,500"
          image="/images/verdant-drop.jpg"
          href="/products/verdant-drop"
        />
      </div>
    </main>
  );
}
