// ===========================================
// ROUTE QUERIES - For RecordScreen
// ===========================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RouteService,
  SaveRouteParams,
  RouteData,
} from "../services/RouteService";

// Query Keys - Routes
export const routeKeys = {
  all: ["routes"] as const,
  user: (userId: string) => [...routeKeys.all, userId] as const,
  recent: (userId: string, limit: number) =>
    [...routeKeys.user(userId), "recent", limit] as const,
  stats: (userId: string) => [...routeKeys.user(userId), "stats"] as const,
};

/**
 * Hook to fetch all routes for a user
 * Usage: Display route history
 */
export const useUserRoutes = (userId: string | undefined) => {
  return useQuery({
    queryKey: routeKeys.user(userId!),
    queryFn: () => RouteService.fetchUserRoutes(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch recent routes for a user
 * Usage: Dashboard, recent activity section
 */
export const useRecentRoutes = (
  userId: string | undefined,
  limitCount: number = 10
) => {
  return useQuery({
    queryKey: routeKeys.recent(userId!, limitCount),
    queryFn: () => RouteService.fetchRecentRoutes(userId!, limitCount),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to calculate user's route statistics
 * Usage: Profile screen, statistics dashboard
 */
export const useUserRouteStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: routeKeys.stats(userId!),
    queryFn: () => RouteService.calculateUserStats(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to save a recorded route
 * Usage: RecordScreen - save route after recording
 */
export const useSaveRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveRouteParams) => RouteService.saveRoute(params),

    // Optimistically update
    onMutate: async (params) => {
      const userRoutesKey = routeKeys.user(params.userId);
      const statsKey = routeKeys.stats(params.userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userRoutesKey });

      // Snapshot previous values for rollback
      const previousRoutes =
        queryClient.getQueryData<RouteData[]>(userRoutesKey);
      const previousStats = queryClient.getQueryData(statsKey);

      return { previousRoutes, previousStats, userRoutesKey, statsKey };
    },

    onSuccess: (routeId, variables) => {
      console.log("✅ Route saved successfully:", routeId);

      // Invalidate and refetch route-related queries
      queryClient.invalidateQueries({
        queryKey: routeKeys.user(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: routeKeys.stats(variables.userId),
      });

      // Also invalidate recent routes if being used
      queryClient.invalidateQueries({
        queryKey: [...routeKeys.user(variables.userId), "recent"],
      });
    },

    onError: (error, variables, context) => {
      console.error("❌ Failed to save route:", error);

      // Rollback optimistic updates on error
      if (context?.previousRoutes) {
        queryClient.setQueryData(context.userRoutesKey, context.previousRoutes);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(context.statsKey, context.previousStats);
      }
    },
  });
};

/**
 * Hook to invalidate route cache
 * Usage: Manual refresh, after external updates
 */
export const useInvalidateRoutes = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: routeKeys.all }),
    invalidateUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: routeKeys.user(userId) }),
    invalidateStats: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: routeKeys.stats(userId) }),
    invalidateRecent: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: [...routeKeys.user(userId), "recent"],
      }),
  };
};

/**
 * Hook to prefetch routes
 * Usage: Preload data before navigation
 */
export const usePrefetchRoutes = () => {
  const queryClient = useQueryClient();

  return {
    prefetchUserRoutes: (userId: string) =>
      queryClient.prefetchQuery({
        queryKey: routeKeys.user(userId),
        queryFn: () => RouteService.fetchUserRoutes(userId),
      }),
    prefetchStats: (userId: string) =>
      queryClient.prefetchQuery({
        queryKey: routeKeys.stats(userId),
        queryFn: () => RouteService.calculateUserStats(userId),
      }),
  };
};
