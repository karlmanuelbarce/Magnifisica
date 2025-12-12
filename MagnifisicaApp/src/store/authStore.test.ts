// src/store/authStore.test.ts
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";

// Create mock auth object that will be returned by getAuth()
const mockAuth = {
  currentUser: null,
};

// Mock Firebase Auth module
jest.mock("@react-native-firebase/auth", () => {
  const mockAuthInstance = {
    currentUser: null,
  };

  return {
    getAuth: jest.fn(() => mockAuthInstance),
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(),
  };
});

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    setUserId: jest.fn(),
    setAttribute: jest.fn(),
  },
}));

// Import after mocking
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "@react-native-firebase/auth";
import { doc, getDoc } from "@react-native-firebase/firestore";
import { useAuthStore } from "./authStore";
import { logger } from "../utils/logger";

describe("useAuthStore", () => {
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
  const mockSignOut = signOut as jest.Mock;
  const mockGetDoc = getDoc as jest.Mock;

  // Get the mock auth instance
  const authInstance = (getAuth as jest.Mock)();

  const mockUser: Partial<FirebaseAuthTypes.User> = {
    uid: "test-user-123",
    email: "test@example.com",
    getIdToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock auth state
    authInstance.currentUser = null;

    // Reset store state
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAdmin: false,
    });
  });

  describe("checkAuth", () => {
    it("should initialize auth state listener", () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.checkAuth();
      });

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Initializing auth state listener",
        null,
        "AuthStore"
      );
    });

    it("should set user when authenticated", async () => {
      const unsubscribe = jest.fn();
      let authCallback: (user: FirebaseAuthTypes.User | null) => void;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return unsubscribe;
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "user" }),
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.checkAuth();
      });

      await act(async () => {
        authCallback(mockUser as FirebaseAuthTypes.User);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
        expect(logger.setUserId).toHaveBeenCalledWith("test-user-123");
      });
    });

    it("should set user as admin when role is admin", async () => {
      let authCallback: (user: FirebaseAuthTypes.User | null) => void;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "admin" }),
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.checkAuth();
      });

      await act(async () => {
        authCallback(mockUser as FirebaseAuthTypes.User);
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
        expect(logger.setAttribute).toHaveBeenCalledWith("user_role", "admin");
      });
    });

    it("should clear user state when logged out", async () => {
      let authCallback: (user: FirebaseAuthTypes.User | null) => void;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.checkAuth();
      });

      await act(async () => {
        authCallback(null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should return unsubscribe function", () => {
      const unsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const { result } = renderHook(() => useAuthStore());

      const returnedUnsubscribe = result.current.checkAuth();

      expect(returnedUnsubscribe).toBe(unsubscribe);
    });
  });

  describe("logout", () => {
    it("should sign out user successfully", async () => {
      mockSignOut.mockResolvedValue(undefined);

      useAuthStore.setState({
        user: mockUser as FirebaseAuthTypes.User,
        isAdmin: true,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(logger.success).toHaveBeenCalledWith(
        "User logged out successfully",
        { userId: "test-user-123" },
        "AuthStore"
      );
    });

    it("should handle logout errors", async () => {
      const error = new Error("Logout failed");
      mockSignOut.mockRejectedValue(error);

      useAuthStore.setState({
        user: mockUser as FirebaseAuthTypes.User,
      });

      const { result } = renderHook(() => useAuthStore());

      await expect(result.current.logout()).rejects.toThrow("Logout failed");
      expect(logger.error).toHaveBeenCalledWith(
        "Error during logout",
        error,
        "AuthStore"
      );
    });
  });

  describe("getToken", () => {
    it("should return token for authenticated user", async () => {
      const mockToken = "mock-jwt-token-123";
      const mockGetIdToken = jest.fn().mockResolvedValue(mockToken);

      // Set current user on the auth instance
      authInstance.currentUser = {
        uid: "test-user-123",
        getIdToken: mockGetIdToken,
      } as any;

      const { result } = renderHook(() => useAuthStore());

      const token = await result.current.getToken();

      expect(token).toBe(mockToken);
      expect(mockGetIdToken).toHaveBeenCalledWith(false);
    });

    it("should force refresh token when requested", async () => {
      const mockToken = "refreshed-token";
      const mockGetIdToken = jest.fn().mockResolvedValue(mockToken);

      authInstance.currentUser = {
        uid: "test-user-123",
        getIdToken: mockGetIdToken,
      } as any;

      const { result } = renderHook(() => useAuthStore());

      await result.current.getToken(true);

      expect(mockGetIdToken).toHaveBeenCalledWith(true);
    });

    it("should return null when no user is authenticated", async () => {
      authInstance.currentUser = null;

      const { result } = renderHook(() => useAuthStore());

      const token = await result.current.getToken();

      expect(token).toBeNull();
    });

    it("should handle token retrieval errors", async () => {
      const error = new Error("Token error");
      const mockGetIdToken = jest.fn().mockRejectedValue(error);

      authInstance.currentUser = {
        uid: "test-user-123",
        getIdToken: mockGetIdToken,
      } as any;

      const { result } = renderHook(() => useAuthStore());

      const token = await result.current.getToken();

      expect(token).toBeNull();
    });
  });

  describe("checkAdminRole", () => {
    it("should set isAdmin to true when user has admin role", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "admin" }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAdminRole("test-user-123");
      });

      expect(result.current.isAdmin).toBe(true);
      expect(logger.setAttribute).toHaveBeenCalledWith("user_role", "admin");
    });

    it("should set isAdmin to false when user has regular role", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "user" }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAdminRole("test-user-123");
      });

      expect(result.current.isAdmin).toBe(false);
      expect(logger.setAttribute).toHaveBeenCalledWith("user_role", "user");
    });

    it("should handle non-existent user document", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAdminRole("test-user-123");
      });

      expect(result.current.isAdmin).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "User document not found in Firestore",
        { userId: "test-user-123" },
        "AuthStore"
      );
    });

    it("should handle errors when checking admin role", async () => {
      const error = new Error("Firestore error");
      mockGetDoc.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAdminRole("test-user-123");
      });

      expect(result.current.isAdmin).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Error checking admin role",
        error,
        "AuthStore"
      );
    });
  });
});
