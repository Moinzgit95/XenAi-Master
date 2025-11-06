'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FadeIn, ScaleIn, SlideIn, StaggerContainer, StaggerItem, GradientButton } from '@/components/ui/motion';
import { TextAnimate } from '@/registry/magicui/text-animate';

export default function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 overflow-hidden">
      {/* Removed gradient overlay so the site-wide DarkVeil background is visible */}

      {/* Content */}
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <FadeIn className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <TextAnimate
              animation="blurInUp"
              by="character"
              once
              clip
              stagger={0.08}
              duration={2.0}
              delay={0}
              className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              The AI Code Editor
            </TextAnimate>
          </h1>
          <div className="mb-10">
            <p className="text-lg md:text-xl text-white/80">
              <TextAnimate
                animation="blurInUp"
                by="character"
                once
                stagger={0.03}
                duration={0.9}
                delay={0}
              >
                Built to make you extraordinarily productive, Xen.ai is the best way to code with AI.
              </TextAnimate>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <GradientButton delay={0.3} asChild>
              <Link href="/dashboard">
                <Button className="w-full sm:w-auto flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 1.5c-1.921 0-3.816.111-5.68.327-1.497.174-2.57 1.46-2.57 2.93V21.5h16.5V4.757c0-1.47-1.073-2.756-2.57-2.93A45.911 45.911 0 0012 1.5zm-.97 6.53a.75.75 0 10-1.06-1.06L7.72 9.22a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06l-.97-.97h3.065a1.875 1.875 0 010 3.75H12a.75.75 0 000 1.5h1.125a3.375 3.375 0 100-6.75h-3.065l.97-.97z" />
                  </svg>
                  <span>OPEN EDITOR</span>
                </Button>
              </Link>
            </GradientButton>
            <GradientButton delay={0.4} asChild>
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto uppercase">
                  LOGIN
                </Button>
              </Link>
            </GradientButton>
            <GradientButton delay={0.5} asChild>
              <Link href="/register">
                <Button variant="outline" className="w-full sm:w-auto uppercase">
                  SIGN UP
                </Button>
              </Link>
            </GradientButton>
          </div>
        </FadeIn>
      </div>

      {/* Editor Preview */}
      <div className="container mx-auto px-4 md:px-6 mt-10 relative z-10">
        <ScaleIn delay={0.8} className="max-w-5xl mx-auto">
          <div className="rounded-lg overflow-hidden shadow-2xl bg-zinc-950 border border-white/10">
            <Image
              src="/Assests/Home.png"
              alt="Xen.ai Home Preview"
              width={1600}
              height={900}
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="w-full h-auto"
              priority
            />
          </div>
        </ScaleIn>
      </div>
      
      {/* Trusted by section */}

    </section>
  );
}