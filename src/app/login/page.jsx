"use client";

import { useState } from "react";
import { loginWithEmailAndPassword, loginWithGoogle, loginWithGithub } from "@/helpers/loginHelp";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import { auth, db } from "@/config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import "react-toastify/dist/ReactToastify.css";
import Header from "@/components/sections/Header";

const toastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await loginWithEmailAndPassword(email, password);
      console.log("Logged in as:", user.email);

      if (user) {
        toast.success("Login successful!", toastOptions);
        router.push("/dashboard");
      }
    } catch (error) {
      setError(error.message);
      toast.error("Login failed ", toastOptions);
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { success, user, error } = await loginWithGithub();
      if (!success) throw new Error(error || "GitHub login failed");
      toast.success("Logged in with GitHub!", toastOptions);
      // Immediately request repo scope so pushes are one-click later
      window.location.href = "/api/github/login";
    } catch (error) {
      setError(error.message);
      toast.error("GitHub login failed ", toastOptions);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      console.log("Logged in with Google:", user.displayName);

      if (user) {
        toast.success("Logged in with Google!", toastOptions);
        router.push("/dashboard");
      }
    } catch (error) {
      setError(error.message);
      toast.error("Google login failed ", toastOptions);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      
      toast.success("Password reset link sent to your email!"); // Show success toast
      setIsDialogOpen(false);
    } catch (error) {
      
      toast.error("Error sending password reset email "); // Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen text-white">
      <ToastContainer theme="dark" />
      <Header />
      
      {/* Left side with welcome message (transparent to show DarkVeil background) */}
      <div className="hidden md:flex md:w-1/2 bg-transparent p-8 flex-col justify-center items-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-white">Welcome Back !</h1>
          <p className="text-lg text-gray-300 mb-8">Glad you're back! Log in to continue your journey with us.</p>
          <div className="animate-pulse">
            <button className="border border-white/30 bg-black/20 hover:bg-black/30 text-white rounded-md px-6 py-2 transition-all duration-300">
              Skip the lag ?
            </button>
          </div>
        </div>
      </div>
      
      {/* Right side with login form */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-8 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-64 h-64 rounded-full bg-purple-700/30 blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 rounded-full bg-purple-900/20 blur-3xl"></div>
        
        <Card className="w-full max-w-md bg-[#1a1a2e]/80 border border-gray-700 shadow-2xl rounded-lg backdrop-blur-sm z-10">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-white">Login</CardTitle>
            <p className="text-center text-gray-400 mt-2">Glad you're back!</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-3">
              <Input 
                type="email" 
                placeholder="Username" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500" 
                required 
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500" 
                required 
              />
            </div>
            
            <div className="flex items-center">
              <input type="checkbox" id="remember" className="mr-2 h-4 w-4 rounded border-gray-700 bg-[#1a1a2e]/50 text-purple-600 focus:ring-purple-500" />
              <label htmlFor="remember" className="text-sm text-gray-400">Remember me</label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-md transition-all duration-300"
            >
              Login
            </Button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#1a1a2e]/80 px-4 text-sm text-gray-400">Or</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3 mb-4 w-full">
            <button 
              onClick={handleGoogleLogin} 
              className="flex items-center justify-center space-x-2 w-full p-2 bg-white hover:bg-gray-100 text-gray-800 rounded-md transition-all duration-300"
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              onClick={handleGithubLogin}
              className="flex items-center justify-center space-x-2 w-full p-2 bg-gray-900 hover:bg-black text-white rounded-md transition-all duration-300 border border-gray-700"
            >
              <svg height="18" viewBox="0 0 16 16" width="18" aria-hidden="true" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>
          
          <p className="text-center text-sm text-gray-400">
            Don't have an account? <Link href="/register" className="text-purple-400 hover:text-purple-300 hover:underline">Signup</Link>
          </p>

          <div className="text-center mt-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="text-purple-400 hover:text-purple-300 text-sm">
                  Forgot password ?
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a2e] border border-gray-700 p-6 rounded-lg shadow-xl">
                <DialogTitle className="text-xl font-semibold mb-4 text-white">Reset Password</DialogTitle>
                <DialogDescription className="text-sm text-gray-400 mb-4">
                  Enter your email to receive a password reset link.
                </DialogDescription>
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-4 bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500"
                />
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setIsDialogOpen(false)}
                    className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-md border border-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    className={`${isLoading ? "bg-purple-500/50" : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"} text-sm font-medium py-2 px-4 rounded-md text-white transition-all duration-300`}
                  >
                    {isLoading ? "Sending..." : "Send Link"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Login;