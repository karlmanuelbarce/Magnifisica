import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
      {/* Since 'instructions' is now a single string, 
        we render it directly instead of mapping an array.
      */}
      <Text style={styles.instructionText}>{exercise.instructions}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaBox: {
    backgroundColor: "#f4f4f4",
    padding: 12,
    borderRadius: 8,
    width: "48%", // Two columns
    marginBottom: 10,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    textTransform: "capitalize",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24, // Adds spacing for readability
    color: "#333",
  },
});

export default ExerciseDetailScreen;
