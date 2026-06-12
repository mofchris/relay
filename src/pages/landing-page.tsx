import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeaturesSection } from "@/components/features-section";
import { CallToAction } from "@/components/cta";
import { Footer } from "@/components/footer";

export function LandingPage() {
  return (
    <div className="min-h-svh animate-in bg-background fade-in duration-500 motion-reduce:animate-none">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <div className="py-16">
          <CallToAction />
        </div>
      </main>
      <Footer />
    </div>
  );
}
