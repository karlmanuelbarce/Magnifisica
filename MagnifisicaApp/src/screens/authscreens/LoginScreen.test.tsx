import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import LoginScreen from "./LoginScreen";
import {
  signInWithEmailAndPassword,
  getAuth,
} from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { logger } from "../../utils/logger";

// Mock Firebase Auth
jest.mock("@react-native-firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
}));

// Mock Navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock Logger
jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  },
}));

describe("LoginScreen", () => {
  const mockNavigate = jest.fn();
  const mockSignInWithEmailAndPassword =
    signInWithEmailAndPassword as jest.Mock;
  const mockUseNavigation = useNavigation as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    });

    // Mock Alert
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders login screen correctly", () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText("Welcome Back")).toBeTruthy();
    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
    expect(getByText(/Don't have an account\?/)).toBeTruthy();
    expect(getByText("Register")).toBeTruthy();
  });

  it("updates email input correctly", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText("Email");

    fireEvent.changeText(emailInput, "test@example.com");

    expect(emailInput.props.value).toBe("test@example.com");
  });

  it("updates password input correctly", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(passwordInput, "password123");

    expect(passwordInput.props.value).toBe("password123");
  });

  it("password input is secure", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText("Password");

    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it("handles successful login", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "test@example.com" },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
    });

    expect(Alert.alert).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(logger.info).toHaveBeenCalledWith(
        "User attempting login",
        { email: "test@example.com" },
        "LoginScreen"
      );
      expect(logger.success).toHaveBeenCalledWith(
        "User signed in successfully",
        { email: "test@example.com" },
        "LoginScreen"
      );
    });
  });

  it("shows loading indicator during login", async () => {
    mockSignInWithEmailAndPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { getByPlaceholderText, getByText, getByTestId, queryByText } =
      render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(getByTestId("login-loading")).toBeTruthy();
    });

    // "Login" text should not be visible
    expect(queryByText("Login")).toBeNull();
  });

  it("disables inputs and button during loading", async () => {
    let resolveLogin: () => void;
    const loginPromise = new Promise<any>((resolve) => {
      resolveLogin = () => resolve({ user: { uid: "test-uid" } });
    });

    mockSignInWithEmailAndPassword.mockReturnValue(loginPromise);

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    // Wait for loading to start
    await waitFor(() => {
      expect(getByTestId("login-loading")).toBeTruthy();
    });

    // Check that inputs are disabled
    const updatedEmailInput = getByPlaceholderText("Email");
    const updatedPasswordInput = getByPlaceholderText("Password");

    expect(updatedEmailInput.props.editable).toBe(false);
    expect(updatedPasswordInput.props.editable).toBe(false);

    // Resolve the promise to clean up
    resolveLogin!();
    await waitFor(() => {
      expect(updatedEmailInput.props.editable).toBe(true);
    });
  });

  it("handles invalid email error", async () => {
    const mockError = {
      code: "auth/invalid-email",
      message: "Invalid email",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "invalid-email");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "That email address is invalid!"
      );
    });

    expect(logger.error).toHaveBeenCalledWith(
      "Login failed",
      {
        error: mockError,
        errorCode: "auth/invalid-email",
        errorMessage: "That email address is invalid!",
        email: "invalid-email",
      },
      "LoginScreen"
    );
  });

  it("handles wrong password error", async () => {
    const mockError = {
      code: "auth/wrong-password",
      message: "Wrong password",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "wrongpassword");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "Incorrect password."
      );
    });
  });

  it("handles user not found error", async () => {
    const mockError = {
      code: "auth/user-not-found",
      message: "User not found",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "notfound@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "No user found with that email."
      );
    });
  });

  it("handles invalid credential error", async () => {
    const mockError = {
      code: "auth/invalid-credential",
      message: "Invalid credential",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "wrongpassword");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "Invalid login credentials."
      );
    });
  });

  it("handles unknown error", async () => {
    const mockError = {
      code: "auth/unknown-error",
      message: "Unknown error",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Login Failed",
        "An unknown error occurred."
      );
    });
  });

  it("stops loading after successful login", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "test-uid", email: "test@example.com" },
    });

    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId("login-loading")).toBeNull();
    });

    // Inputs should be enabled again
    expect(emailInput.props.editable).toBe(true);
    expect(passwordInput.props.editable).toBe(true);
  });

  it("stops loading after failed login", async () => {
    const mockError = {
      code: "auth/invalid-credential",
      message: "Invalid credential",
    };

    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const loginButton = getByText("Login");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "wrongpassword");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId("login-loading")).toBeNull();
    });

    // Inputs should be enabled again
    expect(emailInput.props.editable).toBe(true);
    expect(passwordInput.props.editable).toBe(true);
  });

  it("navigates to register screen when register link is pressed", () => {
    const { getByText } = render(<LoginScreen />);

    const registerLink = getByText("Register");

    fireEvent.press(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith("Register");
  });

  it("has correct input properties", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");

    // Email input properties
    expect(emailInput.props.autoCapitalize).toBe("none");
    expect(emailInput.props.keyboardType).toBe("email-address");

    // Password input properties
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });
});
