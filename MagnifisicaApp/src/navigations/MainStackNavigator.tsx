import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import MainTabNavigator from "./MainTabNavigator";
import AddExercise from "../screens/exercisescreens/AddExerciseScreen";
import ExerciseDetailScreen from "../screens/exercisescreens/ExerciseDetailScreen";
import AdminChallengeScreen from "../screens/AdminChallengeScreen"; // Import the admin screen
import { Exercise } from "../types/Exercise";
import { useAuthStore } from "../store/authstore"; // Import the auth store

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
  const isAdmin = useAuthStore((state) => state.isAdmin);

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
      {/* Conditionally render admin screen only for admins */}
      {isAdmin && (
        <Stack.Screen
          name="AdminChallenge"
          component={AdminChallengeScreen}
          options={{
            title: "Create Challenge",
            headerShown: true, // Show header for admin screen
          }}
        />
      )}
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
