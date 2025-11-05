jest.mock("../src/store/authstore", () => {
  const { create } = jest.requireActual("zustand");

  // Create a mock store with the same shape
  const mockStore = create(() => ({
    user: null,
    isLoading: true,
    checkAuth: jest.fn(() => () => {}), // Returns a mock unsubscribe
    logout: jest.fn(() => Promise.resolve()),
  }));

  // Mock the useAuthStore hook to return the mock store's state
  const useAuthStore = (selector) => {
    const state = mockStore.getState();
    return selector ? selector(state) : state;
  };

  // Add setState/getState to the hook for easy manipulation in tests
  useAuthStore.setState = mockStore.setState;
  useAuthStore.getState = mockStore.getState;
  useAuthStore.mockClear = () =>
    mockStore.setState({
      // Helper to reset
      user: null,
      isLoading: true,
      checkAuth: jest.fn(() => () => {}),
      logout: jest.fn(() => Promise.resolve()),
    });

  return {
    useAuthStore,
  };
});

jest.mock("../src/navigations/AuthStackNavigator", () => {
  const { View, Text } = require("react-native");
  return () => (
    <View>
      <Text>Mocked AuthStackNavigator</Text>
    </View>
  );
});

jest.mock("../src/navigations/MainStackNavigator", () => {
  const { View, Text } = require("react-native");
  return () => (
    <View>
      <Text>Mocked MainStackNavigator</Text>
    </View>
  );
});
