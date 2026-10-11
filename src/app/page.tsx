import HeroCarousel from "@/components/HeroCarousel";
import WeddingActions from "@/components/WeddingActions";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-white">
      <HeroCarousel />
      <WeddingActions />

      <footer className="bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
        <p className="mb-2 font-serif-display text-base italic text-marian-deep">
          &ldquo;Que a tua vida não seja uma vida estéril&rdquo; - São Josemaria Escrivá
        </p>
        <p>© 2026 Lucas &amp; Amanda</p>
      </footer>
    </main>
  );
}
