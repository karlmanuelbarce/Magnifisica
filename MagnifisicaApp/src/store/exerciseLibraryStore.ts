import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExerciseLibraryService } from "../services/ExerciseLibraryService";
import { Exercise } from "../types/Exercise";
import { exerciseKeys } from "./exerciseStore";

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
    queryFn: () => ExerciseLibraryService.fetchAllExercises(),
    staleTime: 10 * 60 * 1000, // Exercise library rarely changes, cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};

/**
 * Hook to fetch IDs of exercises the user has already added
 */
export const useUserExerciseIds = (userId: string | undefined) => {
  return useQuery({
    queryKey: exerciseLibraryKeys.userExerciseIds(userId!),
    queryFn: () => ExerciseLibraryService.fetchUserExerciseIds(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // Refresh every 30 seconds
    gcTime: 5 * 60 * 1000,
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
    }) => ExerciseLibraryService.addExerciseToUser(userId, exercise),

    onSuccess: (data, variables) => {
      // Invalidate user's exercise list to show the new exercise
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.user(variables.userId),
      });

      // Invalidate user exercise IDs to update the "already added" status
      queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.userExerciseIds(variables.userId),
      });
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
    queryFn: () =>
      ExerciseLibraryService.checkExerciseExists(userId!, exerciseId),
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
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: exerciseLibraryKeys.all }),
    invalidateList: () =>
      queryClient.invalidateQueries({ queryKey: exerciseLibraryKeys.list() }),
    invalidateUserIds: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: exerciseLibraryKeys.userExerciseIds(userId),
      }),
  };
};
