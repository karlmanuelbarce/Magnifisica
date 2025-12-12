import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";

// Mock dependencies BEFORE any imports that use them
jest.mock("../services/ProfileService", () => ({
  ProfileService: {
    fetchProfileData: jest.fn(),
    fetchWeeklyActivity: jest.fn(),
    fetchJoinedChallenges: jest.fn(),
  },
}));

// Import after mocking
import { ProfileService } from "../services/ProfileService";
import {
  useProfileData,
  useWeeklyActivity,
  useJoinedChallenges,
  useInvalidateProfile,
  usePrefetchProfile,
  profileKeys,
} from "./userProfile";

// Mock types - adjust based on your actual types
interface WeeklyActivity {
  date: string;
  distance: number;
  duration: number;
  calories: number;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  progress: number;
  goal: number;
  endDate: string;
}

interface ProfileData {
  weeklyActivity: WeeklyActivity[];
  challenges: Challenge[];
}

// Mock profile data
const mockWeeklyActivity: WeeklyActivity[] = [
  {
    date: "2025-01-06",
    distance: 5.2,
    duration: 1800,
    calories: 450,
  },
  {
    date: "2025-01-07",
    distance: 3.5,
    duration: 1200,
    calories: 320,
  },
  {
    date: "2025-01-08",
    distance: 7.8,
    duration: 2400,
    calories: 580,
  },
];

const mockChallenges: Challenge[] = [
  {
    id: "challenge-1",
    name: "100km Challenge",
    description: "Run 100km in January",
    progress: 45.5,
    goal: 100,
    endDate: "2025-01-31",
  },
  {
    id: "challenge-2",
    name: "Daily Streak",
    description: "Exercise every day for 30 days",
    progress: 15,
    goal: 30,
    endDate: "2025-02-15",
  },
];

const mockProfileData: ProfileData = {
  weeklyActivity: mockWeeklyActivity,
  challenges: mockChallenges,
};

