import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity, // <-- 1. Import TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native"; // <-- 2. Import useNavigation
import { MainStackParamList } from "../../navigations/MainStackNavigator";
import Ionicons from "react-native-vector-icons/Ionicons"; // <-- 3. Import Icons

type ExerciseDetailScreenRouteProp = RouteProp<
  MainStackParamList,
  "ExerciseDetail"
>;

// --- 4. NEW Helper Function ---
// Capitalizes each word and replaces underscores with spaces
const capitalizeWords = (s: string) => {
  if (typeof s !== "string") return "";
  return s
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

const ExerciseDetailScreen: React.FC = () => {
  const route = useRoute<ExerciseDetailScreenRouteProp>();
  const navigation = useNavigation(); // <-- 5. Get navigation
  const { exercise } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* --- 6. ADDED BACK BUTTON --- */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color="#E0E0E0" />
      </TouchableOpacity>

      <ScrollView style={styles.container}>
        {/* Exercise Title */}
        <Text style={styles.title}>{exercise.name}</Text>

        {/* Metadata Section */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Muscle</Text>
            {/* --- 7. Use helper function --- */}
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.muscle)}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Equipment</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.equipment)}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Difficulty</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.difficulty)}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.type)}
            </Text>
          </View>
        </View>

        {/* --- 8. UPDATED INSTRUCTIONS SECTION --- */}
        <View style={styles.instructionsCard}>
          <Text style={styles.subtitle}>Instructions</Text>
          <Text style={styles.instructionText}>{exercise.instructions}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- UPDATED STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24, // Keep horizontal padding
    // Removed top padding, handled by title margin
  },
  backButton: {
    position: "absolute",
    top: 50, // Adjust as needed for your device (or use react-native-safe-area-context)
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#E0E0E0",
    marginTop: 60, // Add top margin to account for back button
    textAlign: "center", // Center title
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaBox: {
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    marginBottom: 10,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E0E0E0",
    // textTransform: "capitalize", // Removed, now handled by helper
    marginTop: 4,
    textAlign: "center", // Center the value
  },
  // --- NEW CARD STYLE FOR INSTRUCTIONS ---
  instructionsCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 16,
    marginBottom: 40, // Add bottom padding
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12, // More space
    color: "#E0E0E0",
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#AAAAAA",
  },
});

export default ExerciseDetailScreen;
