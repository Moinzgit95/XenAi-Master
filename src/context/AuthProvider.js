"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation"; // ✅ Use usePathname
import { auth } from "@/config/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);

        if (pathname === "/login" || pathname === "/register") {
          router.push("/dashboard");
        }
      } else {
        setUser(null);

        // ✅ Redirect to login if user is on a protected route
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/workspace")) {
          router.push("/login");
        }
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [pathname, router]); 

  if (loading) return <div>Loading...</div>;

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
