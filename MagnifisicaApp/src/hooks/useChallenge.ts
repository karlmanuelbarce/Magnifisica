// hooks/useChallenges.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Challenge } from "../components/ChallengeCard";
import { challengeService } from "../services/challengeService";

/**
 * React Query hook for fetching and subscribing to challenges
 * This hook combines initial fetch with real-time Firestore updates
 */
export function useChallenges() {
  const queryClient = useQueryClient();

  // Fetch challenges with React Query
  const query = useQuery({
    queryKey: ["challenges"],
    queryFn: () => challengeService.fetchChallenges(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
  });

  // Set up real-time Firestore subscription
  useEffect(() => {
    console.log("🔄 Setting up real-time challenge subscription");

    const unsubscribe = challengeService.subscribeToChallenges(
      (challenges) => {
        // Update React Query cache with real-time data
        queryClient.setQueryData(["challenges"], challenges);
      },
      (error) => {
        console.error("❌ Subscription error:", error);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🛑 Cleaning up challenge subscription");
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
    mutationFn: (challengeData: Omit<Challenge, "id">) =>
      challengeService.createChallenge(challengeData),
    onSuccess: (newChallenge) => {
      console.log("✅ Challenge created successfully:", newChallenge.title);
      // Invalidate and refetch challenges after creation
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error) => {
      console.error("❌ Create challenge mutation error:", error);
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
    }) => challengeService.updateChallenge(id, updates),
    onSuccess: (_, variables) => {
      console.log("✅ Challenge updated successfully:", variables.id);
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error) => {
      console.error("❌ Update challenge mutation error:", error);
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
    mutationFn: (challengeId: string) =>
      challengeService.deleteChallenge(challengeId),
    onSuccess: (_, challengeId) => {
      console.log("✅ Challenge deleted successfully:", challengeId);
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (error) => {
      console.error("❌ Delete challenge mutation error:", error);
    },
  });
}
