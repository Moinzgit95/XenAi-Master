"use client";

import { useState } from "react";
import { signUpUser, signInWithGoogle } from "@/helpers/signUpHelp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
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

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const res = await signUpUser(email, password, displayName);
      if (!res.success) {
        toast.error(res.message, toastOptions);
      } else {
        toast.success(res.message, toastOptions);
        setShowVerification(true);  // Show the verification dialog
      }
    } catch (error) {
      toast.error("Sign-up failed: " + error.message, toastOptions);
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;

    setLoading(true);
    try {
      // Assuming `verifyEmailCode` is a Firebase helper function for email verification.
      const res = await verifyEmailCode(email, verificationCode, password, displayName);
      if (res.success) {
        toast.success("Account created successfully! Redirecting...", toastOptions);
        setVerificationCode(""); // Reset the verification code field
        router.push("/dashboard");
      } else {
        toast.error(res.message, toastOptions);
        setVerificationCode(""); // Reset the verification code field
      }
    } catch (error) {
      toast.error("Verification failed: " + error.message, toastOptions);
      setVerificationCode(""); // Reset the verification code field
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        router.push("/dashboard");
      } else {
        toast.error(res.error, toastOptions);
      }
    } catch (error) {
      toast.error("Google sign-in failed: " + error.message, toastOptions);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#0f0f17] text-white">
      <ToastContainer theme="dark" />
      <Header/>
      
      {/* Left side with welcome message */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#1a1a2e] to-[#4a0072] p-8 flex-col justify-center items-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-white">Welcome!</h1>
          <p className="text-lg text-gray-300 mb-8">Create an account to start your journey with us and unlock all features.</p>
          <div className="animate-pulse">
            <button className="border border-white/30 bg-black/20 hover:bg-black/30 text-white rounded-md px-6 py-2 transition-all duration-300">
              Skip the lag?
            </button>
          </div>
        </div>
      </div>
      
      {/* Right side with signup form */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-8 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-64 h-64 rounded-full bg-purple-700/30 blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 rounded-full bg-purple-900/20 blur-3xl"></div>
        
        <Card className="w-full max-w-md bg-[#1a1a2e]/80 border border-gray-700 shadow-2xl rounded-lg backdrop-blur-sm z-10">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-white">Create Account</CardTitle>
            <p className="text-center text-gray-400 mt-2">Join our community today</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500"
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            
            <Button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-md transition-all duration-300"
            >
              {loading ? "Processing..." : "Sign Up"}
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#1a1a2e]/80 px-4 text-sm text-gray-400">Or</span>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4 mb-4">
              <button onClick={handleGoogleSignIn} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#EA4335">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.086-9.5H17v-1h-6.086v-1.5H17v-1h-6.086V7.5H17v-1h-6.086c-.827 0-1.5.673-1.5 1.5v5c0 .827.673 1.5 1.5 1.5z"/>
                </svg>
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 hover:underline">
                Login here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email verification dialog */}
      <Dialog open={showVerification} onOpenChange={setShowVerification}>
        <DialogContent className="bg-[#1a1a2e] border border-gray-700 p-6 rounded-lg shadow-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold mb-2">Verify Your Email</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the 6-digit code sent to {email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label className="block text-sm font-medium text-gray-300">
              Verification Code
            </Label>
            <Input
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="bg-[#1a1a2e]/50 border-gray-700 text-white rounded-md px-4 py-3 focus:border-purple-500 focus:ring-purple-500"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleVerifyCode}
              disabled={loading}
              className={`${loading ? "bg-purple-500/50" : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"} text-white font-semibold py-2 px-6 rounded-md transition-all duration-300`}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
