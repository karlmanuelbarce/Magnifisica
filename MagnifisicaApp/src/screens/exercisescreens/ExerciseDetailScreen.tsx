import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

import { MainStackParamList } from "../../navigations/MainStackNavigator";

type ExerciseDetailScreenRouteProp = RouteProp<
  MainStackParamList,
  "ExerciseDetail"
>;

// Helper Function - Capitalizes each word and replaces underscores with spaces
const capitalizeWords = (s: string) => {
  if (typeof s !== "string") return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const ExerciseDetailScreen: React.FC = () => {
  const route = useRoute<ExerciseDetailScreenRouteProp>();
  const navigation = useNavigation();

  // Add error handling for missing exercise data
  const { exercise } = route.params || {};

  // Debug log to check what data we're receiving
  console.log("Exercise Detail - Received exercise:", exercise);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#E0E0E0" />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Exercise not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color="#E0E0E0" />
      </TouchableOpacity>

      <ScrollView style={styles.container}>
        {/* Exercise Title */}
        <Text style={styles.title}>{exercise.name || "Unnamed Exercise"}</Text>

        {/* Metadata Section */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Muscle</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.muscle || "N/A")}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Equipment</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.equipment || "N/A")}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Difficulty</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.difficulty || "N/A")}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>
              {capitalizeWords(exercise.type || "N/A")}
            </Text>
          </View>
        </View>

        {/* Instructions Section */}
        <View style={styles.instructionsCard}>
          <Text style={styles.subtitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            {exercise.instructions || "No instructions available."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#E0E0E0",
    marginTop: 60,
    textAlign: "center",
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
    marginTop: 4,
    textAlign: "center",
  },
  instructionsCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 16,
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    color: "#E0E0E0",
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#AAAAAA",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    color: "#FF3B30",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ExerciseDetailScreen;
