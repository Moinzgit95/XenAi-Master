import admin from "firebase-admin";

let app;

if (!admin.apps || admin.apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars");
  }

  // Handle private key with escaped newlines
  privateKey = privateKey.replace(/\\n/g, "\n");

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
