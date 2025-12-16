import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert, PermissionsAndroid, Platform } from "react-native";

// Mock NativeEventEmitter before importing Geolocation
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");

// Mock dependencies BEFORE imports
jest.mock("react-native-geolocation-service", () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn(),
  stopObserving: jest.fn(),
}));

jest.mock("@maplibre/maplibre-react-native", () => ({
  MapView: "MapView",
  Camera: "Camera",
  PointAnnotation: "PointAnnotation",
  ShapeSource: "ShapeSource",
  LineLayer: "LineLayer",
}));

jest.mock("react-native-vector-icons/Ionicons", () => "Icon");

jest.mock("../hooks/useRoute", () => ({
  useSaveRoute: jest.fn(),
}));

jest.mock("../store/authstore", () => ({
  useAuthStore: jest.fn(),
}));

// Import after mocking
import Geolocation from "react-native-geolocation-service";
import RecordScreen from "./RecordScreen";
import { useSaveRoute } from "../hooks/useRoute";
import { useAuthStore } from "../store/authstore";

describe("RecordScreen", () => {
  const mockSaveRoute = jest.fn();
  const mockUser = {
    uid: "user-123",
    email: "test@example.com",
  };

  const mockPosition = {
    coords: {
      latitude: 14.5995,
      longitude: 120.9842,
      altitude: 0,
      accuracy: 10,
      altitudeAccuracy: 10,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  };

  // Helper function to get the record button
  const getRecordButton = (container: any) => {
    const { UNSAFE_getAllByProps } = container;
    const accessibleViews = UNSAFE_getAllByProps({ accessible: true });
    return accessibleViews[0]; // The record button is the first accessible view
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock Alert
    jest.spyOn(Alert, "alert").mockImplementation(() => {});

    // Mock Platform
    Platform.OS = "android";

    // Spy on PermissionsAndroid.request and mock its return value
    jest
      .spyOn(PermissionsAndroid, "request")
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

    // Mock Geolocation
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success) => {
        success(mockPosition);
      }
    );
    (Geolocation.watchPosition as jest.Mock).mockReturnValue(1);
    (Geolocation.clearWatch as jest.Mock).mockImplementation(() => {});
    (Geolocation.requestAuthorization as jest.Mock).mockResolvedValue(
      "granted"
    );

    // Mock useAuthStore
    (useAuthStore as jest.Mock).mockImplementation((selector) =>
      selector({ user: mockUser })
    );

    // Mock useSaveRoute
    (useSaveRoute as jest.Mock).mockReturnValue({
      mutate: mockSaveRoute,
      isPending: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Component Mounting", () => {
    it("renders loading state initially", () => {
      // Don't call getCurrentPosition success callback
      (Geolocation.getCurrentPosition as jest.Mock) = jest.fn();

      const { getByText } = render(<RecordScreen />);

      expect(getByText("Finding location...")).toBeTruthy();
    });

    it("requests location permission on mount", async () => {
      render(<RecordScreen />);

      await waitFor(() => {
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          expect.any(Object)
        );
      });
    });

    it("gets current location after permission granted", async () => {
      render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it("sets up location watcher after permission granted", async () => {
      render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.watchPosition).toHaveBeenCalled();
      });
    });

    it("renders map once location is obtained", async () => {
      const { queryByText } = render(<RecordScreen />);

      await waitFor(() => {
        expect(queryByText("Finding location...")).toBeNull();
      });
    });
  });

  describe("Permission Handling", () => {
    it("handles iOS permission request", async () => {
      Platform.OS = "ios";

      render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.requestAuthorization).toHaveBeenCalledWith(
          "whenInUse"
        );
      });
    });
  });

  describe("Recording Flow", () => {
    it("starts recording when start button is pressed", async () => {
      const container = render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      act(() => {
        fireEvent.press(recordButton);
      });

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      });
    });

    it("displays distance as 0.00 km initially", async () => {
      const { getByText } = render(<RecordScreen />);

      await waitFor(() => {
        expect(getByText("0.00 km")).toBeTruthy();
      });
    });

    it("displays time as 00:00 initially", async () => {
      const { getByText } = render(<RecordScreen />);

      await waitFor(() => {
        expect(getByText("00:00")).toBeTruthy();
      });
    });

    it("increments timer during recording", async () => {
      const container = render(<RecordScreen />);
      const { getByText } = container;

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      act(() => {
        fireEvent.press(recordButton);
      });

      // Advance timer by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(getByText("00:05")).toBeTruthy();
      });
    });

    it("stops recording when stop button is pressed", async () => {
      const container = render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      // Start recording
      act(() => {
        fireEvent.press(recordButton);
      });

      // Stop recording
      act(() => {
        fireEvent.press(recordButton);
      });

      // Should show alert if distance is 0
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Route too short",
          "No distance was recorded. Route will not be saved."
        );
      });
    });
  });

  describe("Save Route Modal", () => {
    it("shows save modal after stopping recording with valid route", async () => {
      // Mock watchPosition to simulate movement BEFORE rendering
      let positionCallback: any;
      (Geolocation.watchPosition as jest.Mock).mockImplementation(
        (callback) => {
          positionCallback = callback;
          return 1;
        }
      );

      const container = render(<RecordScreen />);
      const { getByText } = container;

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      // Start recording
      act(() => {
        fireEvent.press(recordButton);
      });

      // Simulate location updates with movement
      act(() => {
        positionCallback({
          coords: {
            ...mockPosition.coords,
            latitude: 14.6,
            longitude: 120.985,
          },
          timestamp: Date.now() + 1000,
        });
      });

      // Stop recording
      act(() => {
        fireEvent.press(recordButton);
      });

      await waitFor(() => {
        expect(getByText("Save Route?")).toBeTruthy();
      });
    });

    it("saves route when save button is pressed", async () => {
      // Setup mock with movement BEFORE rendering
      let positionCallback: any;
      (Geolocation.watchPosition as jest.Mock).mockImplementation(
        (callback) => {
          positionCallback = callback;
          return 1;
        }
      );

      const container = render(<RecordScreen />);
      const { getByText } = container;

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      // Start recording
      act(() => {
        fireEvent.press(recordButton);
      });

      // Simulate movement
      act(() => {
        positionCallback({
          coords: {
            ...mockPosition.coords,
            latitude: 14.6,
            longitude: 120.985,
          },
          timestamp: Date.now() + 1000,
        });
      });

      // Stop recording
      act(() => {
        fireEvent.press(recordButton);
      });

      await waitFor(() => {
        expect(getByText("Save Route?")).toBeTruthy();
      });

      // Press save button
      const saveButton = getByText("Save");
      act(() => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockSaveRoute).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-123",
            distanceMeters: expect.any(Number),
            durationSeconds: expect.any(Number),
          }),
          expect.any(Object)
        );
      });
    });

    it("discards route when discard button is pressed", async () => {
      // Setup with movement BEFORE rendering
      let positionCallback: any;
      (Geolocation.watchPosition as jest.Mock).mockImplementation(
        (callback) => {
          positionCallback = callback;
          return 1;
        }
      );

      const container = render(<RecordScreen />);
      const { getByText, queryByText } = container;

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      act(() => {
        fireEvent.press(recordButton);
      });

      act(() => {
        positionCallback({
          coords: {
            ...mockPosition.coords,
            latitude: 14.6,
          },
          timestamp: Date.now() + 1000,
        });
      });

      act(() => {
        fireEvent.press(recordButton);
      });

      await waitFor(() => {
        expect(getByText("Save Route?")).toBeTruthy();
      });

      const discardButton = getByText("Discard");
      act(() => {
        fireEvent.press(discardButton);
      });

      await waitFor(() => {
        expect(queryByText("Save Route?")).toBeNull();
      });

      expect(mockSaveRoute).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("clears location watch on unmount", async () => {
      const { unmount } = render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.watchPosition).toHaveBeenCalled();
      });

      unmount();

      expect(Geolocation.clearWatch).toHaveBeenCalledWith(1);
    });

    it("clears timer interval on unmount", async () => {
      const container = render(<RecordScreen />);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      const recordButton = getRecordButton(container);

      // Start recording (starts timer)
      act(() => {
        fireEvent.press(recordButton);
      });

      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      container.unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("shows alert when getCurrentPosition fails", async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
        (success, error) => {
          error({
            code: 1,
            message: "Location error",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        }
      );

      render(<RecordScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Could not get initial location.",
          "Location error"
        );
      });
    });
  });
});
