import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
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
  getDocs,
  addDoc,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { ExerciseLibraryService } from "./ExerciseLibraryService";
import { Exercise } from "../types/Exercise";
import { logger } from "../utils/logger";

describe("ExerciseLibraryService", () => {
  const mockCollection = collection as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;
  const mockAddDoc = addDoc as jest.Mock;
  const mockOnSnapshot = onSnapshot as jest.Mock;

  const mockExercise: Exercise = {
    id: "exercise-1",
    name: "Push-ups",
    difficulty: "beginner",
    equipment: "none",
    muscle: "chest",
    type: "strength",
    instructions: "Lower your body until chest nearly touches floor",
  };

  const mockExercise2: Exercise = {
    id: "exercise-2",
    name: "Squats",
    difficulty: "intermediate",
    equipment: "none",
    muscle: "legs",
    type: "strength",
    instructions: "Lower your body by bending knees",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ _collectionPath: "exercises" });
    mockQuery.mockReturnValue({ _query: "filtered" });
    mockWhere.mockReturnValue({ _where: "condition" });
  });

  describe("fetchAllExercises", () => {
    it("fetches all exercises successfully", async () => {
      const mockDocs = [
        {
          id: "exercise-1",
          data: () => ({
            name: "Push-ups",
            difficulty: "beginner",
            equipment: "none",
            muscle: "chest",
            type: "strength",
            description: "Lower your body until chest nearly touches floor",
          }),
        },
        {
          id: "exercise-2",
          data: () => ({
            name: "Squats",
            difficulty: "intermediate",
            equipment: "none",
            muscle: "legs",
            type: "strength",
            description: "Lower your body by bending knees",
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const exercises = await ExerciseLibraryService.fetchAllExercises();

      expect(exercises).toHaveLength(2);
      expect(exercises[0].id).toBe("exercise-1");
      expect(exercises[0].name).toBe("Push-ups");
      expect(exercises[0].difficulty).toBe("beginner");
      expect(exercises[1].id).toBe("exercise-2");
      expect(exercises[1].name).toBe("Squats");

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched all exercises: 2",
        { count: 2 },
        "ExerciseLibraryService"
      );
    });

    it("returns empty array when no exercises exist", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      });

      const exercises = await ExerciseLibraryService.fetchAllExercises();

      expect(exercises).toHaveLength(0);
      expect(logger.success).toHaveBeenCalledWith(
        "Fetched all exercises: 0",
        { count: 0 },
        "ExerciseLibraryService"
      );
    });

    it("uses default values for missing exercise fields", async () => {
      const mockDocs = [
        {
          id: "exercise-incomplete",
          data: () => ({}),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const exercises = await ExerciseLibraryService.fetchAllExercises();

      expect(exercises[0]).toEqual({
        id: "exercise-incomplete",
        name: "Unknown Exercise",
        difficulty: "beginner",
        equipment: "none",
        muscle: "unknown",
        type: "strength",
        instructions: "",
      });
    });

    it("handles errors when fetching exercises", async () => {
      const error = new Error("Firestore error");
      mockGetDocs.mockRejectedValue(error);

      await expect(ExerciseLibraryService.fetchAllExercises()).rejects.toThrow(
        "FETCH_EXERCISES_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching exercises",
        error,
        "ExerciseLibraryService"
      );
    });
  });

  describe("checkExerciseExists", () => {
    it("returns true when exercise exists for user", async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
      });

      const exists = await ExerciseLibraryService.checkExerciseExists(
        "user-123",
        "exercise-1"
      );

      expect(exists).toBe(true);
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith("userID", "==", "user-123");
      expect(mockWhere).toHaveBeenCalledWith("exerciseID", "==", "exercise-1");

      expect(logger.debug).toHaveBeenCalledWith(
        "Exercise existence check: true",
        { userId: "user-123", exerciseId: "exercise-1", exists: true },
        "ExerciseLibraryService"
      );
    });

    it("returns false when exercise does not exist for user", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
      });

      const exists = await ExerciseLibraryService.checkExerciseExists(
        "user-123",
        "exercise-1"
      );

      expect(exists).toBe(false);

      expect(logger.debug).toHaveBeenCalledWith(
        "Exercise existence check: false",
        { userId: "user-123", exerciseId: "exercise-1", exists: false },
        "ExerciseLibraryService"
      );
    });

    it("handles errors when checking exercise existence", async () => {
      const error = new Error("Query error");
      mockGetDocs.mockRejectedValue(error);

      await expect(
        ExerciseLibraryService.checkExerciseExists("user-123", "exercise-1")
      ).rejects.toThrow("CHECK_EXERCISE_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error checking exercise existence",
        error,
        "ExerciseLibraryService"
      );
    });
  });

  describe("addExerciseToUser", () => {
    it("adds exercise to user successfully", async () => {
      const mockCollectionRef = { _collectionPath: "exercises_taken_by_user" };

      // Mock checkExerciseExists to return false (doesn't exist)
      mockGetDocs.mockResolvedValueOnce({ empty: true });

      mockCollection.mockReturnValue(mockCollectionRef);
      mockAddDoc.mockResolvedValue({ id: "doc-123" });

      await ExerciseLibraryService.addExerciseToUser("user-123", mockExercise);

      expect(mockAddDoc).toHaveBeenCalledWith(mockCollectionRef, {
        userID: "user-123",
        exerciseID: "exercise-1",
        name: "Push-ups",
        difficulty: "beginner",
        equipment: "none",
        muscle: "chest",
        type: "strength",
        description: "Lower your body until chest nearly touches floor",
        isDone: false,
      });

      expect(logger.success).toHaveBeenCalledWith(
        "Exercise added to user: Push-ups",
        {
          userId: "user-123",
          exerciseId: "exercise-1",
          exerciseName: "Push-ups",
        },
        "ExerciseLibraryService"
      );
    });

    it("throws error when exercise already exists", async () => {
      // Mock checkExerciseExists to return true (already exists)
      mockGetDocs.mockResolvedValueOnce({ empty: false });

      await expect(
        ExerciseLibraryService.addExerciseToUser("user-123", mockExercise)
      ).rejects.toThrow("EXERCISE_ALREADY_EXISTS");

      expect(mockAddDoc).not.toHaveBeenCalled();

      expect(logger.warn).toHaveBeenCalledWith(
        "Exercise already exists for user",
        {
          userId: "user-123",
          exerciseId: "exercise-1",
          exerciseName: "Push-ups",
        },
        "ExerciseLibraryService"
      );
    });

    it("handles errors when adding exercise fails", async () => {
      const error = new Error("Firestore add error");

      // Mock checkExerciseExists to return false
      mockGetDocs.mockResolvedValueOnce({ empty: true });

      // Mock addDoc to fail
      mockAddDoc.mockRejectedValue(error);

      await expect(
        ExerciseLibraryService.addExerciseToUser("user-123", mockExercise)
      ).rejects.toThrow("ADD_EXERCISE_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error adding exercise to user",
        error,
        "ExerciseLibraryService"
      );
    });
  });

  describe("fetchUserExerciseIds", () => {
    it("fetches user exercise IDs successfully", async () => {
      const mockDocs = [
        {
          data: () => ({ exerciseID: "exercise-1" }),
        },
        {
          data: () => ({ exerciseID: "exercise-2" }),
        },
        {
          data: () => ({ exerciseID: "exercise-3" }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      });

      const exerciseIds = await ExerciseLibraryService.fetchUserExerciseIds(
        "user-123"
      );

      expect(exerciseIds).toEqual(["exercise-1", "exercise-2", "exercise-3"]);
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith("userID", "==", "user-123");

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched user exercise IDs: 3",
        { userId: "user-123", count: 3 },
        "ExerciseLibraryService"
      );
    });

    it("returns empty array when user has no exercises", async () => {
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {},
      });

      const exerciseIds = await ExerciseLibraryService.fetchUserExerciseIds(
        "user-123"
      );

      expect(exerciseIds).toEqual([]);

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched user exercise IDs: 0",
        { userId: "user-123", count: 0 },
        "ExerciseLibraryService"
      );
    });

    it("skips documents without exerciseID", async () => {
      const mockDocs = [
        {
          data: () => ({ exerciseID: "exercise-1" }),
        },
        {
          data: () => ({}), // Missing exerciseID
        },
        {
          data: () => ({ exerciseID: "exercise-2" }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      });

      const exerciseIds = await ExerciseLibraryService.fetchUserExerciseIds(
        "user-123"
      );

      expect(exerciseIds).toEqual(["exercise-1", "exercise-2"]);
    });

    it("handles errors when fetching user exercise IDs", async () => {
      const error = new Error("Query error");
      mockGetDocs.mockRejectedValue(error);

      await expect(
        ExerciseLibraryService.fetchUserExerciseIds("user-123")
      ).rejects.toThrow("FETCH_USER_EXERCISES_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching user exercise IDs",
        error,
        "ExerciseLibraryService"
      );
    });
  });

  describe("subscribeToUserExerciseIds", () => {
    it("subscribes to user exercise IDs successfully", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      const mockDocs = [
        {
          data: () => ({ exerciseID: "exercise-1" }),
        },
        {
          data: () => ({ exerciseID: "exercise-2" }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return mockUnsubscribe;
      });

      const unsubscribe = ExerciseLibraryService.subscribeToUserExerciseIds(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Subscribing to user exercise IDs",
        { userId: "user-123" },
        "ExerciseLibraryService"
      );

      expect(mockOnUpdate).toHaveBeenCalledWith(["exercise-1", "exercise-2"]);
      expect(mockOnError).not.toHaveBeenCalled();

      expect(logger.debug).toHaveBeenCalledWith(
        "User exercise IDs updated: 2",
        { userId: "user-123", count: 2 },
        "ExerciseLibraryService"
      );

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("handles empty exercise list", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => {},
        });
        return mockUnsubscribe;
      });

      ExerciseLibraryService.subscribeToUserExerciseIds(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalledWith([]);

      expect(logger.debug).toHaveBeenCalledWith(
        "User exercise IDs updated: 0",
        { userId: "user-123", count: 0 },
        "ExerciseLibraryService"
      );
    });

    it("skips documents without exerciseID in subscription", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockDocs = [
        {
          data: () => ({ exerciseID: "exercise-1" }),
        },
        {
          data: () => ({}), // Missing exerciseID
        },
        {
          data: () => ({ exerciseID: "exercise-2" }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
        });
        return jest.fn();
      });

      ExerciseLibraryService.subscribeToUserExerciseIds(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalledWith(["exercise-1", "exercise-2"]);
    });

    it("calls onError when subscription fails", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("Subscription error");

      mockOnSnapshot.mockImplementation((queryRef, onNext, onError) => {
        onError(error);
        return jest.fn();
      });

      ExerciseLibraryService.subscribeToUserExerciseIds(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnError).toHaveBeenCalledWith(error);

      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to user exercise IDs",
        error,
        "ExerciseLibraryService"
      );
    });

    it("returns unsubscribe function", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = ExerciseLibraryService.subscribeToUserExerciseIds(
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
          data: () => ({ exerciseID: "exercise-1" }),
        },
      ];

      const updatedDocs = [
        {
          data: () => ({ exerciseID: "exercise-1" }),
        },
        {
          data: () => ({ exerciseID: "exercise-2" }),
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

      ExerciseLibraryService.subscribeToUserExerciseIds(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      // Initial call
      expect(mockOnUpdate).toHaveBeenCalledWith(["exercise-1"]);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);

      // Simulate real-time update
      snapshotCallback({
        forEach: (callback: any) => updatedDocs.forEach(callback),
      });

      // Second call with updated data
      expect(mockOnUpdate).toHaveBeenCalledWith(["exercise-1", "exercise-2"]);
      expect(mockOnUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
