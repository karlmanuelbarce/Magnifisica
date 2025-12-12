import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
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
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";
import { ExerciseService } from "./ExerciseService";
import { ExerciseTodo } from "../types/ExerciseTodo";
import { logger } from "../utils/logger";

describe("ExerciseService", () => {
  const mockCollection = collection as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockOnSnapshot = onSnapshot as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockUpdateDoc = updateDoc as jest.Mock;
  const mockDeleteDoc = deleteDoc as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({
      _collectionPath: "exercises_taken_by_user",
    });
    mockQuery.mockReturnValue({ _query: "filtered" });
    mockWhere.mockReturnValue({ _where: "condition" });
    mockDoc.mockReturnValue({
      _documentPath: "exercises_taken_by_user/test-id",
    });
  });

  describe("subscribeToUserExercises", () => {
    it("subscribes to user exercises successfully", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      const mockDocs = [
        {
          id: "exercise-1",
          data: () => ({
            name: "Push-ups",
            isDone: false,
          }),
        },
        {
          id: "exercise-2",
          data: () => ({
            name: "Squats",
            isDone: true,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return mockUnsubscribe;
      });

      const unsubscribe = ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Subscribing to user exercises",
        { userId: "user-123" },
        "ExerciseService"
      );

      expect(mockCollection).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith("userID", "==", "user-123");

      expect(mockOnUpdate).toHaveBeenCalledWith([
        {
          id: "exercise-1",
          name: "Push-ups",
          isDone: false,
        },
        {
          id: "exercise-2",
          name: "Squats",
          isDone: true,
        },
      ]);

      expect(logger.debug).toHaveBeenCalledWith(
        "User exercises updated: 2",
        { userId: "user-123", count: 2 },
        "ExerciseService"
      );

      expect(mockOnError).not.toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("returns empty array when user has no exercises", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => {},
        });
        return jest.fn();
      });

      ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalledWith([]);

      expect(logger.debug).toHaveBeenCalledWith(
        "User exercises updated: 0",
        { userId: "user-123", count: 0 },
        "ExerciseService"
      );
    });

    it("uses default values for missing fields", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockDocs = [
        {
          id: "exercise-1",
          data: () => ({}), // Missing name and isDone
        },
        {
          id: "exercise-2",
          data: () => ({
            name: "Squats",
            // Missing isDone
          }),
        },
        {
          id: "exercise-3",
          data: () => ({
            // Missing name
            isDone: "not-boolean", // Invalid isDone value
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return jest.fn();
      });

      ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalledWith([
        {
          id: "exercise-1",
          name: "Unknown Exercise",
          isDone: false,
        },
        {
          id: "exercise-2",
          name: "Squats",
          isDone: false,
        },
        {
          id: "exercise-3",
          name: "Unknown Exercise",
          isDone: false,
        },
      ]);
    });

    it("correctly handles isDone boolean values", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockDocs = [
        {
          id: "exercise-1",
          data: () => ({
            name: "Push-ups",
            isDone: true,
          }),
        },
        {
          id: "exercise-2",
          data: () => ({
            name: "Squats",
            isDone: false,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return jest.fn();
      });

      ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      const exercises = mockOnUpdate.mock.calls[0][0];
      expect(exercises[0].isDone).toBe(true);
      expect(exercises[1].isDone).toBe(false);
    });

    it("calls onError when subscription fails", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("Subscription error");

      mockOnSnapshot.mockImplementation((queryRef, onNext, onError) => {
        onError(error);
        return jest.fn();
      });

      ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnError).toHaveBeenCalledWith(error);

      expect(logger.error).toHaveBeenCalledWith(
        "Error in subscribeToUserExercises",
        error,
        "ExerciseService"
      );
    });

    it("returns unsubscribe function", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(typeof unsubscribe).toBe("function");
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("handles real-time updates correctly", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const initialDocs = [
        {
          id: "exercise-1",
          data: () => ({
            name: "Push-ups",
            isDone: false,
          }),
        },
      ];

      const updatedDocs = [
        {
          id: "exercise-1",
          data: () => ({
            name: "Push-ups",
            isDone: true, // Changed status
          }),
        },
        {
          id: "exercise-2",
          data: () => ({
            name: "Squats",
            isDone: false,
          }),
        },
      ];

      let snapshotCallback: any;

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        snapshotCallback = onNext;
        onNext({
          forEach: (callback: any) => initialDocs.forEach(callback),
        });
        return jest.fn();
      });

      ExerciseService.subscribeToUserExercises(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      // Initial call
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      expect(mockOnUpdate).toHaveBeenCalledWith([
        {
          id: "exercise-1",
          name: "Push-ups",
          isDone: false,
        },
      ]);

      // Simulate real-time update
      snapshotCallback({
        forEach: (callback: any) => updatedDocs.forEach(callback),
      });

      // Second call with updated data
      expect(mockOnUpdate).toHaveBeenCalledTimes(2);
      expect(mockOnUpdate).toHaveBeenCalledWith([
        {
          id: "exercise-1",
          name: "Push-ups",
          isDone: true,
        },
        {
          id: "exercise-2",
          name: "Squats",
          isDone: false,
        },
      ]);
    });
  });

  describe("toggleExerciseStatus", () => {
    it("toggles exercise status from false to true", async () => {
      const mockDocRef = {
        _documentPath: "exercises_taken_by_user/exercise-1",
      };

      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      await ExerciseService.toggleExerciseStatus("exercise-1", false);

      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
        isDone: true,
      });

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise status toggled: true",
        { exerciseId: "exercise-1", oldStatus: false, newStatus: true },
        "ExerciseService"
      );
    });

    it("toggles exercise status from true to false", async () => {
      const mockDocRef = {
        _documentPath: "exercises_taken_by_user/exercise-1",
      };

      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      await ExerciseService.toggleExerciseStatus("exercise-1", true);

      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
        isDone: false,
      });

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise status toggled: false",
        { exerciseId: "exercise-1", oldStatus: true, newStatus: false },
        "ExerciseService"
      );
    });

    it("handles errors when toggling status fails", async () => {
      const error = new Error("Update failed");
      mockUpdateDoc.mockRejectedValue(error);

      await expect(
        ExerciseService.toggleExerciseStatus("exercise-1", false)
      ).rejects.toThrow("UPDATE_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error toggling exercise status",
        error,
        "ExerciseService"
      );
    });

    it("calls updateDoc with correct document reference", async () => {
      const mockDocRef = {
        _documentPath: "exercises_taken_by_user/test-exercise",
      };

      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      await ExerciseService.toggleExerciseStatus("test-exercise", false);

      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, { isDone: true });
    });
  });

  describe("removeUserExercise", () => {
    it("removes exercise successfully", async () => {
      const mockDocRef = {
        _documentPath: "exercises_taken_by_user/exercise-1",
      };

      mockDoc.mockReturnValue(mockDocRef);
      mockDeleteDoc.mockResolvedValue(undefined);

      await ExerciseService.removeUserExercise("exercise-1");

      expect(mockDeleteDoc).toHaveBeenCalledWith(mockDocRef);

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise removed: exercise-1",
        { exerciseId: "exercise-1" },
        "ExerciseService"
      );
    });

    it("handles errors when removing exercise fails", async () => {
      const error = new Error("Delete failed");
      mockDeleteDoc.mockRejectedValue(error);

      await expect(
        ExerciseService.removeUserExercise("exercise-1")
      ).rejects.toThrow("DELETE_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error removing exercise",
        error,
        "ExerciseService"
      );
    });

    it("calls deleteDoc with correct document reference", async () => {
      const mockDocRef = {
        _documentPath: "exercises_taken_by_user/test-exercise",
      };

      mockDoc.mockReturnValue(mockDocRef);
      mockDeleteDoc.mockResolvedValue(undefined);

      await ExerciseService.removeUserExercise("test-exercise");

      expect(mockDeleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it("handles multiple exercise removals", async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await ExerciseService.removeUserExercise("exercise-1");
      await ExerciseService.removeUserExercise("exercise-2");
      await ExerciseService.removeUserExercise("exercise-3");

      expect(mockDeleteDoc).toHaveBeenCalledTimes(3);
      expect(logger.success).toHaveBeenCalledTimes(3);
    });
  });
});
