import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot, // Import onSnapshot for real-time updates
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { Exercise } from "../types/Exercise";

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

      return exercisesList;
    } catch (error) {
      console.error("Error fetching exercises:", error);
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
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking exercise existence:", error);
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
    } catch (error) {
      console.error("Error adding exercise to user:", error);
      if (
        error instanceof Error &&
        error.message === "EXERCISE_ALREADY_EXISTS"
      ) {
        throw error;
      }
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

      return exerciseIds;
    } catch (error) {
      console.error("Error fetching user exercise IDs:", error);
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
        onUpdate(exerciseIds);
      },
      (error) => {
        console.error("Error subscribing to user exercise IDs:", error);
        onError(error);
      }
    );
  },
};
