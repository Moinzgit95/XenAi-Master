import { auth, db } from "@/config/firebase";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

// Function to sign up user
export const signUpUser = async (email, password, displayName) => {
  try {
    // Check if user already exists in Firestore
    const userRef = doc(db, "users", email);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { success: false, message: "User already exists. Please log in." };
    }

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, { displayName });

    // Send email verification to the user
    await sendEmailVerification(user);

    // Create user document in Firestore
    await setDoc(doc(db, "users", email), {
      email: user.email,
      displayName,
      photoURL: user.photoURL || "/robotic.png",
      authProvider: "email",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      twoFactorEnabled: false,
      workspaces: {},
      settings: {
        theme: "dark",
        fontSize: 14,
        showLineNumbers: true,
        aiSuggestions: true,
      },
      snippets: [],
    });

    return { success: true, user, message: "Verification email sent. Please check your inbox." };
  } catch (error) {
    console.error("Sign-up error:", error);
    return { success: false, message: error.message };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create user document in Firestore if not already exists
      await setDoc(userRef, {
        email: user.email,
        emailLower: (user.email || "").toLowerCase(),
        displayName: user.displayName,
        photoURL: user.photoURL || "robotic.png",
        authProvider: "google",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        twoFactorEnabled: false,
        workspaces: {},
        settings: {
          theme: "dark",
          fontSize: 14,
          showLineNumbers: true,
          aiSuggestions: true,
        },
        snippets: [],
      });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const checkIfEmailVerified = () => {
  const user = auth.currentUser;

  if (user && user.emailVerified) {
    console.log("Email is verified!");
    // Proceed with further logic (e.g., allow access to protected areas of the app)
  } else {
    console.log("Email not verified.");
    // Show a message to the user that they need to verify their email.
  }
};
