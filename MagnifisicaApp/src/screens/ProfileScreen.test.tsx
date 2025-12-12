import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ProfileScreen from "./ProfileScreen";
import { useProfileData } from "../hooks/userProfile";
import { useAuthStore } from "../store/authstore";

// Mock Navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock Profile Hook
jest.mock("../hooks/userProfile", () => ({
  useProfileData: jest.fn(),
}));

// Mock Auth Store
jest.mock("../store/authstore", () => ({
  useAuthStore: jest.fn(),
}));

// Mock Ionicons
jest.mock("react-native-vector-icons/Ionicons", () => "Icon");

// Mock LineChart
jest.mock("react-native-chart-kit", () => ({
  LineChart: ({ data }: any) => {
    const { View, Text } = require("react-native");
    return (
      <View testID="line-chart">
        <Text>Chart Data: {JSON.stringify(data)}</Text>
      </View>
    );
  },
}));

describe("ProfileScreen", () => {
  const mockLogout = jest.fn();
  const mockRefetch = jest.fn();
  const mockUseProfileData = useProfileData as jest.Mock;
  const mockUseAuthStore = useAuthStore as jest.Mock;

  const mockUser = {
    uid: "user-123",
    email: "test@example.com",
  };

  const mockTimestamp = {
    toDate: () => new Date("2025-01-15"),
  };

  const mockProfileData = {
    weeklyActivity: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [5.2, 3.5, 7.8, 0, 4.2, 6.1, 8.3],
    },
    challenges: [
      {
        id: "challenge-1",
        challengeTitle: "100km January Challenge",
        challengeEndDate: mockTimestamp,
        calculatedProgress: 45500,
        targetMetre: 100000,
        isCompleted: false,
      },
      {
        id: "challenge-2",
        challengeTitle: "Sprint Challenge",
        challengeEndDate: mockTimestamp,
        calculatedProgress: 5000,
        targetMetre: 5000,
        isCompleted: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        user: mockUser,
        logout: mockLogout,
      };
      return selector(state);
    });

    mockUseProfileData.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders profile screen correctly", () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("Weekly Activity")).toBeTruthy();
    expect(getByText("My Challenges")).toBeTruthy();
    expect(getByText("Account")).toBeTruthy();
  });

  it("displays user email", () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText("test@example.com")).toBeTruthy();
  });

  it("displays weekly activity chart with data", () => {
    const { getByTestId } = render(<ProfileScreen />);

    expect(getByTestId("line-chart")).toBeTruthy();
  });

  it("shows loading indicator when profile data is loading", () => {
    mockUseProfileData.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getAllByTestId } = render(<ProfileScreen />);

    // Should have loading indicators for both chart and challenges
    const activityIndicators = getAllByTestId("activity-indicator");
    expect(activityIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it("shows no data message when chart has no data", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          data: [0, 0, 0, 0, 0, 0, 0],
        },
        challenges: [],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Record a run to see your stats!")).toBeTruthy();
  });

  it("displays challenges correctly", () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText("100km January Challenge")).toBeTruthy();
    expect(getByText("Sprint Challenge")).toBeTruthy();
    expect(getByText("45.5 / 100.0 km")).toBeTruthy();
    expect(getByText("Completed")).toBeTruthy();
  });

  it("shows no challenges message when user has no challenges", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          data: [5.2, 3.5, 7.8, 0, 4.2, 6.1, 8.3],
        },
        challenges: [],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("You haven't joined any challenges yet.")).toBeTruthy();
  });

  it("displays challenge end date correctly", () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Ends: Jan 15")).toBeTruthy();
  });

  it("shows completed status for completed challenges", () => {
    const { getAllByText } = render(<ProfileScreen />);

    const completedTexts = getAllByText("Completed");
    expect(completedTexts.length).toBe(1);
  });

  it("shows progress for active challenges", () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText("45.5 / 100.0 km")).toBeTruthy();
  });

  it("calls logout when sign out button is pressed", () => {
    const { getByText } = render(<ProfileScreen />);

    const signOutButton = getByText("Sign Out");

    fireEvent.press(signOutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows error message when data fails to load", () => {
    mockUseProfileData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Failed to load data")).toBeTruthy();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("calls refetch when retry button is pressed", () => {
    mockUseProfileData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    const retryButton = getByText("Retry");

    fireEvent.press(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("calls refetch when pull to refresh is triggered", () => {
    const { getByTestId } = render(<ProfileScreen />);

    const scrollView = getByTestId("scroll-view");

    // Simulate pull to refresh
    fireEvent(scrollView, "refresh");

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("handles undefined profile data gracefully", () => {
    mockUseProfileData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("Record a run to see your stats!")).toBeTruthy();
    expect(getByText("You haven't joined any challenges yet.")).toBeTruthy();
  });

  it("handles null user gracefully", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        user: null,
        logout: mockLogout,
      };
      return selector(state);
    });

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText("Profile")).toBeTruthy();
    expect(queryByText("test@example.com")).toBeNull();
  });

  it("passes correct userId to useProfileData hook", () => {
    render(<ProfileScreen />);

    expect(mockUseProfileData).toHaveBeenCalledWith("user-123");
  });

  it("displays in progress status for challenges without target", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon"],
          data: [5.2],
        },
        challenges: [
          {
            id: "challenge-3",
            challengeTitle: "Open Challenge",
            challengeEndDate: mockTimestamp,
            calculatedProgress: 1000,
            targetMetre: null,
            isCompleted: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Open Challenge")).toBeTruthy();
    expect(getByText("In Progress")).toBeTruthy();
  });

  it("shows completed status when progress meets target", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon"],
          data: [5.2],
        },
        challenges: [
          {
            id: "challenge-4",
            challengeTitle: "Just Completed",
            challengeEndDate: mockTimestamp,
            calculatedProgress: 50000,
            targetMetre: 50000,
            isCompleted: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Just Completed")).toBeTruthy();
    expect(getByText("Completed")).toBeTruthy();
  });

  it("formats challenge end date correctly", () => {
    const customMockTimestamp = {
      toDate: () => new Date("2025-12-25"),
    };

    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon"],
          data: [5.2],
        },
        challenges: [
          {
            id: "challenge-5",
            challengeTitle: "Christmas Challenge",
            challengeEndDate: customMockTimestamp,
            calculatedProgress: 1000,
            targetMetre: 10000,
            isCompleted: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Ends: Dec 25")).toBeTruthy();
  });

  it("handles missing timestamp gracefully", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon"],
          data: [5.2],
        },
        challenges: [
          {
            id: "challenge-6",
            challengeTitle: "No Date Challenge",
            challengeEndDate: null,
            calculatedProgress: 1000,
            targetMetre: 10000,
            isCompleted: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Ends: N/A")).toBeTruthy();
  });

  it("does not show border on last challenge row", () => {
    const { getByText } = render(<ProfileScreen />);

    const lastChallenge = getByText("Sprint Challenge").parent?.parent;
    expect(lastChallenge?.props.style).toContainEqual(
      expect.objectContaining({
        borderBottomWidth: 0,
      })
    );
  });

  it("renders chart with default empty data when no weekly activity", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: [],
          data: [],
        },
        challenges: [],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Record a run to see your stats!")).toBeTruthy();
  });

  it("converts challenge progress from meters to kilometers correctly", () => {
    mockUseProfileData.mockReturnValue({
      data: {
        weeklyActivity: {
          labels: ["Mon"],
          data: [5.2],
        },
        challenges: [
          {
            id: "challenge-7",
            challengeTitle: "Conversion Test",
            challengeEndDate: mockTimestamp,
            calculatedProgress: 12345,
            targetMetre: 50000,
            isCompleted: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("12.3 / 50.0 km")).toBeTruthy();
  });
});
