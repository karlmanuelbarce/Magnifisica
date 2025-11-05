import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import AuthStackNavigator from "./AuthStackNavigator";
import MainStackNavigator from "./MainStackNavigator";

import { useAuthStore } from "../store/authstore"; // Adjust path if needed

const RootStackNavigator: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // --- THIS IS THE FIX ---
    // 1. Call checkAuth() and store the returned unsubscribe function
    const unsubscribe = checkAuth();

    // 2. Return the unsubscribe function from useEffect's cleanup
    //    This is called when the component unmounts.
    return () => unsubscribe();
    // --- END OF FIX ---
  }, [checkAuth]); // The dependency on checkAuth is correct

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default RootStackNavigator;
