"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import InviteNotification from "./InviteNotification";
import { auth } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase"; // Firestore instance
import { LayoutDashboard, Play } from "lucide-react";
import SearchBar from "@/components/Searchbar";
import ShowMembers from "@/components/Members";

const Header = ({ workspaceId, workspaceName }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(true); // Default to public
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspaceDetails = async () => {
      const workspaceRef = doc(db, "workspaces", workspaceId);
      const workspaceSnap = await getDoc(workspaceRef);

      if (workspaceSnap.exists()) {
        setIsPublic(workspaceSnap.data().isPublic ?? true); // Default to true if field is missing
      }
    };

    fetchWorkspaceDetails();
  }, [workspaceId]);

  // Fetch User Info
  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserName(userSnap.data().displayName || user.email); // Use name if available, else email
        } else {
          setUserName(user.displayName);
        }
      }
    };

    fetchUserInfo();
  }, []);

  const goToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <header className="flex items-center justify-between px-8 py-3 bg-[#0a0f1e] bg-opacity-80 backdrop-blur-lg border-b border-gray-700 shadow-xl z-50">
      <div className="flex items-center gap-6">
        {pathname.startsWith("/workspace/") && (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold">
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Xen.ai</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {pathname.startsWith("/workspace/") && (
          <>
            <Button
              onClick={goToDashboard}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 hover:shadow-blue-500/50"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Button>
          </>
        )}

        {/* Profile Avatar */}
        <Link href="/profile">
          <Avatar className="w-10 h-10 cursor-pointer border-2 border-gray-500 transition-all duration-300 hover:border-blue-400 hover:scale-105">
            <AvatarImage src={auth.currentUser?.photoURL || "/robotic.png"} alt="Profile" referrerPolicy="no-referrer" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};

export default Header;
