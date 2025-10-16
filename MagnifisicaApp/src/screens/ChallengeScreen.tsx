import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ChallengeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Challenge Screen</Text>
      {/* Add your challenge UI components here */}
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

export default ChallengeScreen;
