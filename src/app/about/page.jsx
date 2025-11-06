'use client';

import { FadeIn, SlideIn } from '@/components/ui/motion';
import Header from '@/components/sections/Header';

export default function About() {
  return (
    <div className="min-h-screen text-white">
      <Header />
      <div className="container mx-auto px-4 py-24 pt-32">
        <FadeIn className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
            About Xen.ai
          </h1>
          <SlideIn delay={0.2}>
            <p className="text-lg md:text-xl text-white/80 mb-6">
              Xen.ai is a next-generation AI-powered code editor designed to supercharge developer productivity. Our mission is to make coding seamless, collaborative, and intelligent by integrating advanced AI assistance, real-time teamwork, and a familiar, beautiful interface.
            </p>
            <p className="text-lg text-white/70">
              Built by developers for developers, Xen.ai empowers teams to work faster, smarter, and together—whether you're building solo or with a global team. Experience the future of coding with Xen.ai.
            </p>
          </SlideIn>
        </FadeIn>
      </div>
    </div>
  );
} 