import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  getDocFromServer
} from 'firebase/firestore';
import { UnifiedSimulation } from './simulationsStore';

// Use Vite's Glob Import to optionally resolve the local configuration file without crashing the build if it is missing
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true }) as Record<string, { default: any }>;
const firebaseConfigImport = configs['../../firebase-applet-config.json']?.default || null;

// Build Firebase configuration using environment variables preferentially, with fallback to local JSON file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigImport?.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigImport?.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigImport?.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigImport?.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigImport?.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigImport?.appId || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigImport?.firestoreDatabaseId || ""
};

// Check if Firebase is fully and validly configured
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey.trim() !== "" && 
  firebaseConfig.projectId.trim() !== ""
);

let app: any = null;
export let db: any = null;
export let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    console.log("Firebase initialized successfully in online mode.");
  } catch (error) {
    console.error("Error initializing Firebase application: ", error);
  }
} else {
  console.warn("Firebase credentials are not defined. App running in robust Offline/Local mode.");
}

// Custom onAuthStateChanged wrapper
export function onAuthStateChanged(authInstance: any, callback: (user: any | null) => void) {
  if (isFirebaseConfigured && authInstance) {
    return fbOnAuthStateChanged(authInstance, callback);
  } else {
    // Local Offline Fallback: Auto-login master developer Diego Martins
    const mockUser = {
      uid: 'local-dev-user',
      email: 'diegofmartins@gmail.com',
      displayName: 'Diego Martins (Modo Offline)',
      emailVerified: true,
      isAnonymous: false,
      providerData: []
    };
    const timer = setTimeout(() => {
      callback(mockUser);
    }, 50);
    return () => clearTimeout(timer);
  }
}

// Test server connection (only in online mode)
async function testConnection() {
  if (isFirebaseConfigured && db) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. Client is offline.");
      }
    }
  }
}
testConnection();

// Define Firestore collection Operation Types for error tracing
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global firestore error logger & exception wrapper
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'anonymous',
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authorised user information model
export interface SystemUser {
  email: string;
  nome: string;
  role: 'admin' | 'user';
  allowed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Google Pop-up Authentication
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<any> {
  if (isFirebaseConfigured && auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error during Google authentication popup: ', error);
      throw error;
    }
  } else {
    // Return mock logged-in user in offline mode
    return {
      uid: 'local-dev-user',
      email: 'diegofmartins@gmail.com',
      displayName: 'Diego Martins (Modo Offline)',
      emailVerified: true,
      isAnonymous: false,
      providerData: []
    };
  }
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error during log out: ', error);
      throw error;
    }
  } else {
    console.log('User signed out from Offline Mode.');
  }
}

// --- Local Storage Cache Managers for Offline fallback ---
const USERS_STORAGE_KEY = 'dgep_local_registered_users';
const SIMULATIONS_STORAGE_KEY = 'dgep_local_legacy_simulations';

function getLocalUsersSync(): SystemUser[] {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading local users', e);
  }
  return [];
}

function saveLocalUsersSync(list: SystemUser[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local users', e);
  }
}

