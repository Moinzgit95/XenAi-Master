"use client";

import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen text-white">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}