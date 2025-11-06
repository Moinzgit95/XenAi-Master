"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120 }}
      className="fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-sm border border-gray-800/50 rounded-xl shadow-lg shadow-black/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              <span className="text-3xl">X</span>en ai
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {user && (
              <Link href="/profile">
                <Avatar className="h-8 w-8 ring-2 ring-blue-500/50 transition-all hover:ring-blue-500">
                  <AvatarImage src={user.photoURL || '/robotic.png'} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;