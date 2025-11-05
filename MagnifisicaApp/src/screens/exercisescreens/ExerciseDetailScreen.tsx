import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native"; // <-- Import SafeAreaView
import { useRoute, RouteProp } from "@react-navigation/native";
import { MainStackParamList } from "../../navigations/MainStackNavigator"; // Adjust path

// Define the type for this screen's route
type ExerciseDetailScreenRouteProp = RouteProp<
  MainStackParamList,
  "ExerciseDetail"
>;

const ExerciseDetailScreen: React.FC = () => {
  const route = useRoute<ExerciseDetailScreenRouteProp>();

  // Get the exercise data passed from the previous screen
  const { exercise } = route.params;

  return (
    // Use SafeAreaView as the root
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Exercise Title */}
        <Text style={styles.title}>{exercise.name}</Text>

        {/* Metadata Section */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Muscle</Text>
            <Text style={styles.metaValue}>{exercise.muscle}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Equipment</Text>
            <Text style={styles.metaValue}>{exercise.equipment}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Difficulty</Text>
            <Text style={styles.metaValue}>{exercise.difficulty}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{exercise.type}</Text>
          </View>
        </View>

        {/* Instructions Section */}
        <Text style={styles.subtitle}>Instructions:</Text>
        <Text style={styles.instructionText}>{exercise.instructions}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- UPDATED STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#E0E0E0", // Light text
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaBox: {
    backgroundColor: "#1E1E1E", // Dark card background
    padding: 12,
    borderRadius: 8,
    width: "48%", // Two columns
    marginBottom: 10,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888", // Muted light text
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E0E0E0", // Light text
    textTransform: "capitalize",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    color: "#E0E0E0", // Light text
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24, // Adds spacing for readability
    color: "#AAAAAA", // Softer light text
  },
});

export default ExerciseDetailScreen;
