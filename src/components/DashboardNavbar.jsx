"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onSnapshot, doc, updateDoc, arrayRemove, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Bell, Settings, HelpCircle, User, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

const DashboardNavbar = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [inviteCount, setInviteCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [invites, setInvites] = useState([]);
  const [workspaceNames, setWorkspaceNames] = useState({});
  const [fetchingWorkspaces, setFetchingWorkspaces] = useState(new Set());

  // Function to fetch workspace names efficiently
  const fetchWorkspaceNames = async (workspaceIds) => {
    // Filter out IDs we already have or are currently fetching
    const idsToFetch = workspaceIds.filter(id => 
      !workspaceNames[id] && !fetchingWorkspaces.has(id)
    );
    
    if (idsToFetch.length === 0) return;

    // Mark these IDs as being fetched
    setFetchingWorkspaces(prev => new Set([...prev, ...idsToFetch]));
    
    try {
      // Fetch all workspaces in parallel
      const promises = idsToFetch.map(async (workspaceId) => {
        try {
          const workspaceRef = doc(db, "workspaces", workspaceId);
          const workspaceSnap = await getDoc(workspaceRef);
          
          if (workspaceSnap.exists()) {
            const workspaceData = workspaceSnap.data();
            return {
              id: workspaceId,
              name: workspaceData.name || workspaceData.title || workspaceId
            };
          } else {
            return { id: workspaceId, name: workspaceId };
          }
        } catch (error) {
          console.error(`Error fetching workspace ${workspaceId}:`, error);
          return { id: workspaceId, name: workspaceId };
        }
      });

      const results = await Promise.all(promises);
      
      // Update state with new names
      const newNames = {};
      results.forEach(({ id, name }) => {
        newNames[id] = name;
      });
      
      setWorkspaceNames(prev => ({ ...prev, ...newNames }));
    } finally {
      // Remove from fetching set
      setFetchingWorkspaces(prev => {
        const newSet = new Set(prev);
        idsToFetch.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Listen for invite changes
  useEffect(() => {
    if (!user) {
      setInviteCount(0);
      setInvites([]);
      setWorkspaceNames({});
      return;
    }

    console.log("Setting up invite listener for user:", user.uid);
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const invites = docSnap.data().invites || [];
        setInvites(invites);
        setInviteCount(invites.length);
        console.log("Invites updated:", invites);

        // Only fetch names for new workspace IDs
        if (invites.length > 0) {
          fetchWorkspaceNames(invites);
        }
      } else {
        setInvites([]);
        setInviteCount(0);
        // Don't clear workspace names - keep them cached
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotifications = () => {
    console.log("Bell clicked, current state:", showNotifications);
    setShowNotifications(!showNotifications);
  };

  const handleAcceptInvite = async (workspaceId) => {
    if (!user) return;

    try {
      const membersRef = doc(db, `workspaces/${workspaceId}/members`, user.uid);
      await setDoc(membersRef, {
        userId: user.uid,
        role: "contributor",
        displayName: user.displayName || "Unknown",
        photoURL: user.photoURL || "/robotic.png",
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        invites: arrayRemove(workspaceId),
      });

      toast.success("You have joined the workspace!");
      router.push("/workspace/" + workspaceId);
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error("Failed to accept invite. Please try again.");
    }
  };

  const handleDeclineInvite = async (workspaceId) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        invites: arrayRemove(workspaceId),
      });

      toast.info("Invite declined.");
    } catch (error) {
      console.error("Error declining invite:", error);
      toast.error("Failed to decline invite. Please try again.");
    }
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-black border-b border-gray-800 z-50">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Xen.ai
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Bell Notification Icon */}
            <Button
              variant="ghost"
              className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={handleNotifications}
            >
              <Bell className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
              {inviteCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center animate-pulse">
                  {inviteCount > 9 ? '9+' : inviteCount}
                </span>
              )}
            </Button>

            <div className="h-8 w-px bg-gray-800" />

            <Button
              variant="ghost"
              className="p-0 hover:bg-transparent"
              onClick={handleProfile}
            >
              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={user?.photoURL || "/robotic.png"} referrerPolicy="no-referrer" />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </nav>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              onClick={() => setShowNotifications(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] z-[61]"
            >
              <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto">
                  {invites.length > 0 ? (
                    <div className="space-y-2 p-2">
                      {invites.map((workspaceId) => (
                        <motion.div
                          key={workspaceId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-white font-medium">Workspace Invite</h4>
                              <p className="text-gray-300 text-sm mt-1">
                                You've been invited to join:
                              </p>
                              <p className="text-blue-400 font-semibold mt-1 truncate">
                                {workspaceNames[workspaceId] || workspaceId}
                              </p>
                              {workspaceNames[workspaceId] && workspaceNames[workspaceId] !== workspaceId && (
                                <p className="text-gray-500 font-mono text-xs mt-1 truncate">
                                  ID: {workspaceId}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleDeclineInvite(workspaceId)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2"
                            >
                              Decline
                            </Button>
                            <Button
                              onClick={() => handleAcceptInvite(workspaceId)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                            >
                              Accept
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardNavbar;