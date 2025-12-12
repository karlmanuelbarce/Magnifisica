import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(),
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 4,
  },
}));

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  getDocs: jest.fn(),
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

// Import after mocking
import notifee from "@notifee/react-native";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "@react-native-firebase/firestore";
import { challengeService } from "./ChallengeService";
import { Challenge } from "../components/ChallengeCard";
import { logger } from "../utils/logger";

describe("ChallengeService", () => {
  const mockCollection = collection as jest.Mock;
  const mockOnSnapshot = onSnapshot as jest.Mock;
  const mockAddDoc = addDoc as jest.Mock;
  const mockUpdateDoc = updateDoc as jest.Mock;
  const mockDeleteDoc = deleteDoc as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;

  const mockNotifee = notifee as jest.Mocked<typeof notifee>;

  const mockChallenge: Omit<Challenge, "id"> = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    challengeService.resetNotifications();

    // Setup default return values for collection and doc
    mockCollection.mockReturnValue({ _collectionPath: "Challenge" });
    mockDoc.mockReturnValue({ _documentPath: "Challenge/test-id" });
  });

  describe("fetchChallenges", () => {
    it("fetches all challenges successfully", async () => {
      const mockDocs = [
        {
          id: "challenge-1",
          data: () => ({ ...mockChallenge, title: "Challenge 1" }),
        },
        {
          id: "challenge-2",
          data: () => ({ ...mockChallenge, title: "Challenge 2" }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      });

      const challenges = await challengeService.fetchChallenges();

      expect(challenges).toHaveLength(2);
      expect(challenges[0].id).toBe("challenge-1");
      expect(challenges[0].title).toBe("Challenge 1");
      expect(challenges[1].id).toBe("challenge-2");
      expect(challenges[1].title).toBe("Challenge 2");
      expect(logger.success).toHaveBeenCalledWith(
        "Fetched challenges: 2",
        { count: 2 },
        "ChallengeService"
      );
    });

    it("returns empty array when no challenges exist", async () => {
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {},
      });

      const challenges = await challengeService.fetchChallenges();

      expect(challenges).toHaveLength(0);
      expect(logger.success).toHaveBeenCalledWith(
        "Fetched challenges: 0",
        { count: 0 },
        "ChallengeService"
      );
    });

    it("handles errors when fetching challenges", async () => {
      const error = new Error("Firestore error");
      mockGetDocs.mockRejectedValue(error);

      await expect(challengeService.fetchChallenges()).rejects.toThrow(
        "Firestore error"
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching challenges",
        error,
        "ChallengeService"
      );
    });
  });

  describe("subscribeToChallenges", () => {
    it("subscribes to challenges and receives updates", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      const mockDocs = [
        {
          id: "challenge-1",
          data: () => mockChallenge,
        },
      ];

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        onNext({
          docChanges: () => [],
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return mockUnsubscribe;
      });

      const unsubscribe = challengeService.subscribeToChallenges(
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalledWith([
        {
          ...mockChallenge,
          id: "challenge-1",
        },
      ]);
      expect(mockOnError).not.toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("displays notification for new challenges", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const newChallenge = {
        doc: {
          id: "new-challenge-1",
          data: () => mockChallenge,
        },
        type: "added",
      };

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => {
            callback(newChallenge.doc);
          },
        });
        return jest.fn();
      });

      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);

      expect(logger.info).toHaveBeenCalledWith(
        `New challenge detected: ${mockChallenge.title}`,
        { challengeId: "new-challenge-1", title: mockChallenge.title },
        "ChallengeService"
      );
    });

    it("does not show notification for the same challenge twice", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const newChallenge = {
        doc: {
          id: "challenge-1",
          data: () => mockChallenge,
        },
        type: "added",
      };

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        // Trigger twice with same challenge
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => callback(newChallenge.doc),
        });
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => callback(newChallenge.doc),
        });
        return jest.fn();
      });

      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);

      // Logger.info should only be called once
      expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it("calls onError when subscription fails", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("Subscription error");

      mockOnSnapshot.mockImplementation((collectionRef, onNext, onError) => {
        onError(error);
        return jest.fn();
      });

      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Error in challenges subscription",
        error,
        "ChallengeService"
      );
    });

    it("returns unsubscribe function", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = challengeService.subscribeToChallenges(
        mockOnUpdate,
        mockOnError
      );

      expect(typeof unsubscribe).toBe("function");
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe("createChallenge", () => {
    it("creates a new challenge successfully", async () => {
      const mockDocRef = { id: "new-challenge-123" };
      const mockCollectionRef = { _collectionPath: "Challenge" };

      mockCollection.mockReturnValue(mockCollectionRef);
      mockAddDoc.mockResolvedValue(mockDocRef);

      const newChallenge = await challengeService.createChallenge(
        mockChallenge
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        mockCollectionRef,
        expect.objectContaining({
          ...mockChallenge,
          createdAt: expect.anything(),
        })
      );

      expect(newChallenge.id).toBe("new-challenge-123");
      expect(newChallenge.title).toBe(mockChallenge.title);

      expect(logger.success).toHaveBeenCalledWith(
        `Challenge created: ${mockChallenge.title}`,
        { challengeId: "new-challenge-123", title: mockChallenge.title },
        "ChallengeService"
      );
    });

    it("includes server timestamp when creating challenge", async () => {
      const mockDocRef = { id: "new-challenge-123" };
      const mockCollectionRef = { _collectionPath: "Challenge" };

      mockCollection.mockReturnValue(mockCollectionRef);
      mockAddDoc.mockResolvedValue(mockDocRef);

      await challengeService.createChallenge(mockChallenge);

      expect(serverTimestamp).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalledWith(
        mockCollectionRef,
        expect.objectContaining({
          createdAt: expect.objectContaining({
            seconds: expect.any(Number),
          }),
        })
      );
    });

    it("handles errors when creating challenge", async () => {
      const error = new Error("Create failed");
      mockAddDoc.mockRejectedValue(error);

      await expect(
        challengeService.createChallenge(mockChallenge)
      ).rejects.toThrow("Create failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Error creating challenge",
        error,
        "ChallengeService"
      );
    });
  });

  describe("updateChallenge", () => {
    it("updates a challenge successfully", async () => {
      const mockDocRef = { _documentPath: "Challenge/challenge-123" };

      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      const updates = { title: "Updated Challenge Title" };
      await challengeService.updateChallenge("challenge-123", updates);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          title: "Updated Challenge Title",
          updatedAt: expect.anything(),
        })
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Challenge updated: challenge-123",
        { challengeId: "challenge-123", updates },
        "ChallengeService"
      );
    });

    it("includes server timestamp when updating challenge", async () => {
      const mockDocRef = { _documentPath: "Challenge/challenge-123" };

      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      await challengeService.updateChallenge("challenge-123", {
        title: "New Title",
      });

      expect(serverTimestamp).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          updatedAt: expect.objectContaining({
            seconds: expect.any(Number),
          }),
        })
      );
    });

    it("handles errors when updating challenge", async () => {
      const error = new Error("Update failed");
      mockUpdateDoc.mockRejectedValue(error);

      await expect(
        challengeService.updateChallenge("challenge-123", {
          title: "New Title",
        })
      ).rejects.toThrow("Update failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Error updating challenge",
        error,
        "ChallengeService"
      );
    });
  });

  describe("deleteChallenge", () => {
    it("deletes a challenge successfully", async () => {
      const mockDocRef = { _documentPath: "Challenge/challenge-123" };

      mockDoc.mockReturnValue(mockDocRef);
      mockDeleteDoc.mockResolvedValue(undefined);

      await challengeService.deleteChallenge("challenge-123");

      expect(mockDeleteDoc).toHaveBeenCalledWith(mockDocRef);
      expect(logger.success).toHaveBeenCalledWith(
        "Challenge deleted: challenge-123",
        { challengeId: "challenge-123" },
        "ChallengeService"
      );
    });

    it("handles errors when deleting challenge", async () => {
      const error = new Error("Delete failed");
      mockDeleteDoc.mockRejectedValue(error);

      await expect(
        challengeService.deleteChallenge("challenge-123")
      ).rejects.toThrow("Delete failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Error deleting challenge",
        error,
        "ChallengeService"
      );
    });
  });

  describe("displayNotification", () => {
    it("requests permission before displaying notification", async () => {
      mockNotifee.requestPermission.mockResolvedValue({
        authorizationStatus: 1,
      } as any);
      mockNotifee.createChannel.mockResolvedValue("new-challenge");
      mockNotifee.displayNotification.mockResolvedValue("notification-id");

      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const newChallenge = {
        doc: {
          id: "challenge-1",
          data: () => mockChallenge,
        },
        type: "added",
      };

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => callback(newChallenge.doc),
        });
        return jest.fn();
      });

      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockNotifee.requestPermission).toHaveBeenCalled();
    });

    it("creates notification channel before displaying", async () => {
      mockNotifee.requestPermission.mockResolvedValue({
        authorizationStatus: 1,
      } as any);
      mockNotifee.createChannel.mockResolvedValue("new-challenge");
      mockNotifee.displayNotification.mockResolvedValue("notification-id");

      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const newChallenge = {
        doc: {
          id: "challenge-1",
          data: () => mockChallenge,
        },
        type: "added",
      };

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => callback(newChallenge.doc),
        });
        return jest.fn();
      });

      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockNotifee.createChannel).toHaveBeenCalledWith({
        id: "new-challenge",
        name: "New Challenges",
        importance: 4, // AndroidImportance.HIGH
      });
    });
  });

  describe("resetNotifications", () => {
    it("clears notification tracking", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const newChallenge = {
        doc: {
          id: "challenge-1",
          data: () => mockChallenge,
        },
        type: "added",
      };

      mockOnSnapshot.mockImplementation((collectionRef, onNext) => {
        onNext({
          docChanges: () => [newChallenge],
          forEach: (callback: any) => callback(newChallenge.doc),
        });
        return jest.fn();
      });

      // First subscription
      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);
      expect(logger.info).toHaveBeenCalledTimes(1);

      // Reset
      challengeService.resetNotifications();

      // Second subscription should show notification again
      challengeService.subscribeToChallenges(mockOnUpdate, mockOnError);
      expect(logger.info).toHaveBeenCalledTimes(2);

      expect(logger.debug).toHaveBeenCalledWith(
        "Notification tracking reset",
        null,
        "ChallengeService"
      );
    });
  });
});
