import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
}));

jest.mock("../store/authstore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, "alert");

// Import after mocking
import ChallengeCard, { Challenge } from "./ChallengeCard";
import { useAuthStore } from "../store/authstore";
import { doc, getDoc, setDoc } from "@react-native-firebase/firestore";
import { logger } from "../utils/logger";

describe("ChallengeCard", () => {
  const mockGetDoc = getDoc as jest.Mock;
  const mockSetDoc = setDoc as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockUseAuthStore = useAuthStore as jest.Mock;

  // Mock challenge data
  const mockChallenge: Challenge = {
    id: "challenge-123",
    title: "30 Day Running Challenge",
    description: "Run 100km in 30 days",
    startDate: {
      toDate: () => new Date("2024-01-01"),
    } as FirebaseFirestoreTypes.Timestamp,
    endDate: {
      toDate: () => new Date("2024-01-31"),
    } as FirebaseFirestoreTypes.Timestamp,
    TargetMetre: 100000,
  };

  const mockUser = {
    uid: "user-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
    mockDoc.mockReturnValue({ path: "mock-doc-path" });
  });

  describe("Rendering", () => {
    it("renders challenge information correctly", () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      expect(getByText("30 Day Running Challenge")).toBeTruthy();
      expect(getByText("Run 100km in 30 days")).toBeTruthy();
      expect(getByText("Starts: Jan 1, 2024")).toBeTruthy();
      expect(getByText("Ends: Jan 31, 2024")).toBeTruthy();
    });

    it('shows "Join Challenge" button when not joined', async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });
    });

    it('shows "Joined" button when already joined', async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => true });

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Joined")).toBeTruthy();
      });
    });

    it('shows "Loading..." while checking participation status', () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      expect(getByText("Loading...")).toBeTruthy();
    });
  });

  describe("Participation Status Check", () => {
    it("checks if user has joined challenge on mount", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(mockDoc).toHaveBeenCalledWith(
          undefined, // getFirestore() returns undefined in mocks
          "participants",
          "user-123",
          "joinedChallenges",
          "challenge-123"
        );
        expect(mockGetDoc).toHaveBeenCalled();
      });
    });

    it("does not check participation when user is not logged in", () => {
      mockUseAuthStore.mockReturnValue(null);

      render(<ChallengeCard challenge={mockChallenge} />);

      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        "No user logged in",
        null,
        "ChallengeCard"
      );
    });

    it("handles errors when checking participation status", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      const error = new Error("Firestore error");
      mockGetDoc.mockRejectedValue(error);

      render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "Error checking participation status",
          error,
          "ChallengeCard"
        );
      });
    });
  });

  describe("Join Challenge Functionality", () => {
    it("successfully joins a challenge", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            userId: "user-123",
            displayName: "test@example.com",
            progress: 0,
            isCompleted: false,
            challengeId: "challenge-123",
            challengeTitle: "30 Day Running Challenge",
            challengeDescription: "Run 100km in 30 days",
            targetMetre: 100000,
          })
        );

        expect(logger.success).toHaveBeenCalledWith(
          "User successfully joined challenge",
          expect.objectContaining({
            userId: "user-123",
            challengeId: "challenge-123",
          }),
          "ChallengeCard"
        );

        expect(Alert.alert).toHaveBeenCalledWith(
          "Success!",
          'You have joined the "30 Day Running Challenge" challenge.'
        );
      });
    });

    it('updates UI to show "Joined" after successfully joining', async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      await waitFor(() => {
        expect(getByText("Joined")).toBeTruthy();
      });
    });

    it("shows alert when joining without being logged in", async () => {
      mockUseAuthStore.mockReturnValue(null);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      // Button will show "Join Challenge" when no user
      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      expect(logger.warn).toHaveBeenCalledWith(
        "Join attempt without logged in user",
        null,
        "ChallengeCard"
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "You must be logged in to join a challenge."
      );

      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("handles error when joining challenge fails", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });
      const error = new Error("Network error");
      mockSetDoc.mockRejectedValue(error);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "Failed to join challenge",
          expect.objectContaining({
            error,
            userId: "user-123",
            challengeId: "challenge-123",
          }),
          "ChallengeCard"
        );

        expect(Alert.alert).toHaveBeenCalledWith(
          "Error",
          "Could not join the challenge. Please try again."
        );
      });
    });

    it("includes serverTimestamp in join data", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            joinedAt: expect.objectContaining({
              seconds: expect.any(Number),
            }),
          })
        );
      });
    });
  });

  describe("Button States", () => {
    it("disables button while checking participation", () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockImplementation(() => new Promise(() => {}));

      const { getByText, UNSAFE_getByType } = render(
        <ChallengeCard challenge={mockChallenge} />
      );

      // Verify the button text shows loading state
      expect(getByText("Loading...")).toBeTruthy();

      // Try to press the button and verify setDoc is not called
      const button = getByText("Loading...");
      fireEvent.press(button);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("disables button when already joined", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => true });

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Joined")).toBeTruthy();
      });

      // Try to press the "Joined" button and verify setDoc is not called
      const button = getByText("Joined");
      fireEvent.press(button);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("disables button while joining is in progress", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      let resolveSetDoc: () => void;
      const setDocPromise = new Promise<void>((resolve) => {
        resolveSetDoc = resolve;
      });
      mockSetDoc.mockReturnValue(setDocPromise);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      // First press
      await act(async () => {
        fireEvent.press(joinButton);
      });

      // Try to press again while loading - should not call setDoc again
      fireEvent.press(joinButton);

      // Resolve the first promise
      await act(async () => {
        resolveSetDoc!();
        await setDocPromise;
      });

      // Verify setDoc was only called once (from first press)
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe("Logging", () => {
    it("logs when user attempts to join challenge", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      await act(async () => {
        fireEvent.press(joinButton);
      });

      expect(logger.info).toHaveBeenCalledWith(
        "User attempting to join challenge",
        {
          userId: "user-123",
          challengeId: "challenge-123",
          challengeTitle: "30 Day Running Challenge",
        },
        "ChallengeCard"
      );
    });

    it("logs when participation check finds user already joined", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => true });

      render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "User already joined challenge",
          { challengeTitle: "30 Day Running Challenge" },
          "ChallengeCard"
        );
      });
    });

    it("logs when participation check finds user has not joined", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith(
          "User has not joined challenge",
          { challengeTitle: "30 Day Running Challenge" },
          "ChallengeCard"
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles invalid timestamp gracefully", () => {
      const invalidChallenge = {
        ...mockChallenge,
        startDate: null as any,
        endDate: null as any,
      };

      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const { getByText } = render(
        <ChallengeCard challenge={invalidChallenge} />
      );

      expect(getByText("Starts: N/A")).toBeTruthy();
      expect(getByText("Ends: N/A")).toBeTruthy();
    });

    it("prevents button press while loading", async () => {
      mockUseAuthStore.mockReturnValue(mockUser);
      mockGetDoc.mockResolvedValue({ exists: () => false });

      let resolveSetDoc: () => void;
      const setDocPromise = new Promise<void>((resolve) => {
        resolveSetDoc = resolve;
      });
      mockSetDoc.mockReturnValue(setDocPromise);

      const { getByText } = render(<ChallengeCard challenge={mockChallenge} />);

      await waitFor(() => {
        expect(getByText("Join Challenge")).toBeTruthy();
      });

      const joinButton = getByText("Join Challenge");

      // First press
      await act(async () => {
        fireEvent.press(joinButton);
      });

      // Verify button is in loading state and can't be pressed again
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Try to press again while loading
      fireEvent.press(joinButton);

      // Should still only have been called once
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Resolve the promise
      await act(async () => {
        resolveSetDoc!();
        await setDocPromise;
      });

      // After completion, should show "Joined" button
      await waitFor(() => {
        expect(getByText("Joined")).toBeTruthy();
      });
    });
  });
});
