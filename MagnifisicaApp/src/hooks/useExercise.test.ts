import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";

// Mock dependencies BEFORE any imports that use them
jest.mock("../services/ExerciseService", () => ({
  ExerciseService: {
    subscribeToUserExercises: jest.fn(),
    toggleExerciseStatus: jest.fn(),
    removeUserExercise: jest.fn(),
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
import { ExerciseService } from "../services/ExerciseService";
import {
  useUserExercises,
  useToggleExercise,
  useRemoveExercise,
  exerciseKeys,
} from "./useExercise";
import { ExerciseTodo } from "../types/ExerciseTodo";
import { logger } from "../utils/logger";

// Mock exercise data
const mockExercise1: ExerciseTodo = {
  id: "exercise-1",
  name: "Push-ups",
  isDone: false,
};

const mockExercise2: ExerciseTodo = {
  id: "exercise-2",
  name: "Squats",
  isDone: true,
};

const mockExercise3: ExerciseTodo = {
  id: "exercise-3",
  name: "Planks",
  isDone: false,
};

describe("useUserExercises hooks", () => {
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

  describe("useUserExercises", () => {
    it("sets up real-time subscription on mount", async () => {
      const mockExercises = [mockExercise1, mockExercise2];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseService.subscribeToUserExercises as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        // Call immediately for initial data
        onUpdate(mockExercises);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useUserExercises("user-123"), {
        wrapper,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Setting up real-time exercise subscription",
        { userId: "user-123" },
        "useUserExercises"
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExercises);

      // Should be called at least twice (queryFn + useEffect), possibly more in strict mode
      expect(ExerciseService.subscribeToUserExercises).toHaveBeenCalled();
      expect(
        ExerciseService.subscribeToUserExercises.mock.calls.length
      ).toBeGreaterThanOrEqual(2);
    });

    it("does not subscribe when userId is undefined", () => {
      renderHook(() => useUserExercises(undefined), { wrapper });

      expect(logger.debug).toHaveBeenCalledWith(
        "No userId provided, skipping exercise subscription",
        null,
        "useUserExercises"
      );

      expect(ExerciseService.subscribeToUserExercises).not.toHaveBeenCalled();
    });

    it("does not fetch when userId is undefined", async () => {
      const { result } = renderHook(() => useUserExercises(undefined), {
        wrapper,
      });

      // Query is disabled when userId is undefined
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);

      // Should not call the service since query is disabled
      expect(ExerciseService.subscribeToUserExercises).not.toHaveBeenCalled();
    });

    it("unsubscribes on unmount", async () => {
      const mockExercises = [mockExercise1];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseService.subscribeToUserExercises as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        onUpdate(mockExercises);
        return mockUnsubscribe;
      });

      const { unmount } = renderHook(() => useUserExercises("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(ExerciseService.subscribeToUserExercises).toHaveBeenCalled();
      });

      unmount();

      expect(logger.debug).toHaveBeenCalledWith(
        "Cleaning up exercise subscription",
        { userId: "user-123" },
        "useUserExercises"
      );

      // Should unsubscribe (at least once from useEffect)
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("handles subscription errors", async () => {
      const mockError = new Error("Subscription failed");
      const mockUnsubscribe = jest.fn();

      (
        ExerciseService.subscribeToUserExercises as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        // Trigger error for initial fetch
        onError(mockError);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useUserExercises("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch initial exercises",
        { error: mockError, userId: "user-123" },
        "useUserExercises"
      );
    });

    it("re-subscribes when userId changes", async () => {
      const mockExercises1 = [mockExercise1];
      const mockExercises2 = [mockExercise2];
      const mockUnsubscribe = jest.fn();

      (
        ExerciseService.subscribeToUserExercises as jest.Mock
      ).mockImplementation((userId, onUpdate, onError) => {
        if (userId === "user-123") {
          onUpdate(mockExercises1);
        } else if (userId === "user-456") {
          onUpdate(mockExercises2);
        }
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ userId }) => useUserExercises(userId),
        {
          wrapper,
          initialProps: { userId: "user-123" },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExercises1);

      // Change userId
      rerender({ userId: "user-456" });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockExercises2);
      });

      // Should have unsubscribed from old subscription
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("useToggleExercise", () => {
    it("toggles exercise status with optimistic update", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      // Set initial data in cache
      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.toggleExerciseStatus as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useToggleExercise(), { wrapper });

      result.current.mutate({
        id: "exercise-1",
        currentStatus: false,
        userId: "user-123",
      });

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "Toggling exercise status",
          { id: "exercise-1", currentStatus: false, newStatus: true },
          "useToggleExercise"
        );
      });

      // Check optimistic update
      const updatedData = queryClient.getQueryData<ExerciseTodo[]>(
        exerciseKeys.user("user-123")
      );
      expect(updatedData?.[0].isDone).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(ExerciseService.toggleExerciseStatus).toHaveBeenCalledWith(
        "exercise-1",
        false
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise status toggled successfully",
        { id: "exercise-1", newStatus: true },
        "useToggleExercise"
      );
    });

    it("reverts optimistic update on error", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      // Set initial data in cache
      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      const mockError = new Error("Toggle failed");

      (ExerciseService.toggleExerciseStatus as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useToggleExercise(), { wrapper });

      result.current.mutate({
        id: "exercise-1",
        currentStatus: false,
        userId: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should revert to original data
      const revertedData = queryClient.getQueryData<ExerciseTodo[]>(
        exerciseKeys.user("user-123")
      );
      expect(revertedData?.[0].isDone).toBe(false);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to toggle exercise, reverting optimistic update",
        {
          error: mockError,
          id: "exercise-1",
          userId: "user-123",
        },
        "useToggleExercise"
      );
    });

    it("applies optimistic update immediately", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.toggleExerciseStatus as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => useToggleExercise(), { wrapper });

      result.current.mutate({
        id: "exercise-1",
        currentStatus: false,
        userId: "user-123",
      });

      // Check that optimistic update happened immediately
      await waitFor(() => {
        const updatedData = queryClient.getQueryData<ExerciseTodo[]>(
          exerciseKeys.user("user-123")
        );
        expect(updatedData?.[0].isDone).toBe(true);
      });

      // Mutation should still be pending
      expect(result.current.isPending).toBe(true);
    });

    it("invalidates query after successful toggle", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.toggleExerciseStatus as jest.Mock).mockResolvedValue(
        undefined
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useToggleExercise(), { wrapper });

      result.current.mutate({
        id: "exercise-1",
        currentStatus: false,
        userId: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseKeys.user("user-123"),
      });
    });
  });

  describe("useRemoveExercise", () => {
    it("removes exercise with optimistic update", async () => {
      const mockExercises = [mockExercise1, mockExercise2, mockExercise3];

      // Set initial data in cache
      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.removeUserExercise as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useRemoveExercise(), { wrapper });

      result.current.mutate({
        exerciseId: "exercise-2",
        userId: "user-123",
      });

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          "Removing exercise",
          { exerciseId: "exercise-2" },
          "useRemoveExercise"
        );
      });

      // Check optimistic update
      const updatedData = queryClient.getQueryData<ExerciseTodo[]>(
        exerciseKeys.user("user-123")
      );
      expect(updatedData).toHaveLength(2);
      expect(updatedData?.find((ex) => ex.id === "exercise-2")).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(ExerciseService.removeUserExercise).toHaveBeenCalledWith(
        "exercise-2"
      );

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise removed successfully",
        { exerciseId: "exercise-2" },
        "useRemoveExercise"
      );
    });

    it("reverts optimistic update on error", async () => {
      const mockExercises = [mockExercise1, mockExercise2, mockExercise3];

      // Set initial data in cache
      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      const mockError = new Error("Remove failed");

      (ExerciseService.removeUserExercise as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useRemoveExercise(), { wrapper });

      result.current.mutate({
        exerciseId: "exercise-2",
        userId: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should revert to original data
      const revertedData = queryClient.getQueryData<ExerciseTodo[]>(
        exerciseKeys.user("user-123")
      );
      expect(revertedData).toHaveLength(3);
      expect(revertedData?.find((ex) => ex.id === "exercise-2")).toBeDefined();

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to remove exercise, reverting optimistic update",
        {
          error: mockError,
          exerciseId: "exercise-2",
          userId: "user-123",
        },
        "useRemoveExercise"
      );
    });

    it("applies optimistic update immediately", async () => {
      const mockExercises = [mockExercise1, mockExercise2, mockExercise3];

      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.removeUserExercise as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => useRemoveExercise(), { wrapper });

      result.current.mutate({
        exerciseId: "exercise-2",
        userId: "user-123",
      });

      // Check that optimistic update happened immediately
      await waitFor(() => {
        const updatedData = queryClient.getQueryData<ExerciseTodo[]>(
          exerciseKeys.user("user-123")
        );
        expect(updatedData).toHaveLength(2);
      });

      // Mutation should still be pending
      expect(result.current.isPending).toBe(true);
    });

    it("invalidates query after successful removal", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.removeUserExercise as jest.Mock).mockResolvedValue(
        undefined
      );

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRemoveExercise(), { wrapper });

      result.current.mutate({
        exerciseId: "exercise-1",
        userId: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: exerciseKeys.user("user-123"),
      });
    });

    it("handles removing non-existent exercise gracefully", async () => {
      const mockExercises = [mockExercise1, mockExercise2];

      queryClient.setQueryData(exerciseKeys.user("user-123"), mockExercises);

      (ExerciseService.removeUserExercise as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useRemoveExercise(), { wrapper });

      result.current.mutate({
        exerciseId: "non-existent-id",
        userId: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should still have 2 exercises (nothing removed)
      const data = queryClient.getQueryData<ExerciseTodo[]>(
        exerciseKeys.user("user-123")
      );
      expect(data).toHaveLength(2);
    });
  });

  describe("exerciseKeys", () => {
    it("generates correct query keys", () => {
      expect(exerciseKeys.all).toEqual(["exercises"]);
      expect(exerciseKeys.user("user-123")).toEqual([
        "exercises",
        "user",
        "user-123",
      ]);
    });
  });
});
