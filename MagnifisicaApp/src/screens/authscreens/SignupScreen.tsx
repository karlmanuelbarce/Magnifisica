import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
// --- 1. Import SafeAreaView from the correct package ---
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthStackParamList } from "../../navigations/AuthStackNavigator";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// --- 2. Import the new modular auth functions ---
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "@react-native-firebase/auth";

// --- 3. Get the auth instance once ---
const auth = getAuth();

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // --- 4. Use the new modular syntax ---
      // Pass the 'auth' instance as the first argument
      await createUserWithEmailAndPassword(auth, email, password);
      // The auth listener in your RootStack will handle navigation
      Alert.alert("Account Created", "Your account was created successfully!");
    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "That email address is already in use!";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "That email address is invalid!";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      }
      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // --- 5. Use SafeAreaView as the root ---
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888" // So it's visible on dark background
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888" // So it's visible on dark background
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#888" // So it's visible on dark background
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!isLoading}
        />

        {/* Custom Button for better styling control */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#121212" /> // Dark indicator on lime button
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          disabled={isLoading}
        >
          <Text style={styles.link}>
            Already have an account? <Text style={styles.loginText}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- These styles are identical to LoginScreen for consistency ---
const styles = StyleSheet.create({
  // --- 6. Add safeArea style ---
  safeArea: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    // backgroundColor is inherited from safeArea
  },
  title: {
    fontSize: 36, // Consistent title size
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    color: "#E0E0E0", // Light gray for title
  },
  input: {
    height: 50,
    backgroundColor: "#222222", // Darker input background
    color: "#E0E0E0", // Light text for input
    borderRadius: 10,
    marginBottom: 20, // More space
    paddingHorizontal: 16,
    fontSize: 18,
    borderWidth: 1, // Subtle border
    borderColor: "#333333", // Dark border
  },
  button: {
    backgroundColor: "#39FF14", // Electric Lime Green for primary action
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#39FF14", // Green shadow for pop
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6, // Android shadow
  },
  buttonDisabled: {
    backgroundColor: "#1E7D0A", // Slightly darker green when disabled
    shadowOpacity: 0, // No shadow when disabled
    elevation: 0,
  },
  buttonText: {
    color: "#121212", // Dark text on lime button
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    color: "#B0B0B0", // Muted link color
    marginTop: 24,
    textAlign: "center",
    fontSize: 16,
  },
  loginText: {
    // Renamed from registerText
    color: "#39FF14", // Highlight the "Login" part in lime green
    fontWeight: "bold",
  },
});

export default SignupScreen;
