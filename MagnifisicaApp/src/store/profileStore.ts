import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileService } from "../services/ProfileService";

// Query Keys - Centralized for cache management
export const profileKeys = {
  all: ["profile"] as const,
  user: (userId: string) => [...profileKeys.all, userId] as const,
  weeklyActivity: (userId: string) =>
    [...profileKeys.user(userId), "weekly"] as const,
  challenges: (userId: string) =>
    [...profileKeys.user(userId), "challenges"] as const,
};

/**
 * Hook to fetch complete profile data (weekly activity + challenges)
 */
export const useProfileData = (userId: string | undefined) => {
  return useQuery({
    queryKey: profileKeys.user(userId!),
    queryFn: () => ProfileService.fetchProfileData(userId!),
    enabled: !!userId, // Only run if userId exists
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    retry: 2, // Retry failed requests twice
  });
};

/**
 * Hook to fetch only weekly activity data
 */
export const useWeeklyActivity = (userId: string | undefined) => {
  return useQuery({
    queryKey: profileKeys.weeklyActivity(userId!),
    queryFn: () => ProfileService.fetchWeeklyActivity(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to fetch only joined challenges
 */
export const useJoinedChallenges = (userId: string | undefined) => {
  return useQuery({
    queryKey: profileKeys.challenges(userId!),
    queryFn: () => ProfileService.fetchJoinedChallenges(userId!),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // Challenges might update more frequently
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to invalidate profile cache
 * Useful after creating/updating profile-related data
 */
export const useInvalidateProfile = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
    invalidateUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) }),
    invalidateWeeklyActivity: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.weeklyActivity(userId),
      }),
    invalidateChallenges: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.challenges(userId),
      }),
  };
};

/**
 * Hook to prefetch profile data
 * Useful for optimistic loading before navigation
 */
export const usePrefetchProfile = () => {
  const queryClient = useQueryClient();

  return {
    prefetchProfileData: (userId: string) =>
      queryClient.prefetchQuery({
        queryKey: profileKeys.user(userId),
        queryFn: () => ProfileService.fetchProfileData(userId),
      }),
    prefetchWeeklyActivity: (userId: string) =>
      queryClient.prefetchQuery({
        queryKey: profileKeys.weeklyActivity(userId),
        queryFn: () => ProfileService.fetchWeeklyActivity(userId),
      }),
  };
};
