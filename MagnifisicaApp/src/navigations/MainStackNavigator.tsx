import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import AddExercise from "../screens/exercisescreens/AddExerciseScreen";
import ExerciseDetailScreen from "../screens/exercisescreens/ExerciseDetailScreen";
import { Exercise } from "../types/Exercise";

import MainTabNavigator from "./MainTabNavigator";

// Define the param list BEFORE creating the stack
export type MainStackParamList = {
  MainTabs: undefined;
  AddExercise: undefined;
  ExerciseDetail: { exercise: Exercise };
  AdminChallenge: undefined; // Add to type definition
};

// Create typed stack navigator
const Stack = createStackNavigator<MainStackParamList>();

const MainStackNavigator = () => {
  // Get isAdmin from the auth store

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddExercise"
        component={AddExercise}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
