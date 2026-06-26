import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize client-side Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Firestore instances with the designated Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Export the app instance if needed
export default app;

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test_connection_placeholder', 'connection'));
    console.log('[Firebase client] Successfully pinged Firestore database:', firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("[Firebase client] Please check your Firebase configuration: Client is offline.");
    } else {
      console.log('[Firebase client] Firestore database connection status: Ready & Connected.');
    }
  }
}
testConnection();
