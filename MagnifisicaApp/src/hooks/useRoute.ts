import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  RouteService,
  SaveRouteParams,
  RouteData,
} from "../services/RouteService";
import { logger } from "../utils/logger";

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
    queryFn: async () => {
      logger.debug("Fetching user routes", { userId }, "useUserRoutes");
      const routes = await RouteService.fetchUserRoutes(userId!);
      logger.debug(
        "User routes fetched",
        { userId, count: routes.length },
        "useUserRoutes"
      );
      return routes;
    },
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
    queryFn: async () => {
      logger.debug(
        "Fetching recent routes",
        { userId, limit: limitCount },
        "useRecentRoutes"
      );
      const routes = await RouteService.fetchRecentRoutes(userId!, limitCount);
      logger.debug(
        "Recent routes fetched",
        { userId, count: routes.length, limit: limitCount },
        "useRecentRoutes"
      );
      return routes;
    },
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
    queryFn: async () => {
      logger.debug(
        "Calculating user route stats",
        { userId },
        "useUserRouteStats"
      );
      const stats = await RouteService.calculateUserStats(userId!);
      logger.debug(
        "User route stats calculated",
        { userId, stats },
        "useUserRouteStats"
      );
      return stats;
    },
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
    mutationFn: (params: SaveRouteParams) => {
      logger.info("Saving route", { userId: params.userId }, "useSaveRoute");
      return RouteService.saveRoute(params);
    },

    // Optimistically update
    onMutate: async (params) => {
      logger.debug(
        "Applying optimistic update for route save",
        { userId: params.userId },
        "useSaveRoute"
      );

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
      logger.success(
        "Route saved successfully",
        {
          routeId,
          userId: variables.userId,
        },
        "useSaveRoute"
      );

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
      logger.error(
        "Failed to save route",
        {
          error,
          userId: variables.userId,
        },
        "useSaveRoute"
      );

      // Rollback optimistic updates on error
      if (context?.previousRoutes) {
        logger.debug(
          "Reverting optimistic update for route save",
          { userId: variables.userId },
          "useSaveRoute"
        );
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
    invalidateAll: () => {
      logger.debug(
        "Invalidating all routes cache",
        null,
        "useInvalidateRoutes"
      );
      return queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
    invalidateUser: (userId: string) => {
      logger.debug(
        "Invalidating user routes cache",
        { userId },
        "useInvalidateRoutes"
      );
      return queryClient.invalidateQueries({
        queryKey: routeKeys.user(userId),
      });
    },
    invalidateStats: (userId: string) => {
      logger.debug(
        "Invalidating user stats cache",
        { userId },
        "useInvalidateRoutes"
      );
      return queryClient.invalidateQueries({
        queryKey: routeKeys.stats(userId),
      });
    },
    invalidateRecent: (userId: string) => {
      logger.debug(
        "Invalidating recent routes cache",
        { userId },
        "useInvalidateRoutes"
      );
      return queryClient.invalidateQueries({
        queryKey: [...routeKeys.user(userId), "recent"],
      });
    },
  };
};

/**
 * Hook to prefetch routes
 * Usage: Preload data before navigation
 */
export const usePrefetchRoutes = () => {
  const queryClient = useQueryClient();

  return {
    prefetchUserRoutes: (userId: string) => {
      logger.debug("Prefetching user routes", { userId }, "usePrefetchRoutes");
      return queryClient.prefetchQuery({
        queryKey: routeKeys.user(userId),
        queryFn: () => RouteService.fetchUserRoutes(userId),
      });
    },
    prefetchStats: (userId: string) => {
      logger.debug("Prefetching user stats", { userId }, "usePrefetchRoutes");
      return queryClient.prefetchQuery({
        queryKey: routeKeys.stats(userId),
        queryFn: () => RouteService.calculateUserStats(userId),
      });
    },
  };
};
