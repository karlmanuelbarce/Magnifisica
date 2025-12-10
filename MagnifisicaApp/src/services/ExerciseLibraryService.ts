import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

import { Exercise } from "../types/Exercise";
import { logger } from "../utils/logger";

const db = getFirestore();

export const ExerciseLibraryService = {
  /**
   * Fetches all available exercises from the library
   */
  fetchAllExercises: async (): Promise<Exercise[]> => {
    try {
      const snapshot = await getDocs(collection(db, "exercises"));

      const exercisesList: Exercise[] = snapshot.docs.map(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unknown Exercise",
            difficulty: data.difficulty || "beginner",
            equipment: data.equipment || "none",
            muscle: data.muscle || "unknown",
            type: data.type || "strength",
            instructions: data.description || "",
          } as Exercise;
        }
      );

      logger.success(
        `Fetched all exercises: ${exercisesList.length}`,
        { count: exercisesList.length },
        "ExerciseLibraryService"
      );

      return exercisesList;
    } catch (error) {
      logger.error("Error fetching exercises", error, "ExerciseLibraryService");
      throw new Error("FETCH_EXERCISES_FAILED");
    }
  },

  /**
   * Checks if a user has already added a specific exercise
   */
  checkExerciseExists: async (
    userId: string,
    exerciseId: string
  ): Promise<boolean> => {
    try {
      const userExercisesRef = collection(db, "exercises_taken_by_user");
      const q = query(
        userExercisesRef,
        where("userID", "==", userId),
        where("exerciseID", "==", exerciseId)
      );

      const querySnapshot = await getDocs(q);
      const exists = !querySnapshot.empty;

      logger.debug(
        `Exercise existence check: ${exists}`,
        { userId, exerciseId, exists },
        "ExerciseLibraryService"
      );

      return exists;
    } catch (error) {
      logger.error(
        "Error checking exercise existence",
        error,
        "ExerciseLibraryService"
      );
      throw new Error("CHECK_EXERCISE_FAILED");
    }
  },

  /**
   * Adds an exercise to the user's workout list
   */
  addExerciseToUser: async (
    userId: string,
    exercise: Exercise
  ): Promise<void> => {
    try {
      // First check if it already exists
      const exists = await ExerciseLibraryService.checkExerciseExists(
        userId,
        exercise.id
      );

      if (exists) {
        logger.warn(
          "Exercise already exists for user",
          { userId, exerciseId: exercise.id, exerciseName: exercise.name },
          "ExerciseLibraryService"
        );
        throw new Error("EXERCISE_ALREADY_EXISTS");
      }

      // Add the exercise
      const userExercisesRef = collection(db, "exercises_taken_by_user");
      await addDoc(userExercisesRef, {
        userID: userId,
        exerciseID: exercise.id,
        name: exercise.name,
        difficulty: exercise.difficulty,
        equipment: exercise.equipment,
        muscle: exercise.muscle,
        type: exercise.type,
        description: exercise.instructions,
        isDone: false,
      });

      logger.success(
        `Exercise added to user: ${exercise.name}`,
        { userId, exerciseId: exercise.id, exerciseName: exercise.name },
        "ExerciseLibraryService"
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EXERCISE_ALREADY_EXISTS"
      ) {
        throw error;
      }
      logger.error(
        "Error adding exercise to user",
        error,
        "ExerciseLibraryService"
      );
      throw new Error("ADD_EXERCISE_FAILED");
    }
  },

  /**
   * Fetches all exercise IDs that the user has already added (One-time fetch)
   */
  fetchUserExerciseIds: async (userId: string): Promise<string[]> => {
    try {
      const userExercisesRef = collection(db, "exercises_taken_by_user");
      const q = query(userExercisesRef, where("userID", "==", userId));
      const querySnapshot = await getDocs(q);

      const exerciseIds: string[] = [];
      querySnapshot.forEach(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          if (data.exerciseID) {
            exerciseIds.push(data.exerciseID);
          }
        }
      );

      logger.success(
        `Fetched user exercise IDs: ${exerciseIds.length}`,
        { userId, count: exerciseIds.length },
        "ExerciseLibraryService"
      );

      return exerciseIds;
    } catch (error) {
      logger.error(
        "Error fetching user exercise IDs",
        error,
        "ExerciseLibraryService"
      );
      throw new Error("FETCH_USER_EXERCISES_FAILED");
    }
  },

  /**
   * Subscribes to user's exercise IDs for real-time updates
   */
  subscribeToUserExerciseIds: (
    userId: string,
    onUpdate: (ids: string[]) => void,
    onError: (error: Error) => void
  ) => {
    logger.info(
      "Subscribing to user exercise IDs",
      { userId },
      "ExerciseLibraryService"
    );

    const userExercisesRef = collection(db, "exercises_taken_by_user");
    const q = query(userExercisesRef, where("userID", "==", userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const exerciseIds: string[] = [];
        snapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data();
            if (data.exerciseID) {
              exerciseIds.push(data.exerciseID);
            }
          }
        );

        logger.debug(
          `User exercise IDs updated: ${exerciseIds.length}`,
          { userId, count: exerciseIds.length },
          "ExerciseLibraryService"
        );

        onUpdate(exerciseIds);
      },
      (error) => {
        logger.error(
          "Error subscribing to user exercise IDs",
          error,
          "ExerciseLibraryService"
        );
        onError(error);
      }
    );
  },
};
