import React, { useState } from "react"; // <-- Import useState
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../navigations/MainStackNavigator";
// --- Import the progress ring component ---
import { AnimatedCircularProgress } from "react-native-circular-progress";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  // --- Example state for progress ---
  // Let's say the goal is 4 workouts and they've done 3
  const [currentAmount, setCurrentAmount] = useState(3);
  const [goalAmount, setGoalAmount] = useState(4);

  // Calculate the fill percentage (0 to 100)
  const fillPercent = (currentAmount / goalAmount) * 100;
  // ---

  function handleAddExercise() {
    navigation.navigate("AddExercise");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MagnifisicaApp!</Text>

      {/* --- Progress Ring --- */}
      <View style={styles.progressContainer}>
        <AnimatedCircularProgress
          size={220} // Diameter of the ring
          width={18} // Thickness of the ring
          fill={fillPercent} // The percentage value (0-100)
          tintColor="#007AFF" // Color of the progress
          backgroundColor="#e0e0e0" // Color of the unfilled part
          rotation={0} // Start from the top
          lineCap="round"
        >
          {/* Children is a function that receives the current fill value */}
          {(fill: number) => (
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressTextValue}>{currentAmount}</Text>
              <Text style={styles.progressTextLabel}>/ {goalAmount}</Text>
            </View>
          )}
        </AnimatedCircularProgress>

        <Text style={styles.progressGoalText}>Workouts This Week</Text>
      </View>
      {/* --- End of Progress Ring --- */}

      <TouchableOpacity style={styles.button} onPress={handleAddExercise}>
        <Text style={styles.buttonText}>Add Exercise</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center", // Center items horizontally
    backgroundColor: "#fff",
    paddingTop: 60, // Push content down from status bar
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40, // Space below title
    textAlign: "center",
  },

  // --- New styles for the progress ring ---
  progressContainer: {
    alignItems: "center",
    marginVertical: 40, // Space above and below the ring
  },
  progressTextContainer: {
    flexDirection: "row",
    alignItems: "flex-end", // Aligns the text at the bottom
    justifyContent: "center",
  },
  progressTextValue: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#333",
  },
  progressTextLabel: {
    fontSize: 24,
    fontWeight: "600",
    color: "#555",
    paddingBottom: 8, // Lifts the label slightly to align
    marginLeft: 4,
  },
  progressGoalText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20, // Space below the ring
  },
  // ---

  button: {
    backgroundColor: "#007AFF", // Blue background
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 40, // Space above the button
  },
  buttonText: {
    color: "#fff", // White text
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;
