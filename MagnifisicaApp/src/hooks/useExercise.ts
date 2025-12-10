import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ExerciseService } from "../services/ExerciseService";
import { ExerciseTodo } from "../types/ExerciseTodo";
import { logger } from "../utils/logger";

// --- Query Keys ---
export const exerciseKeys = {
  all: ["exercises"] as const,
  user: (userId: string) => [...exerciseKeys.all, "user", userId] as const,
};

// --- Hooks ---

/**
 * Hook to fetch and subscribe to a user's exercises.
 * FIX: Now uses useEffect to maintain a persistent real-time connection.
 */
export const useUserExercises = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = exerciseKeys.user(userId || "");

  // 1. Setup Real-time Subscription
  useEffect(() => {
    if (!userId) {
      logger.debug(
        "No userId provided, skipping exercise subscription",
        null,
        "useUserExercises"
      );
      return;
    }

    logger.info(
      "Setting up real-time exercise subscription",
      { userId },
      "useUserExercises"
    );

    // Subscribe to Firestore
    const unsubscribe = ExerciseService.subscribeToUserExercises(
      userId,
      (data) => {
        logger.debug(
          "Real-time exercise update received",
          { userId, count: data.length },
          "useUserExercises"
        );
        // When data changes in DB, update React Query cache immediately
        queryClient.setQueryData<ExerciseTodo[]>(queryKey, data);
      },
      (error) => {
        logger.error(
          "Exercise subscription error",
          { error, userId },
          "useUserExercises"
        );
      }
    );

    // Cleanup listener when component unmounts or userId changes
    return () => {
      logger.debug(
        "Cleaning up exercise subscription",
        { userId },
        "useUserExercises"
      );
      unsubscribe();
    };
  }, [userId, queryClient, queryKey]);

  // 2. Use Query for initial state management
  return useQuery({
    queryKey,
    // Initial fetch (wraps subscription for the first load)
    queryFn: async () => {
      if (!userId) return [];

      logger.debug(
        "Fetching initial exercises",
        { userId },
        "useUserExercises"
      );

      return new Promise<ExerciseTodo[]>((resolve, reject) => {
        const unsubscribe = ExerciseService.subscribeToUserExercises(
          userId,
          (data) => {
            logger.debug(
              "Initial exercises loaded",
              { userId, count: data.length },
              "useUserExercises"
            );
            resolve(data);
            unsubscribe(); // We only need this for the very first paint
          },
          (error) => {
            logger.error(
              "Failed to fetch initial exercises",
              { error, userId },
              "useUserExercises"
            );
            reject(error);
          }
        );
      });
    },
    enabled: !!userId,
    staleTime: Infinity, // Data is kept fresh by the subscription
  });
};

/**
 * Hook to toggle exercise completion status with Optimistic Updates.
 */
export const useToggleExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      currentStatus,
    }: {
      id: string;
      currentStatus: boolean;
      userId: string;
    }) => {
      logger.info(
        "Toggling exercise status",
        { id, currentStatus, newStatus: !currentStatus },
        "useToggleExercise"
      );
      return ExerciseService.toggleExerciseStatus(id, currentStatus);
    },

    // Update UI immediately
    onMutate: async ({ id, currentStatus, userId }) => {
      logger.debug(
        "Applying optimistic update for exercise toggle",
        { id, userId },
        "useToggleExercise"
      );

      const queryKey = exerciseKeys.user(userId);
      await queryClient.cancelQueries({ queryKey });
      const previousExercises =
        queryClient.getQueryData<ExerciseTodo[]>(queryKey);

      queryClient.setQueryData<ExerciseTodo[]>(queryKey, (old) =>
        old?.map((ex) =>
          ex.id === id ? { ...ex, isDone: !currentStatus } : ex
        )
      );

      return { previousExercises, queryKey };
    },

    onError: (err, variables, context) => {
      logger.error(
        "Failed to toggle exercise, reverting optimistic update",
        { error: err, id: variables.id, userId: variables.userId },
        "useToggleExercise"
      );

      if (context?.previousExercises) {
        queryClient.setQueryData(context.queryKey, context.previousExercises);
      }
    },

    onSuccess: (data, variables) => {
      logger.success(
        "Exercise status toggled successfully",
        { id: variables.id, newStatus: !variables.currentStatus },
        "useToggleExercise"
      );
    },

    onSettled: (data, error, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};

/**
 * Hook to remove an exercise with Optimistic Updates.
 */
export const useRemoveExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ exerciseId }: { exerciseId: string; userId: string }) => {
      logger.info("Removing exercise", { exerciseId }, "useRemoveExercise");
      return ExerciseService.removeUserExercise(exerciseId);
    },

    // Update UI immediately
    onMutate: async ({ exerciseId, userId }) => {
      logger.debug(
        "Applying optimistic update for exercise removal",
        { exerciseId, userId },
        "useRemoveExercise"
      );

      const queryKey = exerciseKeys.user(userId);
      await queryClient.cancelQueries({ queryKey });
      const previousExercises =
        queryClient.getQueryData<ExerciseTodo[]>(queryKey);

      queryClient.setQueryData<ExerciseTodo[]>(queryKey, (old) =>
        old?.filter((ex) => ex.id !== exerciseId)
      );

      return { previousExercises, queryKey };
    },

    onError: (err, variables, context) => {
      logger.error(
        "Failed to remove exercise, reverting optimistic update",
        {
          error: err,
          exerciseId: variables.exerciseId,
          userId: variables.userId,
        },
        "useRemoveExercise"
      );

      if (context?.previousExercises) {
        queryClient.setQueryData(context.queryKey, context.previousExercises);
      }
    },

    onSuccess: (data, variables) => {
      logger.success(
        "Exercise removed successfully",
        { exerciseId: variables.exerciseId },
        "useRemoveExercise"
      );
    },

    onSettled: (data, error, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};
