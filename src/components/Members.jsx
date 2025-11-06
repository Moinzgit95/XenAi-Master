"use client";
import { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { X, LogOut } from "lucide-react"; // Close & Exit Icons
import { useRouter } from "next/navigation";

export default function ShowMembers({ workspaceId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const membersRef = useRef(null);
  const user = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!workspaceId || !user) return;
    let unsubscribe;

    const fetchMembersRealtime = () => {
      setLoading(true);
      const membersCollectionRef = collection(db, `workspaces/${workspaceId}/members`);

      unsubscribe = onSnapshot(membersCollectionRef, async (snapshot) => {
        if (snapshot.empty) {
          setMembers([]);
          setLoading(false);
          return;
        }

        const membersData = snapshot.docs.map((docSnap) => {
          const { userId, role, displayName, photoURL } = docSnap.data();
          if (userId === user.uid) setUserRole(role); // Set the current user's role
          return {
            id: userId,
            displayName: displayName || "Unknown User",
            photoURL: photoURL || "/robotic.png",
            role: role || "Member",
          };
        })

        setMembers(membersData);
        setLoading(false);
      });
    };

    fetchMembersRealtime();
    return () => unsubscribe && unsubscribe();
  }, [workspaceId, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (membersRef.current && !membersRef.current.contains(event.target)) {
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

  const exitWorkspace = async () => {
    if (!user || !workspaceId) return;
    await deleteDoc(doc(db, `workspaces/${workspaceId}/members`, user.uid));
    router.push("/dashboard");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Stacked Member Avatars */}
      <div className="flex gap-2 text-sm items-center">
       👥 People: {members.length}
        <div className="flex -space-x-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          {members.slice(0, 4).map((member, index) => (
            <img
              key={member.id}
              src={member.photoURL || "/robotic.png"}
              alt={""}
              className="w-7 rounded-full border-2 border-white shadow-lg"
              style={{ zIndex: members.length - index }}
            />
          ))}
          {members.length > 4 && (
            <div className="w-10 h-10 flex items-center justify-center bg-gray-800 text-white rounded-full border-2 border-white text-xs shadow-lg">
              +{members.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Members Dropdown */}
      {isOpen && (
        <div
          ref={membersRef}
          className="absolute top-12 right-full bg-gray-900 p-4 rounded-lg shadow-lg w-80 z-[100]"
        >
          <div className="flex justify-between items-center border-b border-gray-600 pb-2">
            <h3 className="text-white text-sm font-semibold">Workspace Members</h3>
            <button className="text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading && <div className="text-gray-400 text-center mt-2">Loading...</div>}

          <div className="mt-2 max-h-60 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center p-2 hover:bg-gray-800 rounded-md">
                <img
                  src={member.photoURL || "/robotic.png"}
                  alt={""}
                  className="w-8 h-8 rounded-full mr-3"
                />
                <div className="flex-grow">
                  <p className="text-white text-sm font-medium">{member.displayName}</p>
                  <p className="text-gray-400 text-xs">{member.role}</p>
                </div>
                {/* Show Exit button only for the current user (except owner) */}
                {member.id === user?.uid && userRole !== "owner" && (
                  <button className="text-red-500 hover:text-red-400" onClick={exitWorkspace}>
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
