import { create } from "zustand";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

// Define the shape of your state
interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  checkAuth: () => void;
  logout: () => void;
}

// Create the store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Start in a loading state

  // An action to check auth state and set up the listener
  checkAuth: () => {
    // We're about to check, so set loading
    set({ isLoading: true });

    // onAuthStateChanged returns an 'unsubscribe' function
    const unsubscribe = auth().onAuthStateChanged((user) => {
      // When the listener fires, update the store's state
      set({ user: user, isLoading: false });
    });

    // Note: You might want to call unsubscribe() somewhere,
    // but for an auth listener that lives for the app's lifetime, it's often fine.
  },

  // An action to log out
  logout: async () => {
    await auth().signOut();
    // The onAuthStateChanged listener will automatically
    // update the user to 'null' for us.
  },
}));
