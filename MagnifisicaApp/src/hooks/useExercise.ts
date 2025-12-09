import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ExerciseService } from "../services/ExerciseService";
import { ExerciseTodo } from "../types/ExerciseTodo";

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
    if (!userId) return;

    // Subscribe to Firestore
    const unsubscribe = ExerciseService.subscribeToUserExercises(
      userId,
      (data) => {
        // When data changes in DB, update React Query cache immediately
        queryClient.setQueryData<ExerciseTodo[]>(queryKey, data);
      },
      (error) => {
        console.error("❌ Exercise subscription error:", error);
      }
    );

    // Cleanup listener when component unmounts or userId changes
    return () => {
      unsubscribe();
    };
  }, [userId, queryClient, queryKey]);

  // 2. Use Query for initial state management
  return useQuery({
    queryKey,
    // Initial fetch (wraps subscription for the first load)
    queryFn: async () => {
      if (!userId) return [];
      return new Promise<ExerciseTodo[]>((resolve, reject) => {
        const unsubscribe = ExerciseService.subscribeToUserExercises(
          userId,
          (data) => {
            resolve(data);
            unsubscribe(); // We only need this for the very first paint
          },
          (error) => reject(error)
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
    }) => ExerciseService.toggleExerciseStatus(id, currentStatus),

    // Update UI immediately
    onMutate: async ({ id, currentStatus, userId }) => {
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
 * Hook to remove an exercise with Optimistic Updates.
 */
export const useRemoveExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ exerciseId }: { exerciseId: string; userId: string }) =>
      ExerciseService.removeUserExercise(exerciseId),

    // Update UI immediately
    onMutate: async ({ exerciseId, userId }) => {
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
