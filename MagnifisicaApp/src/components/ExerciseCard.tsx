import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Exercise } from "../types/Exercise";

interface ExerciseCardProps {
  activity: Exercise;
  onPress?: () => void;
  onAddPress: () => void;
  disabled?: boolean;
}

const capitalize = (s: string) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  activity,
  onPress,
  onAddPress,
  disabled,
}) => {
  // --- 2. Dynamic styles for the button ---
  const plusButtonContainerStyle = [
    styles.plusButton,
    disabled && styles.plusButtonDisabled,
  ];

  // Icon color changes based on disabled state
  const plusIconColor = disabled ? "#888888" : "#121212";
  // ---

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.8}>
      <View style={styles.mainContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{activity.name}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{capitalize(activity.muscle)}</Text>
            </View>
          </View>
          <View style={styles.detailsContainer}>
            {/* --- 3. Replaced Emojis with Icons --- */}
            <View style={styles.detailItem}>
              <Ionicons
                name="barbell-outline"
                size={16}
                color={styles.detailText.color}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {capitalize(activity.difficulty)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons
                name="layers-outline"
                size={16}
                color={styles.detailText.color}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {capitalize(activity.equipment.replace(/_/g, " "))}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons
                name="analytics-outline"
                size={16}
                color={styles.detailText.color}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{capitalize(activity.type)}</Text>
            </View>
          </View>
        </View>

        {/* --- 4. Replaced Text '+' with Icon --- */}
        <TouchableOpacity
          onPress={onAddPress}
          style={styles.buttonContainer}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={plusButtonContainerStyle}>
            <Ionicons name="add" size={22} color={plusIconColor} />
          </View>
        </TouchableOpacity>
        {/* --- END OF MODIFICATION --- */}
      </View>
    </TouchableOpacity>
  );
};

// --- 5. UPDATED STYLES ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E", // Dark card
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    // Removed marginHorizontal, should be handled by FlatList
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  mainContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
    color: "#E0E0E0", // Light text
  },
  tag: {
    backgroundColor: "#1E7D0A", // Dark green
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    color: "#E0E0E0", // Light text
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#333333", // Dark border
    paddingTop: 12,
    gap: 24,
    flexWrap: "wrap",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#AAAAAA", // Muted light text
  },
  buttonContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    margin: -8,
    paddingLeft: 4,
    marginLeft: 0,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#39FF14", // Lime green
    justifyContent: "center",
    alignItems: "center",
  },
  // Removed plusButtonText
  plusButtonDisabled: {
    backgroundColor: "#333333", // Dark gray
  },
  // Removed plusButtonTextDisabled
});

export default ExerciseCard;
