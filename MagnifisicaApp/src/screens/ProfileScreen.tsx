import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getAuth, signOut } from "@react-native-firebase/auth";

const ProfileScreen: React.FC = () => {
  function handlePress() {
    signOut(getAuth()).then(() => console.log("User signed out!"));
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <TouchableOpacity onPress={handlePress}>
        <Text>signout</Text>
      </TouchableOpacity>
      {/* Add profile details here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
