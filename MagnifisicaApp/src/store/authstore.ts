import {
  getAuth,
  onAuthStateChanged,
  signOut,
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { getFirestore, doc, getDoc } from "@react-native-firebase/firestore";
import { create } from "zustand";

const auth = getAuth();
const db = getFirestore();

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  isAdmin: boolean;

  checkAuth: () => () => void;
  logout: () => void;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  checkAdminRole: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAdmin: false,

  checkAuth: () => {
    set({ isLoading: true });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is admin
        await get().checkAdminRole(user.uid);
        set({ user: user, isLoading: false });
      } else {
        set({ user: null, isAdmin: false, isLoading: false });
      }
    });
    return unsubscribe;
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, isAdmin: false });
  },

  getToken: async (forceRefresh = false) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return null;
    }

    try {
      const token = await currentUser.getIdToken(forceRefresh);
      return token;
    } catch (error) {
      console.error("Error retrieving JWT token:", error);
      return null;
    }
  },

  checkAdminRole: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isAdmin = userData?.role === "admin";
        set({ isAdmin });
      } else {
        set({ isAdmin: false });
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      set({ isAdmin: false });
    }
  },
}));
