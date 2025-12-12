import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";

// Mock dependencies BEFORE any imports that use them
jest.mock("../services/ExerciseLibraryService", () => ({
  ExerciseLibraryService: {
    fetchAllExercises: jest.fn(),
    subscribeToUserExerciseIds: jest.fn(),
    fetchUserExerciseIds: jest.fn(),
    addExerciseToUser: jest.fn(),
    checkExerciseExists: jest.fn(),
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
import { ExerciseLibraryService } from "../services/ExerciseLibraryService";
import {
  useExerciseLibrary,
  useUserExerciseIds,
  useAddExerciseToUser,
  useCheckExerciseExists,
  useInvalidateExerciseLibrary,
  exerciseLibraryKeys,
} from "./useExerciseLibrary";
import { exerciseKeys } from "./useExercise";
import { Exercise } from "../types/Exercise";
import { logger } from "../utils/logger";

// Mock exercise data
const mockExercise1: Exercise = {
  id: "ex-1",
  name: "Push-ups",
  muscle: "Chest",
  equipment: "Body weight",
  difficulty: "Beginner",
  instructions: "Do push-ups",
};

const mockExercise2: Exercise = {
  id: "ex-2",
  name: "Squats",
  muscle: "Legs",
  equipment: "Body weight",
  difficulty: "Beginner",
  instructions: "Do squats",
};

const mockExercise3: Exercise = {
  id: "ex-3",
  name: "Pull-ups",
  muscle: "Back",
  equipment: "Pull-up bar",
  difficulty: "Intermediate",
  instructions: "Do pull-ups",
};

describe("useExerciseLibrary hooks", () => {
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

  describe("useExerciseLibrary", () => {
    it("fetches all exercises from library", async () => {
      const mockExercises = [mockExercise1, mockExercise2, mockExercise3];

      (ExerciseLibraryService.fetchAllExercises as jest.Mock).mockResolvedValue(
        mockExercises
      );

      const { result } = renderHook(() => useExerciseLibrary(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExercises);
      expect(ExerciseLibraryService.fetchAllExercises).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching exercise library",
        null,
        "useExerciseLibrary"
      );
    });

    it("handles fetch error", async () => {
      const mockError = new Error("Failed to fetch exercises");

      (ExerciseLibraryService.fetchAllExercises as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useExerciseLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it("caches exercises with correct staleTime", async () => {
      const mockExercises = [mockExercise1];

      (ExerciseLibraryService.fetchAllExercises as jest.Mock).mockResolvedValue(
        mockExercises
      );

      const { result, rerender } = renderHook(() => useExerciseLibrary(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock to verify no additional calls
      jest.clearAllMocks();

      // Rerender - should use cached data
      rerender();

      // Should not call the service again (data is still fresh)
      expect(ExerciseLibraryService.fetchAllExercises).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockExercises);
    });
  });

  describe("useUserExerciseIds", () => {
    it("sets up real-time subscription on mount", async () => {
      const mockIds = ["ex-1", "ex-2"];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseLibraryService.fetchUserExerciseIds as jest.Mock
      ).mockResolvedValue(mockIds);

      (
        ExerciseLibraryService.subscribeToUserExerciseIds as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        onUpdate(mockIds);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useUserExerciseIds("user-123"), {
        wrapper,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Setting up real-time subscription for user exercise IDs",
        { userId: "user-123" },
        "useUserExerciseIds"
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockIds);
      expect(
        ExerciseLibraryService.subscribeToUserExerciseIds
      ).toHaveBeenCalled();
    });

    it("does not subscribe when userId is undefined", () => {
      renderHook(() => useUserExerciseIds(undefined), { wrapper });

      expect(logger.debug).toHaveBeenCalledWith(
        "No userId provided, skipping exercise IDs subscription",
        null,
        "useUserExerciseIds"
      );

      expect(
        ExerciseLibraryService.subscribeToUserExerciseIds
      ).not.toHaveBeenCalled();
    });

    it("does not fetch when userId is undefined", async () => {
      const { result } = renderHook(() => useUserExerciseIds(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);

      expect(
        ExerciseLibraryService.fetchUserExerciseIds
      ).not.toHaveBeenCalled();
    });

    it("unsubscribes on unmount", async () => {
      const mockIds = ["ex-1"];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseLibraryService.fetchUserExerciseIds as jest.Mock
      ).mockResolvedValue(mockIds);

      (
        ExerciseLibraryService.subscribeToUserExerciseIds as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        onUpdate(mockIds);
        return mockUnsubscribe;
      });

      const { unmount } = renderHook(() => useUserExerciseIds("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(
          ExerciseLibraryService.subscribeToUserExerciseIds
        ).toHaveBeenCalled();
      });

      unmount();

      expect(logger.debug).toHaveBeenCalledWith(
        "Cleaning up user exercise IDs subscription",
        { userId: "user-123" },
        "useUserExerciseIds"
      );

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("handles subscription errors", async () => {
      const mockError = new Error("Subscription failed");
      const mockUnsubscribe = jest.fn();

      (
        ExerciseLibraryService.subscribeToUserExerciseIds as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        onError(mockError);
        return mockUnsubscribe;
      });

      (
        ExerciseLibraryService.fetchUserExerciseIds as jest.Mock
      ).mockResolvedValue([]);

      renderHook(() => useUserExerciseIds("user-123"), { wrapper });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "Error watching user exercise IDs",
          { error: mockError, userId: "user-123" },
          "useUserExerciseIds"
        );
      });
    });

    it("re-subscribes when userId changes", async () => {
      const mockIds1 = ["ex-1"];
      const mockIds2 = ["ex-2", "ex-3"];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseLibraryService.fetchUserExerciseIds as jest.Mock
      ).mockImplementation((userId) => {
        if (userId === "user-123") return Promise.resolve(mockIds1);
        if (userId === "user-456") return Promise.resolve(mockIds2);
        return Promise.resolve([]);
      });

      (
        ExerciseLibraryService.subscribeToUserExerciseIds as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        if (userId === "user-123") onUpdate(mockIds1);
        if (userId === "user-456") onUpdate(mockIds2);
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ userId }) => useUserExerciseIds(userId),
        {
          wrapper,
          initialProps: { userId: "user-123" },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockIds1);

      // Change userId
      rerender({ userId: "user-456" });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockIds2);
      });

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("useAddExerciseToUser", () => {
    it("adds exercise to user workout", async () => {
      (ExerciseLibraryService.addExerciseToUser as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useAddExerciseToUser(), { wrapper });

      result.current.mutate({
        userId: "user-123",
        exercise: mockExercise1,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(ExerciseLibraryService.addExerciseToUser).toHaveBeenCalledWith(
        "user-123",
        mockExercise1
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Adding exercise to user workout",
        {
          userId: "user-123",
          exerciseName: "Push-ups",
          exerciseId: "ex-1",
          muscle: "Chest",
        },
        "useAddExerciseToUser"
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise added to user workout successfully",
        {
          userId: "user-123",
          exerciseName: "Push-ups",
          exerciseId: "ex-1",
        },
        "useAddExerciseToUser"
      );
    });

    it("invalidates queries after successful addition", async () => {
      (ExerciseLibraryService.addExerciseToUser as jest.Mock).mockResolvedValue(
        undefined
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useAddExerciseToUser(), { wrapper });

      result.current.mutate({
        userId: "user-123",
        exercise: mockExercise1,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseKeys.user("user-123"),
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseLibraryKeys.userExerciseIds("user-123"),
      });
    });

    it("handles add error", async () => {
      const mockError = new Error("Failed to add exercise");

      (ExerciseLibraryService.addExerciseToUser as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useAddExerciseToUser(), { wrapper });

      result.current.mutate({
        userId: "user-123",
        exercise: mockExercise1,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to add exercise to user workout",
        {
          error: mockError,
          userId: "user-123",
          exerciseName: "Push-ups",
          exerciseId: "ex-1",
        },
        "useAddExerciseToUser"
      );
    });
  });

  describe("useCheckExerciseExists", () => {
    it("checks if exercise exists for user", async () => {
      (
        ExerciseLibraryService.checkExerciseExists as jest.Mock
      ).mockResolvedValue(true);

      const { result } = renderHook(
        () => useCheckExerciseExists("user-123", "ex-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);

      expect(logger.debug).toHaveBeenCalledWith(
        "Checking if exercise exists for user",
        { userId: "user-123", exerciseId: "ex-1" },
        "useCheckExerciseExists"
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "Exercise existence check result",
        { userId: "user-123", exerciseId: "ex-1", exists: true },
        "useCheckExerciseExists"
      );
    });

    it("returns false when exercise does not exist", async () => {
      (
        ExerciseLibraryService.checkExerciseExists as jest.Mock
      ).mockResolvedValue(false);

      const { result } = renderHook(
        () => useCheckExerciseExists("user-123", "ex-999"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(false);
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(
        () => useCheckExerciseExists(undefined, "ex-1"),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(ExerciseLibraryService.checkExerciseExists).not.toHaveBeenCalled();
    });

    it("does not fetch when exerciseId is empty", () => {
      const { result } = renderHook(
        () => useCheckExerciseExists("user-123", ""),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(ExerciseLibraryService.checkExerciseExists).not.toHaveBeenCalled();
    });

    it("handles check error", async () => {
      const mockError = new Error("Check failed");

      (
        ExerciseLibraryService.checkExerciseExists as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useCheckExerciseExists("user-123", "ex-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useInvalidateExerciseLibrary", () => {
    it("invalidates all exercise library cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateExerciseLibrary(), {
        wrapper,
      });

      await result.current.invalidateAll();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseLibraryKeys.all,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating all exercise library cache",
        null,
        "useInvalidateExerciseLibrary"
      );
    });

    it("invalidates exercise library list cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateExerciseLibrary(), {
        wrapper,
      });

      await result.current.invalidateList();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseLibraryKeys.list(),
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating exercise library list cache",
        null,
        "useInvalidateExerciseLibrary"
      );
    });

    it("invalidates user exercise IDs cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateExerciseLibrary(), {
        wrapper,
      });

      await result.current.invalidateUserIds("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseLibraryKeys.userExerciseIds("user-123"),
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating user exercise IDs cache",
        { userId: "user-123" },
        "useInvalidateExerciseLibrary"
      );
    });
  });

  describe("exerciseLibraryKeys", () => {
    it("generates correct query keys", () => {
      expect(exerciseLibraryKeys.all).toEqual(["exerciseLibrary"]);
      expect(exerciseLibraryKeys.list()).toEqual(["exerciseLibrary", "list"]);
      expect(exerciseLibraryKeys.userExerciseIds("user-123")).toEqual([
        "exerciseLibrary",
        "userIds",
        "user-123",
      ]);
    });
  });
});
