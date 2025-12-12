import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Mock dependencies
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
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
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "@react-native-firebase/firestore";
import {
  ProfileService,
  JoinedChallenge,
  WeeklyChartData,
  ProfileData,
} from "./ProfileService";
import { logger } from "../utils/logger";

describe("ProfileService", () => {
  const mockCollection = collection as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;
  const mockOrderBy = orderBy as jest.Mock;
  const mockOnSnapshot = onSnapshot as jest.Mock;

  // Helper to create mock Timestamp
  const createMockTimestamp = (date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ _collectionPath: "collection" });
    mockQuery.mockReturnValue({ _query: "filtered" });
    mockWhere.mockReturnValue({ _where: "condition" });
    mockOrderBy.mockReturnValue({ _orderBy: "sorted" });

    // Mock Date to have consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("subscribeToWeeklyActivity", () => {
    it("subscribes to weekly activity and calculates daily totals", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      // Mock routes data - spread across different days
      const mockDocs = [
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-15T10:00:00Z")), // Today
            distanceMeters: 5000, // 5km
          }),
        },
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-14T10:00:00Z")), // Yesterday
            distanceMeters: 3000, // 3km
          }),
        },
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-13T10:00:00Z")), // 2 days ago
            distanceMeters: 7000, // 7km
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
          size: mockDocs.length,
        });
        return mockUnsubscribe;
      });

      const unsubscribe = ProfileService.subscribeToWeeklyActivity(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Subscribing to weekly activity",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(mockOnUpdate).toHaveBeenCalled();
      const chartData = mockOnUpdate.mock.calls[0][0] as WeeklyChartData;

      // Verify labels (last 7 days)
      expect(chartData.labels).toHaveLength(7);
      expect(chartData.labels[6]).toBe("Mo"); // Today is Monday

      // Verify data array has 7 elements
      expect(chartData.data).toHaveLength(7);

      // Verify distances are calculated in km
      const totalDistance = chartData.data.reduce((sum, val) => sum + val, 0);
      expect(totalDistance).toBe(15); // 5 + 3 + 7 = 15km

      expect(logger.debug).toHaveBeenCalledWith(
        "Weekly activity updated: 15.00km total",
        { userId: "user-123", totalDistance: 15, routeCount: 3 },
        "ProfileService"
      );

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("returns zeros when user has no routes", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => {},
          size: 0,
        });
        return jest.fn();
      });

      ProfileService.subscribeToWeeklyActivity(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnUpdate).toHaveBeenCalled();
      const chartData = mockOnUpdate.mock.calls[0][0] as WeeklyChartData;

      expect(chartData.labels).toHaveLength(7);
      expect(chartData.data).toEqual([0, 0, 0, 0, 0, 0, 0]);

      expect(logger.debug).toHaveBeenCalledWith(
        "Weekly activity updated: 0.00km total",
        { userId: "user-123", totalDistance: 0, routeCount: 0 },
        "ProfileService"
      );
    });

    it("calls onError when subscription fails", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("Subscription error");

      mockOnSnapshot.mockImplementation((queryRef, onNext, onError) => {
        onError(error);
        return jest.fn();
      });

      ProfileService.subscribeToWeeklyActivity(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnError).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to weekly activity",
        error,
        "ProfileService"
      );
    });

    it("correctly aggregates multiple routes on the same day", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockDocs = [
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-15T08:00:00Z")),
            distanceMeters: 2000,
          }),
        },
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-15T14:00:00Z")),
            distanceMeters: 3000,
          }),
        },
        {
          data: () => ({
            createdAt: createMockTimestamp(new Date("2024-01-15T20:00:00Z")),
            distanceMeters: 4000,
          }),
        },
      ];

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        onNext({
          forEach: (callback: any) => mockDocs.forEach(callback),
          size: mockDocs.length,
        });
        return jest.fn();
      });

      ProfileService.subscribeToWeeklyActivity(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      const chartData = mockOnUpdate.mock.calls[0][0] as WeeklyChartData;
      const totalDistance = chartData.data.reduce((sum, val) => sum + val, 0);

      // All 3 routes are on the same day, should total 9km
      expect(totalDistance).toBe(9);
    });
  });

  describe("subscribeToJoinedChallenges", () => {
    it("subscribes to joined challenges and calculates progress", async () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe = jest.fn();

      const mockChallenge: JoinedChallenge = {
        id: "challenge-1",
        challengeId: "challenge-abc",
        challengeTitle: "30 Day Challenge",
        challengeDescription: "Run 100km",
        challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
        challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
        isCompleted: false,
        progress: 0,
        joinedAt: createMockTimestamp(new Date("2024-01-01")),
        targetMetre: 100000,
      };

      const mockChallengeDocs = [
        {
          id: "challenge-1",
          data: () => mockChallenge,
        },
      ];

      // Mock routes for progress calculation
      const mockRoutes = [
        {
          data: () => ({
            distanceMeters: 5000,
          }),
        },
        {
          data: () => ({
            distanceMeters: 3000,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockRoutes.forEach(callback),
        size: mockRoutes.length,
      });

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        // Use setImmediate to handle the async callback
        setImmediate(async () => {
          await onNext({
            docs: mockChallengeDocs,
            size: mockChallengeDocs.length,
          });
        });
        return mockUnsubscribe;
      });

      const unsubscribe = ProfileService.subscribeToJoinedChallenges(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      // Wait for async operations to complete
      await jest.runAllTimersAsync();

      expect(logger.info).toHaveBeenCalledWith(
        "Subscribing to joined challenges",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(mockOnUpdate).toHaveBeenCalled();
      const challenges = mockOnUpdate.mock.calls[0][0] as JoinedChallenge[];

      expect(challenges).toHaveLength(1);
      expect(challenges[0].id).toBe("challenge-1");
      expect(challenges[0].calculatedProgress).toBe(8000); // 5000 + 3000

      expect(logger.success).toHaveBeenCalledWith(
        "Joined challenges updated: 1",
        { userId: "user-123", count: 1 },
        "ProfileService"
      );

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("skips progress calculation for completed challenges", async () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockChallenge: JoinedChallenge = {
        id: "challenge-1",
        challengeId: "challenge-abc",
        challengeTitle: "Completed Challenge",
        challengeDescription: "Run 100km",
        challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
        challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
        isCompleted: true,
        progress: 100000,
        joinedAt: createMockTimestamp(new Date("2024-01-01")),
        targetMetre: 100000,
      };

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        setImmediate(async () => {
          await onNext({
            docs: [
              {
                id: "challenge-1",
                data: () => mockChallenge,
              },
            ],
            size: 1,
          });
        });
        return jest.fn();
      });

      ProfileService.subscribeToJoinedChallenges(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      await jest.runAllTimersAsync();

      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();

      const challenges = mockOnUpdate.mock.calls[0][0] as JoinedChallenge[];
      expect(challenges[0].calculatedProgress).toBe(0);
    });

    it("handles empty challenge list", async () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        setImmediate(async () => {
          await onNext({
            docs: [],
            size: 0,
          });
        });
        return jest.fn();
      });

      ProfileService.subscribeToJoinedChallenges(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      await jest.runAllTimersAsync();

      expect(mockOnUpdate).toHaveBeenCalledWith([]);

      expect(logger.success).toHaveBeenCalledWith(
        "Joined challenges updated: 0",
        { userId: "user-123", count: 0 },
        "ProfileService"
      );
    });

    it("calls onError when subscription fails", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("Subscription error");

      mockOnSnapshot.mockImplementation((queryRef, onNext, onError) => {
        onError(error);
        return jest.fn();
      });

      ProfileService.subscribeToJoinedChallenges(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(mockOnError).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to joined challenges",
        error,
        "ProfileService"
      );
    });

    it("handles errors during progress calculation", async () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const error = new Error("getDocs failed");

      const mockChallenge: JoinedChallenge = {
        id: "challenge-1",
        challengeId: "challenge-abc",
        challengeTitle: "30 Day Challenge",
        challengeDescription: "Run 100km",
        challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
        challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
        isCompleted: false,
        progress: 0,
        joinedAt: createMockTimestamp(new Date("2024-01-01")),
      };

      mockOnSnapshot.mockImplementation((queryRef, onNext) => {
        setImmediate(async () => {
          await onNext({
            docs: [
              {
                id: "challenge-1",
                data: () => mockChallenge,
              },
            ],
            size: 1,
          });
        });
        return jest.fn();
      });

      mockGetDocs.mockRejectedValue(error);

      ProfileService.subscribeToJoinedChallenges(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      await jest.runAllTimersAsync();

      expect(mockOnError).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        "Error calculating progress in subscription",
        error,
        "ProfileService"
      );
    });
  });

  describe("subscribeToProfileData", () => {
    it("subscribes to both weekly activity and challenges", async () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();

      const mockWeeklyData: WeeklyChartData = {
        labels: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        data: [5, 3, 7, 0, 2, 4, 6],
      };

      const mockChallenges: JoinedChallenge[] = [
        {
          id: "challenge-1",
          challengeId: "challenge-abc",
          challengeTitle: "30 Day Challenge",
          challengeDescription: "Run 100km",
          challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
          challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
          isCompleted: false,
          progress: 0,
          joinedAt: createMockTimestamp(new Date("2024-01-01")),
          calculatedProgress: 5000,
        },
      ];

      let weeklyCallback: any;
      let challengesCallback: any;

      // Mock the subscription methods
      jest
        .spyOn(ProfileService, "subscribeToWeeklyActivity")
        .mockImplementation((userId, onUpdate, onError) => {
          weeklyCallback = onUpdate;
          return mockUnsubscribe1;
        });

      jest
        .spyOn(ProfileService, "subscribeToJoinedChallenges")
        .mockImplementation((userId, onUpdate, onError) => {
          challengesCallback = onUpdate;
          return mockUnsubscribe2;
        });

      const unsubscribe = ProfileService.subscribeToProfileData(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Subscribing to profile data (weekly + challenges)",
        { userId: "user-123" },
        "ProfileService"
      );

      // Trigger weekly callback
      weeklyCallback(mockWeeklyData);
      expect(mockOnUpdate).not.toHaveBeenCalled(); // Not yet, need both

      // Trigger challenges callback
      challengesCallback(mockChallenges);

      // Now both are ready
      expect(mockOnUpdate).toHaveBeenCalledWith({
        weeklyActivity: mockWeeklyData,
        challenges: mockChallenges,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Profile data merged and ready",
        {
          userId: "user-123",
          hasWeekly: true,
          hasChallenges: true,
          challengeCount: 1,
        },
        "ProfileService"
      );

      // Test unsubscribe
      unsubscribe();

      expect(logger.debug).toHaveBeenCalledWith(
        "Unsubscribing from profile data",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
    });

    it("waits for both subscriptions before calling onUpdate", () => {
      const mockOnUpdate = jest.fn();
      const mockOnError = jest.fn();

      const mockWeeklyData: WeeklyChartData = {
        labels: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        data: [1, 2, 3, 4, 5, 6, 7],
      };

      let weeklyCallback: any;

      jest
        .spyOn(ProfileService, "subscribeToWeeklyActivity")
        .mockImplementation((userId, onUpdate, onError) => {
          weeklyCallback = onUpdate;
          return jest.fn();
        });

      jest
        .spyOn(ProfileService, "subscribeToJoinedChallenges")
        .mockImplementation((userId, onUpdate, onError) => {
          // Don't call the callback yet
          return jest.fn();
        });

      ProfileService.subscribeToProfileData(
        "user-123",
        mockOnUpdate,
        mockOnError
      );

      // Trigger only weekly
      weeklyCallback(mockWeeklyData);

      // Should not call onUpdate yet
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("fetchWeeklyActivity", () => {
    it("fetches weekly activity as a one-time operation", async () => {
      const mockUnsubscribe = jest.fn();
      const mockWeeklyData: WeeklyChartData = {
        labels: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        data: [5, 3, 7, 0, 2, 4, 6],
      };

      let capturedOnUpdate: any;
      jest
        .spyOn(ProfileService, "subscribeToWeeklyActivity")
        .mockImplementation((userId, onUpdate, onError) => {
          capturedOnUpdate = onUpdate;
          return mockUnsubscribe;
        });

      const resultPromise = ProfileService.fetchWeeklyActivity("user-123");

      // Trigger the callback after the subscription is set up
      capturedOnUpdate(mockWeeklyData);

      const result = await resultPromise;

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching weekly activity (one-time)",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(result).toEqual(mockWeeklyData);

      expect(logger.success).toHaveBeenCalledWith(
        "Weekly activity fetched",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("fetchJoinedChallenges", () => {
    it("fetches joined challenges as a one-time operation", async () => {
      const mockUnsubscribe = jest.fn();
      const mockChallenges: JoinedChallenge[] = [
        {
          id: "challenge-1",
          challengeId: "challenge-abc",
          challengeTitle: "30 Day Challenge",
          challengeDescription: "Run 100km",
          challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
          challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
          isCompleted: false,
          progress: 0,
          joinedAt: createMockTimestamp(new Date("2024-01-01")),
          calculatedProgress: 5000,
        },
      ];

      let capturedOnUpdate: any;
      jest
        .spyOn(ProfileService, "subscribeToJoinedChallenges")
        .mockImplementation((userId, onUpdate, onError) => {
          capturedOnUpdate = onUpdate;
          return mockUnsubscribe;
        });

      const resultPromise = ProfileService.fetchJoinedChallenges("user-123");

      // Trigger the callback after the subscription is set up
      capturedOnUpdate(mockChallenges);

      const result = await resultPromise;

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching joined challenges (one-time)",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(result).toEqual(mockChallenges);

      expect(logger.success).toHaveBeenCalledWith(
        "Joined challenges fetched: 1",
        { userId: "user-123", count: 1 },
        "ProfileService"
      );

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("fetchProfileData", () => {
    it("fetches profile data as a one-time operation", async () => {
      const mockUnsubscribe = jest.fn();
      const mockProfileData: ProfileData = {
        weeklyActivity: {
          labels: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
          data: [5, 3, 7, 0, 2, 4, 6],
        },
        challenges: [
          {
            id: "challenge-1",
            challengeId: "challenge-abc",
            challengeTitle: "30 Day Challenge",
            challengeDescription: "Run 100km",
            challengeStartDate: createMockTimestamp(new Date("2024-01-01")),
            challengeEndDate: createMockTimestamp(new Date("2024-01-31")),
            isCompleted: false,
            progress: 0,
            joinedAt: createMockTimestamp(new Date("2024-01-01")),
            calculatedProgress: 5000,
          },
        ],
      };

      let capturedOnUpdate: any;
      jest
        .spyOn(ProfileService, "subscribeToProfileData")
        .mockImplementation((userId, onUpdate, onError) => {
          capturedOnUpdate = onUpdate;
          return mockUnsubscribe;
        });

      const resultPromise = ProfileService.fetchProfileData("user-123");

      // Trigger the callback after the subscription is set up
      capturedOnUpdate(mockProfileData);

      const result = await resultPromise;

      expect(logger.info).toHaveBeenCalledWith(
        "Fetching profile data (one-time)",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(result).toEqual(mockProfileData);

      expect(logger.success).toHaveBeenCalledWith(
        "Profile data fetched",
        { userId: "user-123" },
        "ProfileService"
      );

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
