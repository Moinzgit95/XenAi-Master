"use client";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/config/firebase";
import { UserPlus, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function SearchBar({ workspaceId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState(new Set()); // Store members as a Set
  const auth = getAuth();
  const currentUserEmail = auth.currentUser?.email;
  const searchRef = useRef(null);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceMembers();
    }
  }, [workspaceId]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length > 0) {
      fetchUsers(term);
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const fetchWorkspaceMembers = async () => {
    try {
      const membersQuery = collection(db, `workspaces/${workspaceId}/members`);
      const membersSnapshot = await getDocs(membersQuery);
      const membersSet = new Set(membersSnapshot.docs.map(doc => doc.id)); // Store member userIds
      setWorkspaceMembers(membersSet);
    } catch (error) {
      console.error("Error fetching workspace members:", error);
      toast.error("Failed to fetch workspace members");
    }
  };

  const fetchUsers = async (term) => {
    setLoading(true);
    try {
      const lower = term.toLowerCase();
      const q = query(
        collection(db, "users"),
        where("emailLower", ">=", lower),
        where("emailLower", "<=", lower + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      let matchedUsers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fallback: exact match by email in case emailLower was not set for older accounts
      if (matchedUsers.length === 0) {
        const exactSnap = await getDocs(
          query(collection(db, "users"), where("email", "==", term))
        );
        const exactUsers = exactSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (exactUsers.length > 0) matchedUsers = exactUsers;
      }

      // Filter out current user and existing workspace members
      matchedUsers = matchedUsers.filter(user => user.email !== currentUserEmail && !workspaceMembers.has(user.id));

      setUsers(matchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (userId, userEmail) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        invites: arrayUnion(workspaceId),
      });

      toast.success(`${userEmail} has been invited.`);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    }
  };

  return (
    <div className="relative flex items-center">
      <button ref={searchRef} className="rounded-full transition flex items-start gap-2" onClick={() => setIsOpen(!isOpen)}>
        <UserPlus className="w-5 h-5 text-white" />Invite
      </button>

      {isOpen && (
        <div ref={searchRef} className="absolute top-10 right-0 bg-slate-800 p-4 rounded-lg shadow-lg w-96 z-50">
          <div className="flex items-center border-b border-gray-600 pb-2">
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white p-2 text-sm outline-none"
            />
            <button className="ml-2 text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading && <div className="text-gray-400 text-center mt-2">Loading...</div>}

          <div className="mt-2 max-h-60 overflow-y-auto">
            {!loading && users.length === 0 && searchTerm.trim().length > 0 && (
              <div className="p-3 text-sm text-gray-400">No users found. Ask them to sign up first.</div>
            )}
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-2 hover:bg-gray-800 rounded-md">
                <span className="text-white text-sm">{user.email}</span>
                <button
                  className="p-1 bg-blue-500 text-white rounded-md px-4 text-sm hover:bg-blue-600"
                  onClick={() => inviteUser(user.id, user.email)}
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toaster position="right-center" />
    </div>
  );
}
