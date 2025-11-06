'use client';

import { FadeIn, SlideIn } from '@/components/ui/motion';
import Header from '@/components/sections/Header';

export default function Privacy() {
  return (
    <div className="min-h-screen text-white">
      <Header />
      <div className="container mx-auto px-4 py-24 pt-32">
        <FadeIn className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
            Privacy Policy
          </h1>
          <SlideIn delay={0.2}>
            <p className="text-lg md:text-xl text-white/80 mb-6">
              Your privacy is our top priority. Xen.ai never shares your code or personal data with third parties. All your workspaces and files are encrypted and securely stored.
            </p>
            <p className="text-lg text-white/70">
              We are committed to transparency and data protection. You are always in control of your data, and can delete your account or export your information at any time. For questions, contact us at <a href="mailto:syedabdulla442@gmail.com" className="underline text-blue-400">syedabdulla442@gmail.com</a>.
            </p>
          </SlideIn>
        </FadeIn>
      </div>
    </div>
  );
} 