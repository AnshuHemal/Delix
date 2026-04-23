import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Logos } from "@/components/landing/logos";
import { Features } from "@/components/landing/features";
import { Testimonial } from "@/components/landing/testimonial";
import { FAQ } from "@/components/landing/faq";
import { Reviews } from "@/components/landing/reviews";
import { Blog } from "@/components/landing/blog";
import { Footer } from "@/components/landing/footer";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Logos />
      <Features />
      <Testimonial />
      <FAQ />
      <Reviews />
      <Blog />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
