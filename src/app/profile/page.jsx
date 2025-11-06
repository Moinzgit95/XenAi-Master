"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/config/firebase";
import { useRouter } from "next/navigation";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logout from "@/helpers/logoutHelp";
import { 
  FaArrowLeft, 
  FaCode, 
  FaUsers, 
  FaClock, 
  FaStar, 
  FaFileAlt,
  FaPlus,
  FaUserCheck,
  FaEdit
} from "react-icons/fa";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [invites, setInvites] = useState([]);
  const [userStats, setUserStats] = useState({
    totalWorkspaces: 0,
    ownedWorkspaces: 0,
    collaborators: 0,
    totalFiles: 0,
    pendingInvites: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setEmail(currentUser.email);
      fetchUserData(currentUser.uid);
    } else {
      router.push("/login");
    }
  }, []);

  const fetchUserData = async (userId) => {
    setIsStatsLoading(true);
    try {
      // Fetch user document for invites and other data
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userInvites = userData.invites || [];
      setInvites(userInvites);

      // Fetch all workspaces
      const workspacesSnapshot = await getDocs(collection(db, "workspaces"));
      const allWorkspaces = [];
      const ownedWorkspaces = [];
      const memberWorkspaces = [];
      let totalCollaborators = 0;
      let totalFiles = 0;

      for (const workspaceDoc of workspacesSnapshot.docs) {
        const workspaceData = workspaceDoc.data();
        const workspaceId = workspaceDoc.id;

        // Check if user is owner
        if (workspaceData.createdBy === userId) {
          ownedWorkspaces.push({
            id: workspaceId,
            name: workspaceData.name || workspaceId,
            role: 'owner',
            createdAt: workspaceData.createdAt,
            ...workspaceData
          });
        }

        // Check if user is a member
        const memberDoc = await getDoc(doc(db, `workspaces/${workspaceId}/members`, userId));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          memberWorkspaces.push({
            id: workspaceId,
            name: workspaceData.name || workspaceId,
            role: memberData.role || 'contributor',
            joinedAt: memberData.joinedAt,
            ...workspaceData
          });

          // Count collaborators in this workspace
          const membersSnapshot = await getDocs(collection(db, `workspaces/${workspaceId}/members`));
          totalCollaborators += membersSnapshot.size;

          // Count files in this workspace
          try {
            const filesSnapshot = await getDocs(collection(db, `workspaces/${workspaceId}/files`));
            totalFiles += filesSnapshot.size;
          } catch (error) {
            console.log(`No files collection for workspace ${workspaceId}`);
          }
        }
      }

      // Combine owned and member workspaces
      const allUserWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];
      
      // Remove duplicates (in case user owns and is also a member)
      const uniqueWorkspaces = allUserWorkspaces.filter((workspace, index, self) =>
        index === self.findIndex(w => w.id === workspace.id)
      );

      setUserWorkspaces(uniqueWorkspaces);

      // Update stats
      setUserStats({
        totalWorkspaces: uniqueWorkspaces.length,
        ownedWorkspaces: ownedWorkspaces.length,
        collaborators: totalCollaborators,
        totalFiles: totalFiles,
        pendingInvites: userInvites.length
      });

      // Generate recent activity based on real data
      await fetchRecentActivity(userId, uniqueWorkspaces);

    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchRecentActivity = async (userId, workspaces) => {
    try {
      const activities = [];

      // Add workspace creation activities
      const ownedWorkspaces = workspaces.filter(w => w.createdBy === userId);
      ownedWorkspaces.forEach(workspace => {
        if (workspace.createdAt) {
          activities.push({
            id: `created_${workspace.id}`,
            type: 'workspace',
            action: `Created workspace "${workspace.name}"`,
            time: formatTimeAgo(workspace.createdAt.toDate()),
            timestamp: workspace.createdAt.toDate(),
            icon: FaPlus,
            color: 'text-green-400'
          });
        }
      });

      // Add workspace join activities
      const joinedWorkspaces = workspaces.filter(w => w.createdBy !== userId && w.joinedAt);
      joinedWorkspaces.forEach(workspace => {
        activities.push({
          id: `joined_${workspace.id}`,
          type: 'collaboration',
          action: `Joined workspace "${workspace.name}"`,
          time: formatTimeAgo(workspace.joinedAt.toDate()),
          timestamp: workspace.joinedAt.toDate(),
          icon: FaUserCheck,
          color: 'text-blue-400'
        });
      });

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp - a.timestamp;
      });

      // Take only the 5 most recent activities
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error("Error fetching recent activity:", error);
      // Set default activities if there's an error
      setRecentActivity([
        {
          id: 'default_1',
          type: 'profile',
          action: 'Profile accessed',
          time: 'Just now',
          icon: FaEdit,
          color: 'text-purple-400'
        }
      ]);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent successfully. Please check your inbox.");
      toast.success("Password reset link sent to your email!");
      setIsDialogOpen(false);
    } catch (error) {
      setErrorMessage("Error sending password reset email: " + error.message);
      toast.error("Error sending password reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const isGoogleUser = user && user.providerData.some((provider) => provider.providerId === "google.com");

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const navigateToWorkspace = (workspaceId) => {
    router.push(`/workspace/${workspaceId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
      <ToastContainer position="top-right" theme="dark" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="text-lg" />
            <span>Back to Dashboard</span>
          </button>
          <Button
            onClick={logout}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/50"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="bg-gray-800/50 backdrop-blur border-gray-700/50 p-6 col-span-1">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-24 h-24 border-4 border-blue-500/30 mb-4">
                <AvatarImage src={user?.photoURL || "/robotic.png"} alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent text-center">
                {user?.displayName || "User"}
              </h1>
              <p className="text-gray-400 mb-4 text-center">{user?.email}</p>
              
              {invites.length > 0 && (
                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg w-full">
                  <p className="text-blue-400 text-sm text-center">
                    {invites.length} pending invite{invites.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              {!isGoogleUser && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-blue-500/30 hover:border-blue-500/50">
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800/95 backdrop-blur border-gray-700">
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Enter your email to receive a password reset link.
                    </DialogDescription>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-700/50 border-gray-600"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                        className={`${isLoading ? "bg-gray-600" : "bg-blue-600"} hover:bg-blue-700`}
                      >
                        {isLoading ? "Sending..." : "Send Link"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </motion.div>
          </Card>

          {/* Stats Grid */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaCode className="text-2xl text-blue-400 mb-2" />
              <h3 className="text-gray-400 text-sm text-center">Total Workspaces</h3>
              <p className="text-2xl font-bold">
                {isStatsLoading ? "..." : userStats.totalWorkspaces}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaStar className="text-2xl text-yellow-400 mb-2" />
              <h3 className="text-gray-400 text-sm text-center">Owned</h3>
              <p className="text-2xl font-bold">
                {isStatsLoading ? "..." : userStats.ownedWorkspaces}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaUsers className="text-2xl text-green-400 mb-2" />
              <h3 className="text-gray-400 text-sm text-center">Collaborators</h3>
              <p className="text-2xl font-bold">
                {isStatsLoading ? "..." : userStats.collaborators}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaFileAlt className="text-2xl text-purple-400 mb-2" />
              <h3 className="text-gray-400 text-sm text-center">Total Files</h3>
              <p className="text-2xl font-bold">
                {isStatsLoading ? "..." : userStats.totalFiles}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaClock className="text-2xl text-orange-400 mb-2" />
              <h3 className="text-gray-400 text-sm text-center">Pending Invites</h3>
              <p className="text-2xl font-bold">
                {isStatsLoading ? "..." : userStats.pendingInvites}
              </p>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <Card className="col-span-1 md:col-span-2 bg-gray-800/50 backdrop-blur border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {isStatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-gray-600 rounded"></div>
                          <div className="w-40 h-4 bg-gray-600 rounded"></div>
                        </div>
                        <div className="w-16 h-4 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <activity.icon className={`text-lg ${activity.color}`} />
                      <div className="text-gray-200">{activity.action}</div>
                    </div>
                    <span className="text-sm text-gray-400">{activity.time}</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <FaClock className="text-4xl mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </Card>

          {/* Workspaces List */}
          {userWorkspaces.length > 0 && (
            <Card className="col-span-1 bg-gray-800/50 backdrop-blur border-gray-700/50 p-6">
              <h2 className="text-xl font-semibold mb-4">Your Workspaces</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {userWorkspaces.map((workspace, index) => (
                  <motion.div
                    key={workspace.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigateToWorkspace(workspace.id)}
                    className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 cursor-pointer transition-all hover:border-blue-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white truncate">{workspace.name}</h3>
                        <p className="text-sm text-gray-400 capitalize">{workspace.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {workspace.role === 'owner' && (
                          <FaStar className="text-yellow-400 text-sm" />
                        )}
                        <FaCode className="text-blue-400 text-sm" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;