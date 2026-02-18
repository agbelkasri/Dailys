import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, OAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Replace these values with your Firebase project config
// Found in Firebase Console → Project Settings → Your Apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Microsoft SSO provider — restricted to your organization's Azure AD tenant
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  // Replace with your Azure AD tenant ID (found in Azure Portal → Azure Active Directory → Overview)
  tenant: import.meta.env.VITE_AZURE_TENANT_ID,
  prompt: 'select_account',
});
