import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthStackNavigator from "./AuthStackNavigator";
import MainStackNavigator from "./MainStackNavigator";
import { useAuthStore } from "../store/authstore";
import { tokenRefreshService } from "../utils/tokenRefreshService";

// Create QueryClient instance OUTSIDE component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const RootStackNavigator: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Setup auth state listener
  useEffect(() => {
    const unsubscribe = checkAuth();
    return () => unsubscribe();
  }, [checkAuth]);

  // Handle token refresh service
  useEffect(() => {
    if (user) {
      // Start auto-refresh when user logs in
      tokenRefreshService.startAutoRefresh();
    } else {
      // Stop auto-refresh when user logs out
      tokenRefreshService.stopAutoRefresh();
    }

    return () => tokenRefreshService.stopAutoRefresh();
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {user ? <MainStackNavigator /> : <AuthStackNavigator />}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

export default RootStackNavigator;
