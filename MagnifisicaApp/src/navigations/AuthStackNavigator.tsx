import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/authscreens/LoginScreen";
import SignupScreen from "../screens/authscreens/SignupScreen";

// Import your Auth screens here

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthStackNavigator = () => (
  <AuthStack.Navigator
    initialRouteName="Login"
    screenOptions={{ headerShown: false }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={SignupScreen} />
  </AuthStack.Navigator>
);

export default AuthStackNavigator;
