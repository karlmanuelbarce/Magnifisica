import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  GeoPoint: jest.fn((lat: number, lng: number) => ({
    latitude: lat,
    longitude: lng,
  })),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
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
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  GeoPoint,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { RouteService, SaveRouteParams, RouteData } from "./RouteService";
import { logger } from "../utils/logger";

describe("RouteService", () => {
  const mockCollection = collection as jest.Mock;
  const mockAddDoc = addDoc as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;
  const mockOrderBy = orderBy as jest.Mock;
  const mockLimit = limit as jest.Mock;
  const mockGeoPoint = GeoPoint as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ _collectionPath: "routes" });
    mockQuery.mockReturnValue({ _query: "filtered" });
    mockWhere.mockReturnValue({ _where: "condition" });
    mockOrderBy.mockReturnValue({ _orderBy: "sorted" });
    mockLimit.mockReturnValue({ _limit: "limited" });
  });

  describe("saveRoute", () => {
    const validSaveParams: SaveRouteParams = {
      userId: "user-123",
      distanceMeters: 5000,
      durationSeconds: 1800,
      startPoint: [121.0, 14.5],
      endPoint: [121.1, 14.6],
      routePoints: [
        [121.0, 14.5],
        [121.05, 14.55],
        [121.1, 14.6],
      ],
    };

    it("saves a route successfully", async () => {
      const mockDocRef = { id: "route-123" };
      const mockCollectionRef = { _collectionPath: "routes" };

      mockCollection.mockReturnValue(mockCollectionRef);
      mockAddDoc.mockResolvedValue(mockDocRef);

      const routeId = await RouteService.saveRoute(validSaveParams);

      expect(logger.info).toHaveBeenCalledWith(
        "Saving route",
        {
          userId: "user-123",
          distanceMeters: 5000,
          durationSeconds: 1800,
          routePointsCount: 3,
        },
        "RouteService"
      );

      expect(mockAddDoc).toHaveBeenCalledWith(mockCollectionRef, {
        userID: "user-123",
        distanceMeters: 5000,
        durationSeconds: 1800,
        createdAt: expect.anything(),
        startPoint: { latitude: 14.5, longitude: 121.0 },
        endPoint: { latitude: 14.6, longitude: 121.1 },
        routePoints: [
          { latitude: 14.5, longitude: 121.0 },
          { latitude: 14.55, longitude: 121.05 },
          { latitude: 14.6, longitude: 121.1 },
        ],
      });

      expect(routeId).toBe("route-123");

      expect(logger.success).toHaveBeenCalledWith(
        "Route saved successfully: route-123",
        {
          routeId: "route-123",
          userId: "user-123",
          distanceKm: "5.00",
          durationMin: "30.0",
        },
        "RouteService"
      );
    });

    it("converts coordinates correctly (lng, lat to lat, lng)", async () => {
      const mockDocRef = { id: "route-456" };
      mockAddDoc.mockResolvedValue(mockDocRef);

      await RouteService.saveRoute(validSaveParams);

      // Verify GeoPoint is called with (latitude, longitude) order
      expect(mockGeoPoint).toHaveBeenCalledWith(14.5, 121.0); // startPoint
      expect(mockGeoPoint).toHaveBeenCalledWith(14.6, 121.1); // endPoint
      expect(mockGeoPoint).toHaveBeenCalledWith(14.5, 121.0); // routePoint 1
      expect(mockGeoPoint).toHaveBeenCalledWith(14.55, 121.05); // routePoint 2
      expect(mockGeoPoint).toHaveBeenCalledWith(14.6, 121.1); // routePoint 3
    });

    it("throws error when userId is missing", async () => {
      const invalidParams = {
        ...validSaveParams,
        userId: "",
      };

      await expect(RouteService.saveRoute(invalidParams)).rejects.toThrow(
        "SAVE_ROUTE_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Route save failed: User ID is required",
        null,
        "RouteService"
      );

      // Verify the error was also logged as the main error
      expect(logger.error).toHaveBeenCalledWith(
        "Error saving route",
        expect.any(Error),
        "RouteService"
      );
    });

    it("throws error when distance is zero or negative", async () => {
      const invalidParams = {
        ...validSaveParams,
        distanceMeters: 0,
      };

      await expect(RouteService.saveRoute(invalidParams)).rejects.toThrow(
        "SAVE_ROUTE_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Route save failed: Invalid distance",
        { distanceMeters: 0 },
        "RouteService"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error saving route",
        expect.any(Error),
        "RouteService"
      );
    });

    it("throws error when startPoint is missing", async () => {
      const invalidParams = {
        ...validSaveParams,
        startPoint: null as any,
      };

      await expect(RouteService.saveRoute(invalidParams)).rejects.toThrow(
        "SAVE_ROUTE_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Route save failed: Missing coordinates",
        { hasStart: false, hasEnd: true },
        "RouteService"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error saving route",
        expect.any(Error),
        "RouteService"
      );
    });

    it("throws error when endPoint is missing", async () => {
      const invalidParams = {
        ...validSaveParams,
        endPoint: null as any,
      };

      await expect(RouteService.saveRoute(invalidParams)).rejects.toThrow(
        "SAVE_ROUTE_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Route save failed: Missing coordinates",
        { hasStart: true, hasEnd: false },
        "RouteService"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error saving route",
        expect.any(Error),
        "RouteService"
      );
    });

    it("handles errors when saving to Firestore fails", async () => {
      const error = new Error("Firestore error");
      mockAddDoc.mockRejectedValue(error);

      await expect(RouteService.saveRoute(validSaveParams)).rejects.toThrow(
        "SAVE_ROUTE_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error saving route",
        error,
        "RouteService"
      );
    });

    it("includes server timestamp when saving", async () => {
      const mockDocRef = { id: "route-789" };
      mockAddDoc.mockResolvedValue(mockDocRef);

      await RouteService.saveRoute(validSaveParams);

      expect(serverTimestamp).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          createdAt: expect.objectContaining({
            seconds: expect.any(Number),
          }),
        })
      );
    });
  });

  describe("fetchUserRoutes", () => {
    it("fetches all routes for a user", async () => {
      const mockDocs = [
        {
          id: "route-1",
          data: () => ({
            userID: "user-123",
            distanceMeters: 5000,
            durationSeconds: 1800,
            createdAt: { seconds: 1234567890 },
            startPoint: { latitude: 14.5, longitude: 121.0 },
            endPoint: { latitude: 14.6, longitude: 121.1 },
            routePoints: [
              { latitude: 14.5, longitude: 121.0 },
              { latitude: 14.6, longitude: 121.1 },
            ],
          }),
        },
        {
          id: "route-2",
          data: () => ({
            userID: "user-123",
            distanceMeters: 3000,
            durationSeconds: 1200,
            createdAt: { seconds: 1234567800 },
            startPoint: { latitude: 14.7, longitude: 121.2 },
            endPoint: { latitude: 14.8, longitude: 121.3 },
            routePoints: [
              { latitude: 14.7, longitude: 121.2 },
              { latitude: 14.8, longitude: 121.3 },
            ],
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const routes = await RouteService.fetchUserRoutes("user-123");

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching all user routes",
        { userId: "user-123" },
        "RouteService"
      );

      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith("userID", "==", "user-123");
      expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");

      expect(routes).toHaveLength(2);
      expect(routes[0].id).toBe("route-1");
      expect(routes[0].distanceMeters).toBe(5000);
      expect(routes[1].id).toBe("route-2");
      expect(routes[1].distanceMeters).toBe(3000);

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched user routes: 2",
        { userId: "user-123", count: 2 },
        "RouteService"
      );
    });

    it("returns empty array when user has no routes", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      });

      const routes = await RouteService.fetchUserRoutes("user-123");

      expect(routes).toHaveLength(0);
      expect(logger.success).toHaveBeenCalledWith(
        "Fetched user routes: 0",
        { userId: "user-123", count: 0 },
        "RouteService"
      );
    });

    it("correctly maps GeoPoint data to coordinate objects", async () => {
      const mockDocs = [
        {
          id: "route-1",
          data: () => ({
            userID: "user-123",
            distanceMeters: 5000,
            durationSeconds: 1800,
            createdAt: { seconds: 1234567890 },
            startPoint: { latitude: 14.5, longitude: 121.0 },
            endPoint: { latitude: 14.6, longitude: 121.1 },
            routePoints: [
              { latitude: 14.5, longitude: 121.0 },
              { latitude: 14.55, longitude: 121.05 },
              { latitude: 14.6, longitude: 121.1 },
            ],
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const routes = await RouteService.fetchUserRoutes("user-123");

      expect(routes[0].startPoint).toEqual({
        latitude: 14.5,
        longitude: 121.0,
      });
      expect(routes[0].endPoint).toEqual({
        latitude: 14.6,
        longitude: 121.1,
      });
      expect(routes[0].routePoints).toHaveLength(3);
      expect(routes[0].routePoints[0]).toEqual({
        latitude: 14.5,
        longitude: 121.0,
      });
    });

    it("handles errors when fetching routes fails", async () => {
      const error = new Error("Firestore error");
      mockGetDocs.mockRejectedValue(error);

      await expect(RouteService.fetchUserRoutes("user-123")).rejects.toThrow(
        "FETCH_ROUTES_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching user routes",
        error,
        "RouteService"
      );
    });
  });

  describe("fetchRecentRoutes", () => {
    it("fetches recent routes with default limit", async () => {
      const mockDocs = [
        {
          id: "route-1",
          data: () => ({
            userID: "user-123",
            distanceMeters: 5000,
            durationSeconds: 1800,
            createdAt: { seconds: 1234567890 },
            startPoint: { latitude: 14.5, longitude: 121.0 },
            endPoint: { latitude: 14.6, longitude: 121.1 },
            routePoints: [],
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const routes = await RouteService.fetchRecentRoutes("user-123");

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching recent routes (limit: 10)",
        { userId: "user-123", limitCount: 10 },
        "RouteService"
      );

      expect(mockLimit).toHaveBeenCalledWith(10);

      expect(routes).toHaveLength(1);

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched recent routes: 1",
        { userId: "user-123", count: 1, limitCount: 10 },
        "RouteService"
      );
    });

    it("fetches recent routes with custom limit", async () => {
      const mockDocs = [
        {
          id: "route-1",
          data: () => ({
            userID: "user-123",
            distanceMeters: 5000,
            durationSeconds: 1800,
            createdAt: { seconds: 1234567890 },
            startPoint: { latitude: 14.5, longitude: 121.0 },
            endPoint: { latitude: 14.6, longitude: 121.1 },
            routePoints: [],
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const routes = await RouteService.fetchRecentRoutes("user-123", 5);

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching recent routes (limit: 5)",
        { userId: "user-123", limitCount: 5 },
        "RouteService"
      );

      expect(mockLimit).toHaveBeenCalledWith(5);

      expect(logger.success).toHaveBeenCalledWith(
        "Fetched recent routes: 1",
        { userId: "user-123", count: 1, limitCount: 5 },
        "RouteService"
      );
    });

    it("returns empty array when no recent routes exist", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      });

      const routes = await RouteService.fetchRecentRoutes("user-123", 5);

      expect(routes).toHaveLength(0);
      expect(logger.success).toHaveBeenCalledWith(
        "Fetched recent routes: 0",
        { userId: "user-123", count: 0, limitCount: 5 },
        "RouteService"
      );
    });

    it("handles errors when fetching recent routes fails", async () => {
      const error = new Error("Firestore error");
      mockGetDocs.mockRejectedValue(error);

      await expect(
        RouteService.fetchRecentRoutes("user-123", 5)
      ).rejects.toThrow("FETCH_RECENT_ROUTES_FAILED");

      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching recent routes",
        error,
        "RouteService"
      );
    });
  });

  describe("calculateUserStats", () => {
    it("calculates statistics correctly for multiple routes", async () => {
      const mockRoutes: RouteData[] = [
        {
          id: "route-1",
          userID: "user-123",
          distanceMeters: 5000,
          durationSeconds: 1800,
          createdAt: new Date(),
          startPoint: { latitude: 14.5, longitude: 121.0 },
          endPoint: { latitude: 14.6, longitude: 121.1 },
          routePoints: [],
        },
        {
          id: "route-2",
          userID: "user-123",
          distanceMeters: 3000,
          durationSeconds: 1200,
          createdAt: new Date(),
          startPoint: { latitude: 14.5, longitude: 121.0 },
          endPoint: { latitude: 14.6, longitude: 121.1 },
          routePoints: [],
        },
        {
          id: "route-3",
          userID: "user-123",
          distanceMeters: 7000,
          durationSeconds: 2400,
          createdAt: new Date(),
          startPoint: { latitude: 14.5, longitude: 121.0 },
          endPoint: { latitude: 14.6, longitude: 121.1 },
          routePoints: [],
        },
      ];

      jest.spyOn(RouteService, "fetchUserRoutes").mockResolvedValue(mockRoutes);

      const stats = await RouteService.calculateUserStats("user-123");

      expect(logger.info).toHaveBeenCalledWith(
        "Calculating user stats",
        { userId: "user-123" },
        "RouteService"
      );

      expect(stats.totalDistance).toBe(15000); // 5000 + 3000 + 7000
      expect(stats.totalDuration).toBe(5400); // 1800 + 1200 + 2400
      expect(stats.totalRoutes).toBe(3);
      expect(stats.averageDistance).toBe(5000); // 15000 / 3
      expect(stats.averageDuration).toBe(1800); // 5400 / 3

      expect(logger.success).toHaveBeenCalledWith(
        "User stats calculated",
        {
          userId: "user-123",
          totalRoutes: 3,
          totalDistanceKm: "15.00",
          totalDurationHours: "1.50",
        },
        "RouteService"
      );
    });

    it("returns zeros when user has no routes", async () => {
      jest.spyOn(RouteService, "fetchUserRoutes").mockResolvedValue([]);

      const stats = await RouteService.calculateUserStats("user-123");

      expect(stats.totalDistance).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.totalRoutes).toBe(0);
      expect(stats.averageDistance).toBe(0);
      expect(stats.averageDuration).toBe(0);

      expect(logger.success).toHaveBeenCalledWith(
        "User stats calculated",
        {
          userId: "user-123",
          totalRoutes: 0,
          totalDistanceKm: "0.00",
          totalDurationHours: "0.00",
        },
        "RouteService"
      );
    });

    it("calculates averages correctly for single route", async () => {
      const mockRoutes: RouteData[] = [
        {
          id: "route-1",
          userID: "user-123",
          distanceMeters: 10000,
          durationSeconds: 3600,
          createdAt: new Date(),
          startPoint: { latitude: 14.5, longitude: 121.0 },
          endPoint: { latitude: 14.6, longitude: 121.1 },
          routePoints: [],
        },
      ];

      jest.spyOn(RouteService, "fetchUserRoutes").mockResolvedValue(mockRoutes);

      const stats = await RouteService.calculateUserStats("user-123");

      expect(stats.totalDistance).toBe(10000);
      expect(stats.totalDuration).toBe(3600);
      expect(stats.totalRoutes).toBe(1);
      expect(stats.averageDistance).toBe(10000); // Same as total for 1 route
      expect(stats.averageDuration).toBe(3600); // Same as total for 1 route
    });

    it("handles errors when calculating stats fails", async () => {
      const error = new Error("Fetch failed");
      jest.spyOn(RouteService, "fetchUserRoutes").mockRejectedValue(error);

      await expect(RouteService.calculateUserStats("user-123")).rejects.toThrow(
        "CALCULATE_STATS_FAILED"
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Error calculating user stats",
        error,
        "RouteService"
      );
    });
  });
});
