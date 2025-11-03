import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import RecordScreen from "../screens/RecordScreen";

// 1. Import the specific icon packs you installed
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import EvilIcons from "react-native-vector-icons/EvilIcons";
// You might need another one, e.g., FontAwesome for 'trophy'
import FontAwesome from "react-native-vector-icons/FontAwesome";

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            // FontAwesome6 has 'house' or 'house-chimney'
            <FontAwesome6
              name={focused ? "house" : "house"}
              size={size * 0.9} // FontAwesome6 icons can be a bit large
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
            // EvilIcons has a 'record' icon
            <EvilIcons
              name={"record"}
              size={size * 1.2} // EvilIcons can be a bit small
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
            // EvilIcons doesn't have a trophy, so we can use FontAwesome
            <FontAwesome
              name={focused ? "trophy" : "trophy"}
              size={size}
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
            // FontAwesome6 has 'user'
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
