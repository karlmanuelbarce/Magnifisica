import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator, // <-- Added for loading state
} from "react-native";
import { AuthStackParamList } from "../../navigations/AuthStackNavigator";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import auth from "@react-native-firebase/auth"; // <-- Changed import for clarity

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true); // Start loading
    auth() // Call auth directly
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        console.log("User signed in!");
        // The useAuthStore will detect the user change and navigate
      })
      .catch((error) => {
        let errorMessage = "An unknown error occurred.";

        if (error.code === "auth/invalid-email") {
          errorMessage = "That email address is invalid!";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/user-not-found") {
          errorMessage = "No user found with that email.";
        } else if (error.code === "auth/invalid-credential") {
          errorMessage = "Invalid login credentials."; // More generic for both email/password
        }

        console.error("Login error:", error.code, error.message);
        Alert.alert("Login Failed", errorMessage);
      })
      .finally(() => {
        setLoading(false); // Stop loading regardless of success or failure
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888" // So it's visible on dark background
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!loading} // Disable input when loading
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888" // So it's visible on dark background
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading} // Disable input when loading
      />

      {/* Custom Button for better styling control */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#121212" /> // Dark indicator on lime button
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>
          Don't have an account?{" "}
          <Text style={styles.registerText}>Register</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#121212", // Dark background
  },
  title: {
    fontSize: 36, // Slightly larger title
    fontWeight: "bold",
    marginBottom: 40, // More space
    textAlign: "center",
    color: "#E0E0E0", // Light gray for title
  },
  input: {
    height: 50, // Slightly taller input
    backgroundColor: "#222222", // Darker input background
    color: "#E0E0E0", // Light text for input
    borderRadius: 10, // More rounded corners
    marginBottom: 20, // More space between inputs
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
  registerText: {
    color: "#39FF14", // Highlight the "Register" part in lime green
    fontWeight: "bold",
  },
});

export default LoginScreen;
