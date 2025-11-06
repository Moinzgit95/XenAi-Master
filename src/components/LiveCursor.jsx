"use client";

import { useEffect, useState } from "react";
import { getDatabase, ref, set, onValue, remove } from "firebase/database";
import { useAuth } from "@/context/AuthProvider";
import { rtdb } from "@/config/firebase"; // Import Realtime Database

const LiveCursor = ({ workspaceId }) => {
  const { user } = useAuth();
  const [cursors, setCursors] = useState({});
  
  useEffect(() => {
    if (!user || !workspaceId) return;

    const cursorRef = ref(rtdb, `workspaces/${workspaceId}/cursors/${user.uid}`);

    const handleMouseMove = (event) => {
      const { clientX, clientY } = event;

      // Update cursor position in Realtime Database
      set(cursorRef, {
        x: clientX,
        y: clientY,
        displayName: user.displayName || "Anonymous",
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
        timestamp: Date.now(),
      });
    };

    document.addEventListener("mousemove", handleMouseMove);

    // Cleanup: Remove cursor when user leaves
    const handleDisconnect = () => remove(cursorRef);
    window.addEventListener("beforeunload", handleDisconnect);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("beforeunload", handleDisconnect);
      remove(cursorRef); // Remove cursor on component unmount
    };
  }, [user, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    const cursorsRef = ref(rtdb, `workspaces/${workspaceId}/cursors`);

    // Listen for real-time cursor updates
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      setCursors(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [workspaceId]);

  return (
    <div>
      {Object.entries(cursors).map(([userId, cursor]) =>
        userId !== user?.uid && cursor ? (
          <div
            key={userId}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: cursor?.x || 0, // Fallback to 0 if undefined
              top: cursor?.y || 0, // Fallback to 0 if undefined
            }}
          >
            {/* Cursor SVG */}
           

            {/* User Display Name */}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-gray-700 text-white px-2 py-1 rounded shadow-md">
                <svg
                className="absolute w-8 h-8 -top-6 left-1/2 -translate-x-1/2"
                viewBox="0 0 24 24"
                fill={cursor?.color || "#ffffff"}
                xmlns="http://www.w3.org/2000/svg"
                >
                <path d="M4 4L20 12L12 20L4 4Z" />
                </svg>
              {cursor?.displayName || "Anonymous"}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
};

export default LiveCursor;
