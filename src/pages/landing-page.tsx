import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeaturesSection } from "@/components/features-section";
import { CallToAction } from "@/components/cta";
import { Footer } from "@/components/footer";

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
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
