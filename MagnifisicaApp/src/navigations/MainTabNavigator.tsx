import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import RecordScreen from "../screens/RecordScreen";

import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import EvilIcons from "react-native-vector-icons/EvilIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

// Import Ionicons for a better 'Record' icon
import Ionicons from "react-native-vector-icons/Ionicons";

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        // --- DESIGN CHANGES ---
        headerShown: false, // Hides the default header from the tab navigator
        tabBarActiveTintColor: "#39FF14", // Electric Lime Green
        tabBarInactiveTintColor: "#888888", // Muted Gray
        tabBarStyle: {
          backgroundColor: "#1E1E1E", // Dark card background
          borderTopColor: "#333333", // Dark border
          paddingTop: 4, // Optional: add some padding
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 10,
        },
        // --- END DESIGN CHANGES ---
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome6
              name={"house"} // 'house' is a solid icon
              size={size * 0.9}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            // Switched to Ionicons for a better 'play' circle
            <Ionicons
              name={focused ? "play-circle" : "play-circle-outline"}
              size={size * 1.1} // Slightly larger
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Challenge"
        component={ChallengeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome
              name={"trophy"}
              size={size * 1.1} // Slightly larger
              color={color}
            />
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
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
