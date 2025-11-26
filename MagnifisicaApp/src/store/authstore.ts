import { create } from "zustand";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";

const auth = getAuth();

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;

  checkAuth: () => () => void;
  logout: () => void;

  /**
   * Retrieves the current valid ID token (JWT) for the user.
   * Firebase handles expiration and refreshing automatically.
   * @param forceRefresh - Set to true if your backend returns a 401, forcing a fresh token fetch.
   */
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  checkAuth: () => {
    set({ isLoading: true });
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user: user, isLoading: false });
    });
    return unsubscribe;
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null });
  },

  // --- IMPLEMENTATION OF SECURE JWT TOKEN RETRIEVAL ---
  getToken: async (forceRefresh = false) => {
    // Firebase ID Tokens are JWTs. This method retrieves the current valid JWT.
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return null;
    }

    try {
      // getIdToken handles the "Token expired" and "Refresh token" steps
      // shown in your diagram automatically.
      const token = await currentUser.getIdToken(forceRefresh);
      return token;
    } catch (error) {
      console.error("Error retrieving JWT token:", error);
      return null;
    }
  },
}));
