import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import SignupScreen from "./SignupScreen";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "@react-native-firebase/auth";
import { getFirestore, doc, setDoc } from "@react-native-firebase/firestore";
import { useNavigation } from "@react-navigation/native";

// Mock Firebase Auth
jest.mock("@react-native-firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(),
}));

// Mock Firestore
jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock Navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
}));

describe("SignupScreen", () => {
  const mockNavigate = jest.fn();
  const mockCreateUserWithEmailAndPassword =
    createUserWithEmailAndPassword as jest.Mock;
  const mockSetDoc = setDoc as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockUseNavigation = useNavigation as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    });

    // Mock Alert
    jest.spyOn(Alert, "alert").mockImplementation(() => {});

    // Mock doc to return a document reference
    mockDoc.mockReturnValue({ id: "mock-doc-id" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders signup screen correctly", () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    expect(getByText("Create Account")).toBeTruthy();
    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByPlaceholderText("Confirm Password")).toBeTruthy();
    expect(getByText("Sign Up")).toBeTruthy();
    expect(getByText(/Already have an account\?/)).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
  });

  it("updates email input correctly", () => {
    const { getByPlaceholderText } = render(<SignupScreen />);
    const emailInput = getByPlaceholderText("Email");

    fireEvent.changeText(emailInput, "test@example.com");

    expect(emailInput.props.value).toBe("test@example.com");
  });

  it("updates password input correctly", () => {
    const { getByPlaceholderText } = render(<SignupScreen />);
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(passwordInput, "password123");

    expect(passwordInput.props.value).toBe("password123");
  });

  it("updates confirm password input correctly", () => {
    const { getByPlaceholderText } = render(<SignupScreen />);
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");

    fireEvent.changeText(confirmPasswordInput, "password123");

    expect(confirmPasswordInput.props.value).toBe("password123");
  });

  it("password inputs are secure", () => {
    const { getByPlaceholderText } = render(<SignupScreen />);
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");

    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
  });

  it("shows error when fields are empty", async () => {
    const { getByText } = render(<SignupScreen />);
    const signupButton = getByText("Sign Up");

    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all fields."
      );
    });

    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows error when passwords do not match", async () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "differentpassword");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Passwords do not match."
      );
    });

    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("handles successful signup and creates Firestore document", async () => {
    const mockUserCredential = {
      user: { uid: "test-uid-123", email: "test@example.com" },
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
    mockSetDoc.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
    });

    // Verify Firestore document creation
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "test-uid-123");
    expect(mockSetDoc).toHaveBeenCalledWith(
      { id: "mock-doc-id" },
      expect.objectContaining({
        email: "test@example.com",
        role: "user",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      "Account Created",
      "Your account was created successfully!"
    );
  });

  it("shows loading indicator during signup", async () => {
    mockCreateUserWithEmailAndPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { getByPlaceholderText, getByText, getByTestId, queryByText } =
      render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(getByTestId("signup-loading")).toBeTruthy();
    });

    // "Sign Up" text should not be visible
    expect(queryByText("Sign Up")).toBeNull();
  });

  it("disables inputs during signup", async () => {
    let resolveSignup: () => void;
    const signupPromise = new Promise<any>((resolve) => {
      resolveSignup = () =>
        resolve({ user: { uid: "test-uid", email: "test@example.com" } });
    });

    mockCreateUserWithEmailAndPassword.mockReturnValue(signupPromise);
    mockSetDoc.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <SignupScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    // Wait for loading to start
    await waitFor(() => {
      expect(getByTestId("signup-loading")).toBeTruthy();
    });

    // Check that inputs are disabled
    const updatedEmailInput = getByPlaceholderText("Email");
    const updatedPasswordInput = getByPlaceholderText("Password");
    const updatedConfirmPasswordInput =
      getByPlaceholderText("Confirm Password");

    expect(updatedEmailInput.props.editable).toBe(false);
    expect(updatedPasswordInput.props.editable).toBe(false);
    expect(updatedConfirmPasswordInput.props.editable).toBe(false);

    // Resolve the promise to clean up
    resolveSignup!();
    await waitFor(() => {
      expect(updatedEmailInput.props.editable).toBe(true);
    });
  });

  it("handles email already in use error", async () => {
    const mockError = {
      code: "auth/email-already-in-use",
      message: "Email already in use",
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "existing@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "That email address is already in use!"
      );
    });
  });

  it("handles invalid email error", async () => {
    const mockError = {
      code: "auth/invalid-email",
      message: "Invalid email",
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "invalid-email");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "That email address is invalid!"
      );
    });
  });

  it("handles weak password error", async () => {
    const mockError = {
      code: "auth/weak-password",
      message: "Weak password",
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "weak");
    fireEvent.changeText(confirmPasswordInput, "weak");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "Password should be at least 6 characters."
      );
    });
  });

  it("handles unknown error", async () => {
    const mockError = {
      code: "auth/unknown-error",
      message: "Unknown error",
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "An unknown error occurred."
      );
    });
  });

  it("stops loading after successful signup", async () => {
    const mockUserCredential = {
      user: { uid: "test-uid", email: "test@example.com" },
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
    mockSetDoc.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <SignupScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId("signup-loading")).toBeNull();
    });

    // Inputs should be enabled again
    expect(emailInput.props.editable).toBe(true);
    expect(passwordInput.props.editable).toBe(true);
    expect(confirmPasswordInput.props.editable).toBe(true);
  });

  it("stops loading after failed signup", async () => {
    const mockError = {
      code: "auth/invalid-email",
      message: "Invalid email",
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <SignupScreen />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "invalid-email");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId("signup-loading")).toBeNull();
    });

    // Inputs should be enabled again
    expect(emailInput.props.editable).toBe(true);
    expect(passwordInput.props.editable).toBe(true);
    expect(confirmPasswordInput.props.editable).toBe(true);
  });

  it("navigates to login screen when login link is pressed", () => {
    const { getByText } = render(<SignupScreen />);

    const loginLink = getByText("Login");

    fireEvent.press(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith("Login");
  });

  it("disables login link during signup", async () => {
    let resolveSignup: () => void;
    const signupPromise = new Promise<any>((resolve) => {
      resolveSignup = () =>
        resolve({ user: { uid: "test-uid", email: "test@example.com" } });
    });

    mockCreateUserWithEmailAndPassword.mockReturnValue(signupPromise);
    mockSetDoc.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    });

    // Try to press login link while loading
    const loginLink = getByText("Login");
    fireEvent.press(loginLink);

    // Should not navigate while loading
    expect(mockNavigate).not.toHaveBeenCalled();

    // Resolve the promise to clean up
    resolveSignup!();
  });

  it("has correct input properties", () => {
    const { getByPlaceholderText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");

    // Email input properties
    expect(emailInput.props.autoCapitalize).toBe("none");
    expect(emailInput.props.keyboardType).toBe("email-address");

    // Password input properties
    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
  });

  it("handles Firestore error during document creation", async () => {
    const mockUserCredential = {
      user: { uid: "test-uid-123", email: "test@example.com" },
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
    mockSetDoc.mockRejectedValue(new Error("Firestore error"));

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");
    const signupButton = getByText("Sign Up");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.changeText(confirmPasswordInput, "password123");
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "An unknown error occurred."
      );
    });
  });
});
