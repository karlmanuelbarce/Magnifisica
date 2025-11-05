import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import MainTabNavigator from "./MainTabNavigator";
import AddExercise from "../screens/exercisescreens/AddExerciseScreen";
import ExerciseDetailScreen from "../screens/exercisescreens/ExerciseDetailScreen";
import { Exercise } from "../types/Exercise";

const Stack = createStackNavigator();
export type MainStackParamList = {
  MainTabs: undefined;
  AddExercise: undefined;
  ExerciseDetail: { exercise: Exercise };
};
const MainStackNavigator = () => (
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

export default MainStackNavigator;
