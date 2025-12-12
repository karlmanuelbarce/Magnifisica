import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies BEFORE any imports that use them
jest.mock("../services/challengeService", () => ({
  challengeService: {
    fetchChallenges: jest.fn(),
    subscribeToChallenges: jest.fn(),
    createChallenge: jest.fn(),
    updateChallenge: jest.fn(),
    deleteChallenge: jest.fn(),
  },
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
import { challengeService } from "../services/challengeService";
import {
  useChallenges,
  useCreateChallenge,
  useUpdateChallenge,
  useDeleteChallenge,
} from "./useChallenge"; // Changed from useChallenges to useChallenge (singular)
import { Challenge } from "../components/ChallengeCard";
import { logger } from "../utils/logger";

// Mock challenge data
const mockChallenge: Challenge = {
  id: "challenge-1",
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

const mockChallenge2: Challenge = {
  id: "challenge-2",
  title: "60 Day Marathon Prep",
  description: "Prepare for marathon",
  startDate: {
    toDate: () => new Date("2024-02-01"),
  } as FirebaseFirestoreTypes.Timestamp,
  endDate: {
    toDate: () => new Date("2024-04-01"),
  } as FirebaseFirestoreTypes.Timestamp,
  TargetMetre: 200000,
};

describe("useChallenges", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Create wrapper with QueryClientProvider
    wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useChallenges", () => {
    it("fetches challenges on mount", async () => {
      const mockChallenges = [mockChallenge, mockChallenge2];
      const mockUnsubscribe = jest.fn();

      (challengeService.fetchChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const { result } = renderHook(() => useChallenges(), { wrapper });

      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching challenges from Firestore",
        null,
        "useChallenges"
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockChallenges);
      expect(challengeService.fetchChallenges).toHaveBeenCalledTimes(1);
    });

    it("sets up real-time subscription on mount", async () => {
      const mockChallenges = [mockChallenge];
      const mockUnsubscribe = jest.fn();

      (challengeService.fetchChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => {
        expect(challengeService.subscribeToChallenges).toHaveBeenCalledTimes(1);
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Setting up real-time challenge subscription",
        null,
        "useChallenges"
      );

      expect(challengeService.subscribeToChallenges).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("updates cache when real-time data is received", async () => {
      const initialChallenges = [mockChallenge];
      const updatedChallenges = [mockChallenge, mockChallenge2];
      const mockUnsubscribe = jest.fn();

      let subscriptionCallback: (challenges: Challenge[]) => void;

      (challengeService.fetchChallenges as jest.Mock).mockResolvedValue(
        initialChallenges
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockImplementation(
        (onUpdate, onError) => {
          subscriptionCallback = onUpdate;
          return mockUnsubscribe;
        }
      );

      const { result } = renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Initial data
      expect(result.current.data).toEqual(initialChallenges);

      // Trigger real-time update
      subscriptionCallback!(updatedChallenges);

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedChallenges);
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Real-time challenge update received",
        { count: 2 },
        "useChallenges"
      );
    });

    it("handles subscription errors", async () => {
      const mockChallenges = [mockChallenge];
      const mockUnsubscribe = jest.fn();
      const subscriptionError = new Error("Subscription failed");

      let errorCallback: (error: Error) => void;

      (challengeService.fetchChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockImplementation(
        (onUpdate, onError) => {
          errorCallback = onError;
          return mockUnsubscribe;
        }
      );

      renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => {
        expect(challengeService.subscribeToChallenges).toHaveBeenCalled();
      });

      // Trigger error
      errorCallback!(subscriptionError);

      expect(logger.error).toHaveBeenCalledWith(
        "Challenge subscription error",
        subscriptionError,
        "useChallenges"
      );
    });

    it("unsubscribes on unmount", async () => {
      const mockChallenges = [mockChallenge];
      const mockUnsubscribe = jest.fn();

      (challengeService.fetchChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const { unmount } = renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => {
        expect(challengeService.subscribeToChallenges).toHaveBeenCalled();
      });

      unmount();

      expect(logger.debug).toHaveBeenCalledWith(
        "Cleaning up challenge subscription",
        null,
        "useChallenges"
      );
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it("returns loading state initially", () => {
      const mockUnsubscribe = jest.fn();

      (challengeService.fetchChallenges as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const { result } = renderHook(() => useChallenges(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("handles fetch errors", async () => {
      const mockError = new Error("Fetch failed");
      const mockUnsubscribe = jest.fn();

      (challengeService.fetchChallenges as jest.Mock).mockRejectedValue(
        mockError
      );
      (challengeService.subscribeToChallenges as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const { result } = renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useCreateChallenge", () => {
    it("creates a challenge successfully", async () => {
      const newChallengeData: Omit<Challenge, "id"> = {
        title: "New Challenge",
        description: "Test challenge",
        startDate: mockChallenge.startDate,
        endDate: mockChallenge.endDate,
        TargetMetre: 50000,
      };

      const createdChallenge: Challenge = {
        ...newChallengeData,
        id: "challenge-new",
      };

      (challengeService.createChallenge as jest.Mock).mockResolvedValue(
        createdChallenge
      );

      const { result } = renderHook(() => useCreateChallenge(), { wrapper });

      result.current.mutate(newChallengeData);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "Creating new challenge",
          { title: "New Challenge" },
          "useCreateChallenge"
        );
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(challengeService.createChallenge).toHaveBeenCalledWith(
        newChallengeData
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Challenge created successfully",
        {
          id: "challenge-new",
          title: "New Challenge",
        },
        "useCreateChallenge"
      );

      expect(result.current.data).toEqual(createdChallenge);
    });

    it("invalidates challenges query after successful creation", async () => {
      const newChallengeData: Omit<Challenge, "id"> = {
        title: "New Challenge",
        description: "Test challenge",
        startDate: mockChallenge.startDate,
        endDate: mockChallenge.endDate,
        TargetMetre: 50000,
      };

      const createdChallenge: Challenge = {
        ...newChallengeData,
        id: "challenge-new",
      };

      (challengeService.createChallenge as jest.Mock).mockResolvedValue(
        createdChallenge
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateChallenge(), { wrapper });

      result.current.mutate(newChallengeData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["challenges"],
      });
    });

    it("handles creation errors", async () => {
      const newChallengeData: Omit<Challenge, "id"> = {
        title: "New Challenge",
        description: "Test challenge",
        startDate: mockChallenge.startDate,
        endDate: mockChallenge.endDate,
        TargetMetre: 50000,
      };

      const error = new Error("Creation failed");

      (challengeService.createChallenge as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateChallenge(), { wrapper });

      result.current.mutate(newChallengeData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create challenge",
        error,
        "useCreateChallenge"
      );
    });
  });

  describe("useUpdateChallenge", () => {
    it("updates a challenge successfully", async () => {
      const updates: Partial<Challenge> = {
        title: "Updated Challenge Title",
        description: "Updated description",
      };

      (challengeService.updateChallenge as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useUpdateChallenge(), { wrapper });

      result.current.mutate({ id: "challenge-1", updates });

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "Updating challenge",
          {
            id: "challenge-1",
            updatedFields: ["title", "description"],
          },
          "useUpdateChallenge"
        );
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(challengeService.updateChallenge).toHaveBeenCalledWith(
        "challenge-1",
        updates
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Challenge updated successfully",
        { id: "challenge-1" },
        "useUpdateChallenge"
      );
    });

    it("invalidates challenges query after successful update", async () => {
      const updates: Partial<Challenge> = {
        title: "Updated Title",
      };

      (challengeService.updateChallenge as jest.Mock).mockResolvedValue(
        undefined
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateChallenge(), { wrapper });

      result.current.mutate({ id: "challenge-1", updates });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["challenges"],
      });
    });

    it("handles update errors", async () => {
      const updates: Partial<Challenge> = {
        title: "Updated Title",
      };

      const error = new Error("Update failed");

      (challengeService.updateChallenge as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateChallenge(), { wrapper });

      result.current.mutate({ id: "challenge-1", updates });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to update challenge",
        { error, id: "challenge-1" },
        "useUpdateChallenge"
      );
    });
  });

  describe("useDeleteChallenge", () => {
    it("deletes a challenge successfully", async () => {
      (challengeService.deleteChallenge as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useDeleteChallenge(), { wrapper });

      result.current.mutate("challenge-1");

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "Deleting challenge",
          { id: "challenge-1" },
          "useDeleteChallenge"
        );
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(challengeService.deleteChallenge).toHaveBeenCalledWith(
        "challenge-1"
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Challenge deleted successfully",
        { id: "challenge-1" },
        "useDeleteChallenge"
      );
    });

    it("invalidates challenges query after successful deletion", async () => {
      (challengeService.deleteChallenge as jest.Mock).mockResolvedValue(
        undefined
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteChallenge(), { wrapper });

      result.current.mutate("challenge-1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["challenges"],
      });
    });

    it("handles deletion errors", async () => {
      const error = new Error("Deletion failed");

      (challengeService.deleteChallenge as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteChallenge(), { wrapper });

      result.current.mutate("challenge-1");

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to delete challenge",
        { error, id: "challenge-1" },
        "useDeleteChallenge"
      );
    });
  });
});
