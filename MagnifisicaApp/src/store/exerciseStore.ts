import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExerciseService } from "../services/ExerciseService";
import { ExerciseTodo } from "../types/ExerciseTodo";

// Query Keys - Centralized for cache management
export const exerciseKeys = {
  all: ["exercises"] as const,
  user: (userId: string) => [...exerciseKeys.all, userId] as const,
};

/**
 * Hook to subscribe to user's exercises with real-time updates
 * Note: This uses polling to simulate real-time updates with React Query
 */
export const useUserExercises = (userId: string | undefined) => {
  return useQuery({
    queryKey: exerciseKeys.user(userId!),
    queryFn: async () => {
      return new Promise<ExerciseTodo[]>((resolve, reject) => {
        // Use the service's subscribe method to get data
        const unsubscribe = ExerciseService.subscribeToUserExercises(
          userId!,
          (exercises) => {
            resolve(exercises);
            unsubscribe(); // Unsubscribe immediately after getting data
          },
          (error) => {
            reject(error);
          }
        );
      });
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 5000, // Poll every 5 seconds for updates
    refetchOnWindowFocus: true, // Refetch when user returns to app
  });
};

/**
 * Hook to toggle exercise completion status
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
    }) => ExerciseService.toggleExerciseStatus(id, currentStatus),

    // Optimistic update - immediately update UI before server response
    onMutate: async ({ id, currentStatus, userId }) => {
      const queryKey = exerciseKeys.user(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousExercises =
        queryClient.getQueryData<ExerciseTodo[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<ExerciseTodo[]>(queryKey, (old) =>
        old?.map((ex) =>
          ex.id === id ? { ...ex, isDone: !currentStatus } : ex
        )
      );

      return { previousExercises, queryKey };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(context.queryKey, context.previousExercises);
      }
    },

    // Refetch after mutation
    onSettled: (data, error, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};

/**
 * Hook to remove an exercise
 */
export const useRemoveExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ exerciseId }: { exerciseId: string; userId: string }) =>
      ExerciseService.removeUserExercise(exerciseId),

    // Optimistic update
    onMutate: async ({ exerciseId, userId }) => {
      const queryKey = exerciseKeys.user(userId);

      await queryClient.cancelQueries({ queryKey });

      const previousExercises =
        queryClient.getQueryData<ExerciseTodo[]>(queryKey);

      // Optimistically remove from list
      queryClient.setQueryData<ExerciseTodo[]>(queryKey, (old) =>
        old?.filter((ex) => ex.id !== exerciseId)
      );

      return { previousExercises, queryKey };
    },

    onError: (err, variables, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(context.queryKey, context.previousExercises);
      }
    },

    onSettled: (data, error, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};

/**
 * Hook to invalidate exercise cache
 * Useful after adding a new exercise
 */
export const useInvalidateExercises = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: exerciseKeys.all }),
    invalidateUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: exerciseKeys.user(userId) }),
  };
};

/**
 * Hook to prefetch exercises
 * Useful for optimistic loading
 */
export const usePrefetchExercises = () => {
  const queryClient = useQueryClient();

  return (userId: string) =>
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.user(userId),
      queryFn: async () => {
        return new Promise<ExerciseTodo[]>((resolve, reject) => {
          const unsubscribe = ExerciseService.subscribeToUserExercises(
            userId,
            (exercises) => {
              resolve(exercises);
              unsubscribe();
            },
            (error) => {
              reject(error);
            }
          );
        });
      },
    });
};
