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
  signInWithEmailAndPassword,
} from "@react-native-firebase/auth";

// --- 3. Get the auth instance once ---
const auth = getAuth();

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true); // Start loading

    // --- 4. Use the new modular syntax ---
    // Pass the 'auth' instance as the first argument
    signInWithEmailAndPassword(auth, email, password)
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
          errorMessage = "Invalid login credentials.";
        }

        Alert.alert("Login Failed", errorMessage);
      })
      .finally(() => {
        setLoading(false); // Stop loading regardless of success or failure
      });
  };

  return (
    // --- 5. Use SafeAreaView as the root ---
    <SafeAreaView style={styles.safeArea}>
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
    </SafeAreaView>
  );
};

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
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    color: "#E0E0E0",
  },
  input: {
    height: 50,
    backgroundColor: "#222222",
    color: "#E0E0E0",
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#333333",
  },
  button: {
    backgroundColor: "#39FF14",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: "#1E7D0A",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#121212",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    color: "#B0B0B0",
    marginTop: 24,
    textAlign: "center",
    fontSize: 16,
  },
  registerText: {
    color: "#39FF14",
    fontWeight: "bold",
  },
});

export default LoginScreen;
