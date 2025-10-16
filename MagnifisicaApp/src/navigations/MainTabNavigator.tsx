import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import RecordScreen from "../screens/RecordScreen";

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Record" component={RecordScreen} />
      <Tab.Screen name="Challenge" component={ChallengeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* Add more Tab.Screen components for each screen */}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
