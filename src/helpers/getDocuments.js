import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../config/firebase'; 

// Function to retrieve relevant documents based on user query
export const getRelevantDocuments = async (queryText) => {
  const filesRef = collection(db, "workspaces", workspaceId, "files");
  const q = query(filesRef, where("content", "array-contains", queryText));  // or adjust based on your query mechanism
  const querySnapshot = await getDocs(q);
  
  const docs = querySnapshot.docs.map((doc) => doc.data());
  return docs;
};

