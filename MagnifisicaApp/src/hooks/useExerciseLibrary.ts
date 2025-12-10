import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ExerciseLibraryService } from "../services/ExerciseLibraryService";
import { Exercise } from "../types/Exercise";
import { logger } from "../utils/logger";

import { exerciseKeys } from "./useExercise"; // Ensure this path is correct

// Query Keys
export const exerciseLibraryKeys = {
  all: ["exerciseLibrary"] as const,
  list: () => [...exerciseLibraryKeys.all, "list"] as const,
  userExerciseIds: (userId: string) =>
    [...exerciseLibraryKeys.all, "userIds", userId] as const,
};

/**
 * Hook to fetch all available exercises from the library
 */
export const useExerciseLibrary = () => {
  return useQuery({
    queryKey: exerciseLibraryKeys.list(),
    queryFn: () => {
      logger.debug("Fetching exercise library", null, "useExerciseLibrary");
      return ExerciseLibraryService.fetchAllExercises();
    },
    staleTime: 10 * 60 * 1000, // Exercise library rarely changes, cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};

/**
 * Hook to fetch IDs of exercises the user has already added
 * Updated to use Real-time subscription so buttons update instantly
 */
export const useUserExerciseIds = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = exerciseLibraryKeys.userExerciseIds(userId || "");

  // Real-time subscription
  useEffect(() => {
    if (!userId) {
      logger.debug(
        "No userId provided, skipping exercise IDs subscription",
        null,
        "useUserExerciseIds"
      );
      return;
    }

    logger.info(
      "Setting up real-time subscription for user exercise IDs",
      { userId },
      "useUserExerciseIds"
    );

    const unsubscribe = ExerciseLibraryService.subscribeToUserExerciseIds(
      userId,
      (ids) => {
        logger.debug(
          "Real-time user exercise IDs update received",
          { userId, count: ids.length },
          "useUserExerciseIds"
        );
        queryClient.setQueryData(queryKey, ids);
      },
      (error) => {
        logger.error(
          "Error watching user exercise IDs",
          { error, userId },
          "useUserExerciseIds"
        );
      }
    );

    return () => {
      logger.debug(
        "Cleaning up user exercise IDs subscription",
        { userId },
        "useUserExerciseIds"
      );
      unsubscribe();
    };
  }, [userId, queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];

      logger.debug(
        "Fetching initial user exercise IDs",
        { userId },
        "useUserExerciseIds"
      );

      const ids = await ExerciseLibraryService.fetchUserExerciseIds(userId);

      logger.debug(
        "Initial user exercise IDs loaded",
        { userId, count: ids.length },
        "useUserExerciseIds"
      );

      return ids;
    },
    enabled: !!userId,
    staleTime: Infinity, // Data managed by subscription
  });
};

/**
 * Hook to add an exercise to user's workout list
 */
export const useAddExerciseToUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      exercise,
    }: {
      userId: string;
      exercise: Exercise;
    }) => {
      logger.info(
        "Adding exercise to user workout",
        {
          userId,
          exerciseName: exercise.name,
          exerciseId: exercise.id,
          muscle: exercise.muscle,
        },
        "useAddExerciseToUser"
      );
      return ExerciseLibraryService.addExerciseToUser(userId, exercise);
    },

    onSuccess: (data, variables) => {
      logger.success(
        "Exercise added to user workout successfully",
        {
          userId: variables.userId,
          exerciseName: variables.exercise.name,
          exerciseId: variables.exercise.id,
        },
        "useAddExerciseToUser"
      );

      // Invalidate user's exercise list to show the new exercise
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.user(variables.userId),
      });

      // Invalidate user exercise IDs to update the "already added" status
      queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.userExerciseIds(variables.userId),
      });
    },

    onError: (error, variables) => {
      logger.error(
        "Failed to add exercise to user workout",
        {
          error,
          userId: variables.userId,
          exerciseName: variables.exercise.name,
          exerciseId: variables.exercise.id,
        },
        "useAddExerciseToUser"
      );
    },
  });
};

/**
 * Hook to check if a specific exercise is already added by the user
 */
export const useCheckExerciseExists = (
  userId: string | undefined,
  exerciseId: string
) => {
  return useQuery({
    queryKey: [...exerciseLibraryKeys.userExerciseIds(userId!), exerciseId],
    queryFn: async () => {
      logger.debug(
        "Checking if exercise exists for user",
        { userId, exerciseId },
        "useCheckExerciseExists"
      );

      const exists = await ExerciseLibraryService.checkExerciseExists(
        userId!,
        exerciseId
      );

      logger.debug(
        "Exercise existence check result",
        { userId, exerciseId, exists },
        "useCheckExerciseExists"
      );

      return exists;
    },
    enabled: !!userId && !!exerciseId,
    staleTime: 30 * 1000,
  });
};

/**
 * Hook to invalidate exercise library cache
 */
export const useInvalidateExerciseLibrary = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      logger.debug(
        "Invalidating all exercise library cache",
        null,
        "useInvalidateExerciseLibrary"
      );
      return queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.all,
      });
    },
    invalidateList: () => {
      logger.debug(
        "Invalidating exercise library list cache",
        null,
        "useInvalidateExerciseLibrary"
      );
      return queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.list(),
      });
    },
    invalidateUserIds: (userId: string) => {
      logger.debug(
        "Invalidating user exercise IDs cache",
        { userId },
        "useInvalidateExerciseLibrary"
      );
      return queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.userExerciseIds(userId),
      });
    },
  };
};
