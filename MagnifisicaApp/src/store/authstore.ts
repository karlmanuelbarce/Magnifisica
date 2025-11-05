import { create } from "zustand";
// --- 1. Import the new modular functions ---
import {
  getAuth, // This gets the auth service
  onAuthStateChanged, // This is the new listener function
  signOut, // This is the new sign-out function
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";

// --- 2. Get the auth instance once ---
// You can do this outside the store, it's a singleton
const auth = getAuth();

// Define the shape of your state
interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  // Update the type: checkAuth will now return the unsubscribe function
  checkAuth: () => () => void;
  logout: () => void;
}

// Create the store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  // An action to check auth state and set up the listener
  checkAuth: () => {
    set({ isLoading: true });

    // --- 3. Use the new 'onAuthStateChanged' syntax ---
    // You pass the 'auth' instance as the first argument
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // When the listener fires, update the store's state
      set({ user: user, isLoading: false });
    });

    // --- 4. Return the unsubscribe function ---
    // This allows your app to clean up the listener when it unmounts
    return unsubscribe;
  },

  // An action to log out
  logout: async () => {
    // --- 5. Use the new 'signOut' syntax ---
    await signOut(auth);
    // The onAuthStateChanged listener will automatically
    // update the user to 'null' for us.
  },
}));
