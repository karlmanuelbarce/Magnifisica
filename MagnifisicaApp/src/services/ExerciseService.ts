import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

import { ExerciseTodo } from "../types/ExerciseTodo";
import { logger } from "../utils/logger";

const db = getFirestore();

export const ExerciseService = {
  /**
   * Subscribes to the user's list of exercises in real-time.
   * Returns an unsubscribe function that should be called when the component unmounts.
   */
  subscribeToUserExercises: (
    userId: string,
    onUpdate: (exercises: ExerciseTodo[]) => void,
    onError: (error: Error) => void
  ) => {
    logger.info("Subscribing to user exercises", { userId }, "ExerciseService");

    const collectionRef = collection(db, "exercises_taken_by_user");
    const q = query(collectionRef, where("userID", "==", userId));

    return onSnapshot(
      q,
      (querySnapshot) => {
        const exercisesList: ExerciseTodo[] = [];

        querySnapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data();
            // Safely map the data
            exercisesList.push({
              id: doc.id,
              name: data.name || "Unknown Exercise",
              isDone: data.isDone === true,
              // Add other fields if your ExerciseTodo type has them
            } as ExerciseTodo);
          }
        );

        logger.debug(
          `User exercises updated: ${exercisesList.length}`,
          { userId, count: exercisesList.length },
          "ExerciseService"
        );

        onUpdate(exercisesList);
      },
      (error) => {
        logger.error(
          "Error in subscribeToUserExercises",
          error,
          "ExerciseService"
        );
        onError(error);
      }
    );
  },

  /**
   * Toggles the 'isDone' status of a specific exercise.
   */
  toggleExerciseStatus: async (exerciseId: string, currentStatus: boolean) => {
    try {
      const docRef = doc(db, "exercises_taken_by_user", exerciseId);
      await updateDoc(docRef, { isDone: !currentStatus });

      logger.success(
        `Exercise status toggled: ${!currentStatus}`,
        { exerciseId, oldStatus: currentStatus, newStatus: !currentStatus },
        "ExerciseService"
      );
    } catch (error) {
      logger.error("Error toggling exercise status", error, "ExerciseService");
      throw new Error("UPDATE_FAILED");
    }
  },

  /**
   * Removes an exercise from the user's list.
   */
  removeUserExercise: async (exerciseId: string) => {
    try {
      const docRef = doc(db, "exercises_taken_by_user", exerciseId);
      await deleteDoc(docRef);

      logger.success(
        `Exercise removed: ${exerciseId}`,
        { exerciseId },
        "ExerciseService"
      );
    } catch (error) {
      logger.error("Error removing exercise", error, "ExerciseService");
      throw new Error("DELETE_FAILED");
    }
  },
};
