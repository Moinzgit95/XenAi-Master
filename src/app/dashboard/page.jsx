"use client";

import { useState, useEffect } from "react";
import { Globe, Lock, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/config/firebase";
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardNavbar from "@/components/DashboardNavbar";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ShowMembers from "@/components/Members";

const toastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

const Dashboard = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "workspaces"));

        const workspaceData = await Promise.all(
          querySnapshot.docs.map(async (workspaceDoc) => {
            const membersRef = collection(db, `workspaces/${workspaceDoc.id}/members`);
            const membersSnapshot = await getDocs(membersRef);

            const userMemberData = membersSnapshot.docs.find(
              (doc) => doc.data().userId === user.uid
            );

            if (!userMemberData) return null;

            return {
              id: workspaceDoc.id,
              ...workspaceDoc.data(),
              role: userMemberData.data().role || "Unknown",
            };
          })
        );

        setWorkspaces(workspaceData.filter(Boolean));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user]);

  const createWorkspace = async () => {
    setIsOpen(true);
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName || isCreating) return;

    try {
      setIsCreating(true);
      const workspaceRef = await addDoc(collection(db, "workspaces"), {
        name: workspaceName,
        isPublic,
      });

      const membersRef = collection(db, `workspaces/${workspaceRef.id}/members`);
      await setDoc(doc(membersRef, user.uid), {
        userId: user.uid,
        role: "owner",
        displayName: user.displayName || "Unknown",
        photoURL: user.photoURL || "/robotic.png",
      });

      const cursorsRef = doc(db, `workspaces/${workspaceRef.id}`);
      await setDoc(cursorsRef, { cursors: {} }, { merge: true });

      setWorkspaces([
        ...workspaces,
        { id: workspaceRef.id, name: workspaceName, isPublic, role: "owner" },
      ]);
      toast.success("Workspace created successfully!", toastOptions);
      setIsOpen(false);
      setWorkspaceName("");
    } catch (error) {
      toast.error("Failed to create workspace.", toastOptions);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWorkspace = async (workspaceId) => {
    const confirmationToast = toast(
      <div className="flex justify-between items-center gap-4">
        <span>Are you sure you want to delete this workspace?</span>
        <div className="flex space-x-2">
          <Button
            onClick={async () => {
              try {
                setDeletingWorkspaceId(workspaceId);
                await deleteDoc(doc(db, `workspaces/${workspaceId}`));
                setWorkspaces(workspaces.filter((ws) => ws.id !== workspaceId));
                toast.success("Workspace deleted successfully!", toastOptions);
              } catch (error) {
                toast.error("Failed to delete workspace.", toastOptions);
              } finally {
                setDeletingWorkspaceId(null);
                toast.dismiss(confirmationToast);
              }
            }}
            className="bg-red-600 hover:bg-red-500 text-white"
            disabled={deletingWorkspaceId === workspaceId}
          >
            {deletingWorkspaceId === workspaceId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
          <Button
            onClick={() => toast.dismiss(confirmationToast)}
            className="bg-gray-500 hover:bg-gray-600 text-white"
            disabled={deletingWorkspaceId === workspaceId}
          >
            Cancel
          </Button>
        </div>
      </div>,
      {
        ...toastOptions,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        hideProgressBar: true,
      }
    );
  };

  const openEditDialog = (workspace) => {
    setEditingWorkspaceId(workspace.id);
    setEditingName(workspace.name || "");
    setIsEditOpen(true);
  };

  const handleUpdateWorkspaceName = async () => {
    if (!editingWorkspaceId || !editingName.trim() || isUpdating) return;
    try {
      setIsUpdating(true);
      await setDoc(doc(db, "workspaces", editingWorkspaceId), { name: editingName.trim() }, { merge: true });
      setWorkspaces((prev) => prev.map((ws) => (ws.id === editingWorkspaceId ? { ...ws, name: editingName.trim() } : ws)));
      toast.success("Workspace name updated!", toastOptions);
      setIsEditOpen(false);
      setEditingWorkspaceId(null);
      setEditingName("");
    } catch (error) {
      console.error("Failed to update workspace name", error);
      toast.error("Failed to update workspace name.", toastOptions);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-screen text-white flex flex-col bg-gradient-to-br from-black via-gray-900 to-[#1a1a2e] animate-gradient-slow">
      <ToastContainer />
      <DashboardNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col space-y-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Your Workspaces
              </h1>
              <p className="text-gray-400">Manage and collaborate on your AI-powered projects</p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  type="text" 
                  placeholder="Search workspaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700 focus:border-blue-500 text-white"
                />
              </div>

              <Button
                onClick={createWorkspace}
                className="relative flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 ease-out group"
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <PlusCircle size={20} className="mr-2" />
                    <span>New Workspace</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <PlusCircle size={32} className="text-gray-500" />
                </div>
                <p className="text-lg font-medium">
                  {searchQuery ? "No matching workspaces found" : "No workspaces found"}
                </p>
                <p className="text-sm text-gray-500">
                  {searchQuery ? "Try a different search term" : "Create one to get started!"}
                </p>
              </div>
            ) : (
              filteredWorkspaces.map((workspace) => (
                <motion.div
                  key={workspace.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="group h-full bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {workspace.name}
                          </h2>
                          <p className="text-sm text-gray-400 flex items-center mt-2">
                            {workspace.isPublic ? (
                              <>
                                <Globe size={16} className="mr-2 text-green-400" /> Public
                              </>
                            ) : (
                              <>
                                <Lock size={16} className="mr-2 text-yellow-400" /> Private
                              </>
                            )}
                          </p>
                        </div>

                        {workspace.role === "owner" && (
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => openEditDialog(workspace)}
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                            >
                              <Pencil size={20} />
                            </Button>
                            <Button
                              onClick={() => deleteWorkspace(workspace.id)}
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              disabled={deletingWorkspaceId === workspace.id}
                            >
                              {deletingWorkspaceId === workspace.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Trash2 size={20} />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full">
                            {workspace.role}
                          </span>
                        </div>

                        <ShowMembers workspaceId={workspace.id} />

                        <Link
                          href={`/workspace/${workspace.id}`}
                          className="inline-flex w-full items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:translate-y-[-2px]"
                        >
                          Open Workspace
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>
      </main>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gray-800 border border-gray-700 text-white">
          <DialogTitle className="text-xl font-bold text-blue-400">Create New Workspace</DialogTitle>
          <DialogDescription>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Enter workspace name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white"
              />

              <div className="flex gap-4">
                <Button
                  className={`flex-1 flex items-center justify-center gap-2 ${isPublic ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={() => setIsPublic(true)}
                >
                  <Globe size={18} />
                  Public
                </Button>

                <Button
                  className={`flex-1 flex items-center justify-center gap-2 ${!isPublic ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={() => setIsPublic(false)}
                >
                  <Lock size={18} />
                  Private
                </Button>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={!workspaceName || isCreating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  {isCreating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Create Workspace'
                  )}
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Name Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-gray-800 border border-gray-700 text-white">
          <DialogTitle className="text-xl font-bold text-blue-400">Edit Workspace</DialogTitle>
          <DialogDescription>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Enter new workspace name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={() => setIsEditOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWorkspaceName}
                  disabled={!editingName.trim() || isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;