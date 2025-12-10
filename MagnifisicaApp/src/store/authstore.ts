import {
  getAuth,
  onAuthStateChanged,
  signOut,
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { getFirestore, doc, getDoc } from "@react-native-firebase/firestore";
import { create } from "zustand";

import { logger } from "../utils/logger";

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
    logger.info("Initializing auth state listener", null, "AuthStore");
    set({ isLoading: true });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        logger.info(
          "User authenticated",
          { userId: user.uid, email: user.email },
          "AuthStore"
        );

        // Set user ID for Crashlytics
        logger.setUserId(user.uid);

        // Check if user is admin
        await get().checkAdminRole(user.uid);
        set({ user: user, isLoading: false });

        logger.success(
          "Auth state updated",
          { userId: user.uid, isAdmin: get().isAdmin },
          "AuthStore"
        );
      } else {
        logger.info("User logged out or not authenticated", null, "AuthStore");
        set({ user: null, isAdmin: false, isLoading: false });
      }
    });

    return unsubscribe;
  },

  logout: async () => {
    try {
      const userId = get().user?.uid;
      logger.info("Logging out user", { userId }, "AuthStore");

      await signOut(auth);
      set({ user: null, isAdmin: false });

      logger.success("User logged out successfully", { userId }, "AuthStore");
    } catch (error) {
      logger.error("Error during logout", error, "AuthStore");
      throw error;
    }
  },

  getToken: async (forceRefresh = false) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      logger.warn(
        "No authenticated user for token retrieval",
        null,
        "AuthStore"
      );
      return null;
    }

    try {
      logger.debug(
        "Retrieving JWT token",
        { userId: currentUser.uid, forceRefresh },
        "AuthStore"
      );

      const token = await currentUser.getIdToken(forceRefresh);

      logger.debug(
        "JWT token retrieved successfully",
        { userId: currentUser.uid, tokenLength: token?.length },
        "AuthStore"
      );

      return token;
    } catch (error) {
      logger.error("Error retrieving JWT token", error, "AuthStore");
      return null;
    }
  },

  checkAdminRole: async (userId: string) => {
    try {
      logger.debug("Checking admin role", { userId }, "AuthStore");

      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isAdmin = userData?.role === "admin";

        set({ isAdmin });

        logger.info(
          `Admin role check complete: ${isAdmin ? "Admin" : "Regular user"}`,
          { userId, isAdmin, role: userData?.role },
          "AuthStore"
        );

        // Set custom attribute for Crashlytics
        logger.setAttribute("user_role", userData?.role || "user");
      } else {
        set({ isAdmin: false });
        logger.warn(
          "User document not found in Firestore",
          { userId },
          "AuthStore"
        );
      }
    } catch (error) {
      logger.error("Error checking admin role", error, "AuthStore");
      set({ isAdmin: false });
    }
  },
}));
