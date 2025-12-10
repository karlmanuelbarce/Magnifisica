// hooks/useChallenges.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Challenge } from "../components/ChallengeCard";
import { challengeService } from "../services/challengeService";
import { logger } from "../utils/logger";

/**
 * React Query hook for fetching and subscribing to challenges
 * This hook combines initial fetch with real-time Firestore updates
 */
export function useChallenges() {
  const queryClient = useQueryClient();

  // Fetch challenges with React Query
  const query = useQuery({
    queryKey: ["challenges"],
    queryFn: () => {
      logger.debug("Fetching challenges from Firestore", null, "useChallenges");
      return challengeService.fetchChallenges();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
  });

  // Set up real-time Firestore subscription
  useEffect(() => {
    logger.info(
      "Setting up real-time challenge subscription",
      null,
      "useChallenges"
    );

    const unsubscribe = challengeService.subscribeToChallenges(
      (challenges) => {
        logger.debug(
          "Real-time challenge update received",
          { count: challenges.length },
          "useChallenges"
        );
        // Update React Query cache with real-time data
        queryClient.setQueryData(["challenges"], challenges);
      },
      (error) => {
        logger.error("Challenge subscription error", error, "useChallenges");
      }
    );

    // Cleanup subscription on unmount
    return () => {
      logger.debug("Cleaning up challenge subscription", null, "useChallenges");
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

/**
 * React Query mutation hook for creating challenges
 * Automatically invalidates and refetches challenges after creation
 */
export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeData: Omit<Challenge, "id">) => {
      logger.info(
        "Creating new challenge",
        { title: challengeData.title },
        "useCreateChallenge"
      );
      return challengeService.createChallenge(challengeData);
    },
    onSuccess: (newChallenge) => {
      logger.success(
        "Challenge created successfully",
        {
          id: newChallenge.id,
          title: newChallenge.title,
        },
        "useCreateChallenge"
      );
      // Invalidate and refetch challenges after creation
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error) => {
      logger.error("Failed to create challenge", error, "useCreateChallenge");
    },
  });
}

/**
 * React Query mutation hook for updating challenges
 * Automatically invalidates and refetches challenges after update
 */
export function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Challenge>;
    }) => {
      logger.info(
        "Updating challenge",
        {
          id,
          updatedFields: Object.keys(updates),
        },
        "useUpdateChallenge"
      );
      return challengeService.updateChallenge(id, updates);
    },
    onSuccess: (_, variables) => {
      logger.success(
        "Challenge updated successfully",
        { id: variables.id },
        "useUpdateChallenge"
      );
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error, variables) => {
      logger.error(
        "Failed to update challenge",
        { error, id: variables.id },
        "useUpdateChallenge"
      );
    },
  });
}

/**
 * React Query mutation hook for deleting challenges
 * Automatically invalidates and refetches challenges after deletion
 */
export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => {
      logger.info(
        "Deleting challenge",
        { id: challengeId },
        "useDeleteChallenge"
      );
      return challengeService.deleteChallenge(challengeId);
    },
    onSuccess: (_, challengeId) => {
      logger.success(
        "Challenge deleted successfully",
        { id: challengeId },
        "useDeleteChallenge"
      );
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error, challengeId) => {
      logger.error(
        "Failed to delete challenge",
        { error, id: challengeId },
        "useDeleteChallenge"
      );
    },
  });
}
