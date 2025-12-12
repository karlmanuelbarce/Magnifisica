import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";

// Mock dependencies BEFORE any imports that use them
jest.mock("../services/RouteService", () => ({
  RouteService: {
    fetchUserRoutes: jest.fn(),
    fetchRecentRoutes: jest.fn(),
    calculateUserStats: jest.fn(),
    saveRoute: jest.fn(),
  },
}));

jest.mock("../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Import after mocking
import {
  RouteService,
  SaveRouteParams,
  RouteData,
  RouteStats,
} from "../services/RouteService";
import {
  useUserRoutes,
  useRecentRoutes,
  useUserRouteStats,
  useSaveRoute,
  useInvalidateRoutes,
  usePrefetchRoutes,
  routeKeys,
} from "./useRoute";
import { logger } from "../utils/logger";

// Mock route data
const mockRoute1: RouteData = {
  id: "route-1",
  userId: "user-123",
  distance: 5.2,
  duration: 1800,
  startTime: new Date("2025-01-01T10:00:00Z"),
  endTime: new Date("2025-01-01T10:30:00Z"),
  coordinates: [
    { latitude: 14.65, longitude: 120.98, timestamp: 1704103200000 },
    { latitude: 14.66, longitude: 120.99, timestamp: 1704103260000 },
  ],
  avgSpeed: 10.4,
};

const mockRoute2: RouteData = {
  id: "route-2",
  userId: "user-123",
  distance: 3.5,
  duration: 1200,
  startTime: new Date("2025-01-02T08:00:00Z"),
  endTime: new Date("2025-01-02T08:20:00Z"),
  coordinates: [
    { latitude: 14.65, longitude: 120.98, timestamp: 1704182400000 },
    { latitude: 14.66, longitude: 120.99, timestamp: 1704182460000 },
  ],
  avgSpeed: 10.5,
};

const mockRoute3: RouteData = {
  id: "route-3",
  userId: "user-123",
  distance: 7.8,
  duration: 2400,
  startTime: new Date("2025-01-03T07:00:00Z"),
  endTime: new Date("2025-01-03T07:40:00Z"),
  coordinates: [
    { latitude: 14.65, longitude: 120.98, timestamp: 1704268800000 },
    { latitude: 14.66, longitude: 120.99, timestamp: 1704268860000 },
  ],
  avgSpeed: 11.7,
};

const mockStats: RouteStats = {
  totalDistance: 16.5,
  totalDuration: 5400,
  totalRoutes: 3,
  avgDistance: 5.5,
  avgDuration: 1800,
  avgSpeed: 10.87,
};

describe("useRoute hooks", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Create wrapper with QueryClientProvider
    wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useUserRoutes", () => {
    it("fetches all routes for a user", async () => {
      const mockRoutes = [mockRoute1, mockRoute2, mockRoute3];

      (RouteService.fetchUserRoutes as jest.Mock).mockResolvedValue(mockRoutes);

      const { result } = renderHook(() => useUserRoutes("user-123"), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRoutes);
      expect(RouteService.fetchUserRoutes).toHaveBeenCalledWith("user-123");
      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching user routes",
        { userId: "user-123" },
        "useUserRoutes"
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "User routes fetched",
        { userId: "user-123", count: 3 },
        "useUserRoutes"
      );
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useUserRoutes(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(RouteService.fetchUserRoutes).not.toHaveBeenCalled();
    });

    it("handles fetch error", async () => {
      const mockError = new Error("Failed to fetch routes");

      (RouteService.fetchUserRoutes as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useUserRoutes("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it("caches routes with correct staleTime", async () => {
      const mockRoutes = [mockRoute1];

      (RouteService.fetchUserRoutes as jest.Mock).mockResolvedValue(mockRoutes);

      const { result, rerender } = renderHook(() => useUserRoutes("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      jest.clearAllMocks();

      // Rerender - should use cached data
      rerender();

      expect(RouteService.fetchUserRoutes).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockRoutes);
    });
  });

  describe("useRecentRoutes", () => {
    it("fetches recent routes with default limit", async () => {
      const mockRoutes = [mockRoute3, mockRoute2];

      (RouteService.fetchRecentRoutes as jest.Mock).mockResolvedValue(
        mockRoutes
      );

      const { result } = renderHook(() => useRecentRoutes("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRoutes);
      expect(RouteService.fetchRecentRoutes).toHaveBeenCalledWith(
        "user-123",
        10
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching recent routes",
        { userId: "user-123", limit: 10 },
        "useRecentRoutes"
      );
    });

    it("fetches recent routes with custom limit", async () => {
      const mockRoutes = [mockRoute3];

      (RouteService.fetchRecentRoutes as jest.Mock).mockResolvedValue(
        mockRoutes
      );

      const { result } = renderHook(() => useRecentRoutes("user-123", 5), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRoutes);
      expect(RouteService.fetchRecentRoutes).toHaveBeenCalledWith(
        "user-123",
        5
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching recent routes",
        { userId: "user-123", limit: 5 },
        "useRecentRoutes"
      );
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useRecentRoutes(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(RouteService.fetchRecentRoutes).not.toHaveBeenCalled();
    });

    it("handles fetch error", async () => {
      const mockError = new Error("Failed to fetch recent routes");

      (RouteService.fetchRecentRoutes as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useRecentRoutes("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useUserRouteStats", () => {
    it("calculates and fetches user route stats", async () => {
      (RouteService.calculateUserStats as jest.Mock).mockResolvedValue(
        mockStats
      );

      const { result } = renderHook(() => useUserRouteStats("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(RouteService.calculateUserStats).toHaveBeenCalledWith("user-123");
      expect(logger.debug).toHaveBeenCalledWith(
        "Calculating user route stats",
        { userId: "user-123" },
        "useUserRouteStats"
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "User route stats calculated",
        { userId: "user-123", stats: mockStats },
        "useUserRouteStats"
      );
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useUserRouteStats(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(RouteService.calculateUserStats).not.toHaveBeenCalled();
    });

    it("handles calculation error", async () => {
      const mockError = new Error("Failed to calculate stats");

      (RouteService.calculateUserStats as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useUserRouteStats("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useSaveRoute", () => {
    const mockSaveParams: SaveRouteParams = {
      userId: "user-123",
      distance: 5.2,
      duration: 1800,
      startTime: new Date("2025-01-01T10:00:00Z"),
      endTime: new Date("2025-01-01T10:30:00Z"),
      coordinates: [
        { latitude: 14.65, longitude: 120.98, timestamp: 1704103200000 },
        { latitude: 14.66, longitude: 120.99, timestamp: 1704103260000 },
      ],
      avgSpeed: 10.4,
    };

    it("saves a route successfully", async () => {
      const mockRouteId = "route-new-123";

      (RouteService.saveRoute as jest.Mock).mockResolvedValue(mockRouteId);

      const { result } = renderHook(() => useSaveRoute(), { wrapper });

      result.current.mutate(mockSaveParams);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(RouteService.saveRoute).toHaveBeenCalledWith(mockSaveParams);
      expect(logger.info).toHaveBeenCalledWith(
        "Saving route",
        { userId: "user-123" },
        "useSaveRoute"
      );
      expect(logger.success).toHaveBeenCalledWith(
        "Route saved successfully",
        { routeId: mockRouteId, userId: "user-123" },
        "useSaveRoute"
      );
    });

    it("invalidates queries after successful save", async () => {
      const mockRouteId = "route-new-123";

      (RouteService.saveRoute as jest.Mock).mockResolvedValue(mockRouteId);

      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useSaveRoute(), { wrapper });

      result.current.mutate(mockSaveParams);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.user("user-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.stats("user-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: [...routeKeys.user("user-123"), "recent"],
      });
    });

    it("applies optimistic update on mutation", async () => {
      const mockRoutes = [mockRoute1, mockRoute2];

      queryClient.setQueryData(routeKeys.user("user-123"), mockRoutes);

      (RouteService.saveRoute as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("route-new"), 1000))
      );

      const cancelSpy = jest.spyOn(queryClient, "cancelQueries");

      const { result } = renderHook(() => useSaveRoute(), { wrapper });

      result.current.mutate(mockSaveParams);

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith(
          "Applying optimistic update for route save",
          { userId: "user-123" },
          "useSaveRoute"
        );
      });

      expect(cancelSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.user("user-123"),
      });

      // Mutation should still be pending
      expect(result.current.isPending).toBe(true);
    });

    it("reverts optimistic update on error", async () => {
      const mockRoutes = [mockRoute1, mockRoute2];
      const mockStats = { totalDistance: 8.7, totalRoutes: 2 };

      queryClient.setQueryData(routeKeys.user("user-123"), mockRoutes);
      queryClient.setQueryData(routeKeys.stats("user-123"), mockStats);

      const mockError = new Error("Save failed");

      (RouteService.saveRoute as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSaveRoute(), { wrapper });

      result.current.mutate(mockSaveParams);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to save route",
        { error: mockError, userId: "user-123" },
        "useSaveRoute"
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "Reverting optimistic update for route save",
        { userId: "user-123" },
        "useSaveRoute"
      );

      // Should revert to original data
      const revertedRoutes = queryClient.getQueryData<RouteData[]>(
        routeKeys.user("user-123")
      );
      const revertedStats = queryClient.getQueryData(
        routeKeys.stats("user-123")
      );

      expect(revertedRoutes).toEqual(mockRoutes);
      expect(revertedStats).toEqual(mockStats);
    });

    it("handles save error", async () => {
      const mockError = new Error("Failed to save route");

      (RouteService.saveRoute as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSaveRoute(), { wrapper });

      result.current.mutate(mockSaveParams);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to save route",
        { error: mockError, userId: "user-123" },
        "useSaveRoute"
      );
    });
  });

  describe("useInvalidateRoutes", () => {
    it("invalidates all routes cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateRoutes(), { wrapper });

      await result.current.invalidateAll();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.all,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating all routes cache",
        null,
        "useInvalidateRoutes"
      );
    });

    it("invalidates user routes cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateRoutes(), { wrapper });

      await result.current.invalidateUser("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.user("user-123"),
      });
      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating user routes cache",
        { userId: "user-123" },
        "useInvalidateRoutes"
      );
    });

    it("invalidates user stats cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateRoutes(), { wrapper });

      await result.current.invalidateStats("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.stats("user-123"),
      });
      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating user stats cache",
        { userId: "user-123" },
        "useInvalidateRoutes"
      );
    });

    it("invalidates recent routes cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateRoutes(), { wrapper });

      await result.current.invalidateRecent("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: [...routeKeys.user("user-123"), "recent"],
      });
      expect(logger.debug).toHaveBeenCalledWith(
        "Invalidating recent routes cache",
        { userId: "user-123" },
        "useInvalidateRoutes"
      );
    });
  });

  describe("usePrefetchRoutes", () => {
    it("prefetches user routes", async () => {
      const mockRoutes = [mockRoute1, mockRoute2];

      (RouteService.fetchUserRoutes as jest.Mock).mockResolvedValue(mockRoutes);

      const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

      const { result } = renderHook(() => usePrefetchRoutes(), { wrapper });

      await result.current.prefetchUserRoutes("user-123");

      expect(prefetchSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.user("user-123"),
        queryFn: expect.any(Function),
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Prefetching user routes",
        { userId: "user-123" },
        "usePrefetchRoutes"
      );

      // Verify the data is in cache
      const cachedData = queryClient.getQueryData(routeKeys.user("user-123"));
      expect(cachedData).toEqual(mockRoutes);
    });

    it("prefetches user stats", async () => {
      (RouteService.calculateUserStats as jest.Mock).mockResolvedValue(
        mockStats
      );

      const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

      const { result } = renderHook(() => usePrefetchRoutes(), { wrapper });

      await result.current.prefetchStats("user-123");

      expect(prefetchSpy).toHaveBeenCalledWith({
        queryKey: routeKeys.stats("user-123"),
        queryFn: expect.any(Function),
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Prefetching user stats",
        { userId: "user-123" },
        "usePrefetchRoutes"
      );

      // Verify the data is in cache
      const cachedStats = queryClient.getQueryData(routeKeys.stats("user-123"));
      expect(cachedStats).toEqual(mockStats);
    });
  });

  describe("routeKeys", () => {
    it("generates correct query keys", () => {
      expect(routeKeys.all).toEqual(["routes"]);
      expect(routeKeys.user("user-123")).toEqual(["routes", "user-123"]);
      expect(routeKeys.recent("user-123", 10)).toEqual([
        "routes",
        "user-123",
        "recent",
        10,
      ]);
      expect(routeKeys.stats("user-123")).toEqual([
        "routes",
        "user-123",
        "stats",
      ]);
    });
  });
});
