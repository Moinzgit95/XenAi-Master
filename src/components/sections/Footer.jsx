'use client';

import Link from 'next/link';
import { FadeIn, SlideIn } from '@/components/ui/motion';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="container mx-auto px-4 md:px-6">
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Xen.ai</span>
              </Link>
              <p className="text-white/70 max-w-md">
                Next-generation code editor with AI-powered suggestions to enhance your coding experience.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/workspace" className="text-white/70 hover:text-white transition-colors">
                    Workspace
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-white/70 hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="text-white/70 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white/70 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </FadeIn>
        
        <SlideIn direction="up" delay={0.2}>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/50 text-sm">
              &copy; {currentYear} Xen.ai. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="mailto:syedabdulla442@gmail.com" className="text-white/50 hover:text-white transition-colors">
                Contact
              </a>
              <a href="/about" className="text-white/50 hover:text-white transition-colors">
                About
              </a>
              <a href="/privacy" className="text-white/50 hover:text-white transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </SlideIn>
      </div>
    </footer>
  );
}