function getLocalSimsSync(): UnifiedSimulation[] {
  try {
    const saved = localStorage.getItem(SIMULATIONS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading local simulations', e);
  }
  return [];
}

function saveLocalSimsSync(list: UnifiedSimulation[]) {
  try {
    localStorage.setItem(SIMULATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local simulations', e);
  }
}

// Check if user is registered
export async function getRegisteredUser(email: string): Promise<SystemUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    const path = `users/${normalizedEmail}`;
    try {
      const userDocRef = doc(db, 'users', normalizedEmail);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        return userSnapshot.data() as SystemUser;
      }
      
      // Auto-bootstrap master admins 'diegofmartins@gmail.com' and 'rh@cmc.pr.gov.br'
      if (normalizedEmail === 'diegofmartins@gmail.com' || normalizedEmail === 'rh@cmc.pr.gov.br') {
        const name = normalizedEmail === 'rh@cmc.pr.gov.br' ? 'Recursos Humanos CMC' : 'Diego Martins';
        const bossUser: SystemUser = {
          email: normalizedEmail,
          nome: name,
          role: 'admin',
          allowed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', normalizedEmail), bossUser);
        return bossUser;
      }
      
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  } else {
    const localUsers = getLocalUsersSync();
    const found = localUsers.find(u => u.email === normalizedEmail);
    if (found) return found;

    if (normalizedEmail === 'diegofmartins@gmail.com' || normalizedEmail === 'rh@cmc.pr.gov.br') {
      const name = normalizedEmail === 'rh@cmc.pr.gov.br' ? 'Recursos Humanos CMC' : 'Diego Martins';
      const bossUser: SystemUser = {
        email: normalizedEmail,
        nome: name,
        role: 'admin',
        allowed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localUsers.push(bossUser);
      saveLocalUsersSync(localUsers);
      return bossUser;
    }
    return null;
  }
}

// Add/Save restricted user (Admin option)
export async function saveRegisteredUser(user: SystemUser): Promise<void> {
  const normalizedEmail = user.email.trim().toLowerCase();
  const preparedUser = {
    ...user,
    email: normalizedEmail,
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    const path = `users/${normalizedEmail}`;
    try {
      await setDoc(doc(db, 'users', normalizedEmail), preparedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  } else {
    const localUsers = getLocalUsersSync();
    const filtered = localUsers.filter(u => u.email !== normalizedEmail);
    filtered.push(preparedUser);
    saveLocalUsersSync(filtered);
  }
}

// Delete user (Admin option)
export async function deleteRegisteredUser(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    const path = `users/${normalizedEmail}`;
    try {
      await deleteDoc(doc(db, 'users', normalizedEmail));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  } else {
    const localUsers = getLocalUsersSync();
    const filtered = localUsers.filter(u => u.email !== normalizedEmail);
    saveLocalUsersSync(filtered);
  }
}

// Fetch all registered users list (Admin panel)
export async function getAllRegisteredUsers(): Promise<SystemUser[]> {
  if (isFirebaseConfigured && db) {
    const path = 'users';
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const list: SystemUser[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SystemUser);
      });
      
      // Ensure master admins are in the listing even if database doesn't have them yet
      const admins = [
        { email: 'diegofmartins@gmail.com', nome: 'Diego Martins' },
        { email: 'rh@cmc.pr.gov.br', nome: 'Recursos Humanos CMC' }
      ];
      for (const admin of admins) {
        if (!list.some(u => u.email === admin.email)) {
          list.push({
            email: admin.email,
            nome: admin.nome,
            role: 'admin',
            allowed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      return list.sort((a, b) => a.email.localeCompare(b.email));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  } else {
    const localUsers = getLocalUsersSync();
    const admins = [
      { email: 'diegofmartins@gmail.com', nome: 'Diego Martins' },
      { email: 'rh@cmc.pr.gov.br', nome: 'Recursos Humanos CMC' }
    ];
    let updatedLocal = false;
    for (const admin of admins) {
      if (!localUsers.some(u => u.email === admin.email)) {
        localUsers.push({
          email: admin.email,
          nome: admin.nome,
          role: 'admin',
          allowed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        updatedLocal = true;
      }
    }
    if (updatedLocal) {
      saveLocalUsersSync(localUsers);
    }
    return localUsers.sort((a, b) => a.email.localeCompare(b.email));
  }
}

// Firestore Simulations Operations
export async function getFirestoreSimulations(): Promise<UnifiedSimulation[]> {
  if (isFirebaseConfigured && db) {
    const path = 'simulations';
    try {
      const querySnapshot = await getDocs(collection(db, 'simulations'));
      const sims: UnifiedSimulation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sims.push(data as UnifiedSimulation);
      });
      return sims.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  } else {
    return getLocalSimsSync().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export async function writeFirestoreSimulation(sim: UnifiedSimulation): Promise<void> {
  if (isFirebaseConfigured && db) {
    const path = `simulations/${sim.id}`;
    try {
      await setDoc(doc(db, 'simulations', sim.id), sim);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  } else {
    const sims = getLocalSimsSync();
    const filtered = sims.filter(s => s.id !== sim.id);
    filtered.push(sim);
    saveLocalSimsSync(filtered);
  }
}

export async function deleteFirestoreSimulation(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const path = `simulations/${id}`;
    try {
      await deleteDoc(doc(db, 'simulations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  } else {
    const sims = getLocalSimsSync();
    const filtered = sims.filter(s => s.id !== id);
    saveLocalSimsSync(filtered);
  }
}

// Firestore Settings Operations
export async function getFirestoreSettings(): Promise<any | null> {
  if (isFirebaseConfigured && db) {
    const path = 'settings/global';
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
  return null;
}

export async function writeFirestoreSettings(settings: any): Promise<void> {
  if (isFirebaseConfigured && db) {
    const path = 'settings/global';
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