describe("useProfile hooks", () => {
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

  describe("useProfileData", () => {
    it("fetches complete profile data", async () => {
      (ProfileService.fetchProfileData as jest.Mock).mockResolvedValue(
        mockProfileData
      );

      const { result } = renderHook(() => useProfileData("user-123"), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfileData);
      expect(ProfileService.fetchProfileData).toHaveBeenCalledWith("user-123");
      expect(ProfileService.fetchProfileData).toHaveBeenCalledTimes(1);
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useProfileData(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(ProfileService.fetchProfileData).not.toHaveBeenCalled();
    });

    it("caches profile data with correct staleTime", async () => {
      (ProfileService.fetchProfileData as jest.Mock).mockResolvedValue(
        mockProfileData
      );

      const { result, rerender } = renderHook(
        () => useProfileData("user-123"),
        {
          wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      jest.clearAllMocks();

      // Rerender - should use cached data
      rerender();

      expect(ProfileService.fetchProfileData).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockProfileData);
    });

    it("refetches when userId changes", async () => {
      const mockProfileData2: ProfileData = {
        weeklyActivity: [mockWeeklyActivity[0]],
        challenges: [mockChallenges[0]],
      };

      (ProfileService.fetchProfileData as jest.Mock).mockImplementation(
        (userId) => {
          if (userId === "user-123") return Promise.resolve(mockProfileData);
          if (userId === "user-456") return Promise.resolve(mockProfileData2);
          return Promise.resolve(null);
        }
      );

      const { result, rerender } = renderHook(
        ({ userId }) => useProfileData(userId),
        {
          wrapper,
          initialProps: { userId: "user-123" },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfileData);

      // Change userId
      rerender({ userId: "user-456" });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProfileData2);
      });

      expect(ProfileService.fetchProfileData).toHaveBeenCalledWith("user-456");
    });
  });

  describe("useWeeklyActivity", () => {
    it("fetches weekly activity data", async () => {
      (ProfileService.fetchWeeklyActivity as jest.Mock).mockResolvedValue(
        mockWeeklyActivity
      );

      const { result } = renderHook(() => useWeeklyActivity("user-123"), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWeeklyActivity);
      expect(ProfileService.fetchWeeklyActivity).toHaveBeenCalledWith(
        "user-123"
      );
      expect(ProfileService.fetchWeeklyActivity).toHaveBeenCalledTimes(1);
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useWeeklyActivity(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(ProfileService.fetchWeeklyActivity).not.toHaveBeenCalled();
    });

    it("handles fetch error", async () => {
      const mockError = new Error("Failed to fetch weekly activity");

      (ProfileService.fetchWeeklyActivity as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useWeeklyActivity("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it("caches weekly activity with correct staleTime", async () => {
      (ProfileService.fetchWeeklyActivity as jest.Mock).mockResolvedValue(
        mockWeeklyActivity
      );

      const { result, rerender } = renderHook(
        () => useWeeklyActivity("user-123"),
        {
          wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      jest.clearAllMocks();

      // Rerender - should use cached data
      rerender();

      expect(ProfileService.fetchWeeklyActivity).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockWeeklyActivity);
    });
  });

  describe("useJoinedChallenges", () => {
    it("fetches joined challenges", async () => {
      (ProfileService.fetchJoinedChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );

      const { result } = renderHook(() => useJoinedChallenges("user-123"), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockChallenges);
      expect(ProfileService.fetchJoinedChallenges).toHaveBeenCalledWith(
        "user-123"
      );
      expect(ProfileService.fetchJoinedChallenges).toHaveBeenCalledTimes(1);
    });

    it("does not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useJoinedChallenges(undefined), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(ProfileService.fetchJoinedChallenges).not.toHaveBeenCalled();
    });

    it("handles fetch error", async () => {
      const mockError = new Error("Failed to fetch challenges");

      (ProfileService.fetchJoinedChallenges as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => useJoinedChallenges("user-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it("caches challenges with correct staleTime", async () => {
      (ProfileService.fetchJoinedChallenges as jest.Mock).mockResolvedValue(
        mockChallenges
      );

      const { result, rerender } = renderHook(
        () => useJoinedChallenges("user-123"),
        {
          wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      jest.clearAllMocks();

      // Rerender - should use cached data
      rerender();

      expect(ProfileService.fetchJoinedChallenges).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockChallenges);
    });
  });

  describe("useInvalidateProfile", () => {
    it("invalidates all profile cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateProfile(), { wrapper });

      await result.current.invalidateAll();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.all,
      });
    });

    it("invalidates user profile cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateProfile(), { wrapper });

      await result.current.invalidateUser("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.user("user-123"),
      });
    });

    it("invalidates weekly activity cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateProfile(), { wrapper });

      await result.current.invalidateWeeklyActivity("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.weeklyActivity("user-123"),
      });
    });

    it("invalidates challenges cache", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateProfile(), { wrapper });

      await result.current.invalidateChallenges("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.challenges("user-123"),
      });
    });

    it("invalidates multiple caches independently", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useInvalidateProfile(), { wrapper });

      await result.current.invalidateWeeklyActivity("user-123");
      await result.current.invalidateChallenges("user-123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.weeklyActivity("user-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.challenges("user-123"),
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("usePrefetchProfile", () => {
    it("prefetches profile data", async () => {
      (ProfileService.fetchProfileData as jest.Mock).mockResolvedValue(
        mockProfileData
      );

      const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

      const { result } = renderHook(() => usePrefetchProfile(), { wrapper });

      await result.current.prefetchProfileData("user-123");

      expect(prefetchSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.user("user-123"),
        queryFn: expect.any(Function),
      });

      // Verify the data is in cache
      const cachedData = queryClient.getQueryData(profileKeys.user("user-123"));
      expect(cachedData).toEqual(mockProfileData);
    });

    it("prefetches weekly activity", async () => {
      (ProfileService.fetchWeeklyActivity as jest.Mock).mockResolvedValue(
        mockWeeklyActivity
      );

      const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

      const { result } = renderHook(() => usePrefetchProfile(), { wrapper });

      await result.current.prefetchWeeklyActivity("user-123");

      expect(prefetchSpy).toHaveBeenCalledWith({
        queryKey: profileKeys.weeklyActivity("user-123"),
        queryFn: expect.any(Function),
      });

      // Verify the data is in cache
      const cachedData = queryClient.getQueryData(
        profileKeys.weeklyActivity("user-123")
      );
      expect(cachedData).toEqual(mockWeeklyActivity);
    });

    it("prefetches multiple data types independently", async () => {
      (ProfileService.fetchProfileData as jest.Mock).mockResolvedValue(
        mockProfileData
      );
      (ProfileService.fetchWeeklyActivity as jest.Mock).mockResolvedValue(
        mockWeeklyActivity
      );

      const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

      const { result } = renderHook(() => usePrefetchProfile(), { wrapper });

      await result.current.prefetchProfileData("user-123");
      await result.current.prefetchWeeklyActivity("user-123");

      expect(prefetchSpy).toHaveBeenCalledTimes(2);

      // Verify both are in cache
      const cachedProfile = queryClient.getQueryData(
        profileKeys.user("user-123")
      );
      const cachedActivity = queryClient.getQueryData(
        profileKeys.weeklyActivity("user-123")
      );

      expect(cachedProfile).toEqual(mockProfileData);
      expect(cachedActivity).toEqual(mockWeeklyActivity);
    });

    it("handles prefetch errors gracefully", async () => {
      const mockError = new Error("Prefetch failed");

      (ProfileService.fetchProfileData as jest.Mock).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() => usePrefetchProfile(), { wrapper });

      // Prefetch should not throw, just fail silently
      await expect(
        result.current.prefetchProfileData("user-123")
      ).resolves.not.toThrow();
    });
  });

  describe("profileKeys", () => {
    it("generates correct query keys", () => {
      expect(profileKeys.all).toEqual(["profile"]);
      expect(profileKeys.user("user-123")).toEqual(["profile", "user-123"]);
      expect(profileKeys.weeklyActivity("user-123")).toEqual([
        "profile",
        "user-123",
        "weekly",
      ]);
      expect(profileKeys.challenges("user-123")).toEqual([
        "profile",
        "user-123",
        "challenges",
      ]);
    });

    it("generates unique keys for different users", () => {
      const user1Keys = profileKeys.user("user-123");
      const user2Keys = profileKeys.user("user-456");

      expect(user1Keys).not.toEqual(user2Keys);
      expect(user1Keys[1]).toBe("user-123");
      expect(user2Keys[1]).toBe("user-456");
    });
  });
});
