import { signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signInWithEmailAndPassword, fetchSignInMethodsForEmail, linkWithCredential } from "firebase/auth";
import { auth } from "@/config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase"; // Firestore instance

// Function to log in with Email and Password
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Logged in with email:", user.email);
    return user;
  } catch (error) {
    console.error("Error logging in with email:", error.message);
    throw new Error("Invalid credentials or user does not exist.");
  }
};

// Function to log in with GitHub (with user existence check)
export const loginWithGithub = async () => {
  try {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "GitHub User",
        photoURL: user.photoURL || "/robotic.png",
        authProvider: "github",
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
    if (error?.code === "auth/account-exists-with-different-credential") {
      try {
        const email = error?.customData?.email;
        const pendingCred = GithubAuthProvider.credentialFromError(error);
        if (!email || !pendingCred) throw error;
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes("google.com")) {
          const googleUser = await signInWithPopup(auth, new GoogleAuthProvider());
          await linkWithCredential(googleUser.user, pendingCred);
          return { success: true, user: googleUser.user };
        }
        return { success: false, error: "Account exists with different provider: " + methods.join(", ") };
      } catch (e) {
        return { success: false, error: e.message || "Linking failed" };
      }
    }
    return { success: false, error: error.message };
  }
};

// Function to log in with Google (with user existence check)
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Logged in with Google:", user.displayName);

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create a new user model in Firestore
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || "/robotic.png",
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
      console.log("New user created in Firestore:", user.displayName);
    } else {
      console.log("User already exists, logging in:", user.displayName);
      // Ensure emailLower exists for case-insensitive lookups
      const data = docSnap.data();
      if (!data.emailLower && user.email) {
        await updateDoc(userRef, { emailLower: (user.email || "").toLowerCase() });
      }
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error logging in with Google:", error.message);
    return { success: false, error: error.message };
  }
};
