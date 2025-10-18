import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import MainTabNavigator from "./MainTabNavigator";
const Stack = createStackNavigator();
export type MainStackParamList = {
  MainTabs: undefined;
  // Add other screens in the main stack if needed
};
const MainStackNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MainTabs"
      component={MainTabNavigator}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default MainStackNavigator;
