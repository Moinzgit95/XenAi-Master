'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 bg-transparent backdrop-blur-md border border-white/20 rounded-full">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Xen.ai</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8 ml-16">
          <Link href="/" className={`text-base ${pathname === '/' ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`}>
            Home
          </Link>
          <Link href="/dashboard" className={`text-base ${pathname === '/dashboard' ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`}>
            Dashboard
          </Link>
          <Link href="/pricing" className={`text-base ${pathname === '/pricing' ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`}>
            Pricing
          </Link>
          <Link href="/features" className={`text-base ${pathname === '/features' ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`}>
            Features
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="bg-zinc-800/50 hover:bg-zinc-700/50 text-white border-zinc-700 text-base">
              Dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-base">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}