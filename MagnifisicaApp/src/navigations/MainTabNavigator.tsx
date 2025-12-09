import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import AdminChallengeScreen from "../screens/AdminChallengeScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RecordScreen from "../screens/RecordScreen";
import { useAuthStore } from "../store/authstore";

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const isAdmin = useAuthStore((state) => state.isAdmin);

  // Debug logging
  console.log("🔧 MainTabNavigator - isAdmin:", isAdmin);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#39FF14", // Electric Lime Green
        tabBarInactiveTintColor: "#888888", // Muted Gray
        tabBarStyle: {
          backgroundColor: "#1E1E1E", // Dark card background
          borderTopColor: "#333333", // Dark border
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 10,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name={"house"} size={size * 0.9} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "play-circle" : "play-circle-outline"}
              size={size * 1.1}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Challenge"
        component={ChallengeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name={"trophy"} size={size * 1.1} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome6
              name={focused ? "user-large" : "user"}
              size={size * 0.9}
              color={color}
            />
          ),
        }}
      />

      {/* Admin tab - only visible to admins */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminChallengeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons
                name="admin-panel-settings"
                size={size * 1.2}
                color={color}
              />
            ),
            tabBarLabel: "Admin",
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
