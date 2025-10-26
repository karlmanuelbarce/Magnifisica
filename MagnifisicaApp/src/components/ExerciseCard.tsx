import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Exercise } from "../types/Exercise";

interface ExerciseCardProps {
  activity: Exercise;
  onPress?: () => void;
  onAddPress: () => void;
  disabled?: boolean; // <-- NEW: Prop to disable the button
}

const capitalize = (s: string) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  activity,
  onPress,
  onAddPress,
  disabled, // <-- NEW
}) => {
  // --- NEW: Dynamic styles for the button ---
  const plusButtonContainerStyle = [
    styles.plusButton,
    disabled && styles.plusButtonDisabled, // Grays out the button
  ];

  const plusButtonTextStyle = [
    styles.plusButtonText,
    disabled && styles.plusButtonTextDisabled, // Grays out the text
  ];
  // ---

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.8}>
      <View style={styles.mainContainer}>
        <View style={styles.contentContainer}>
          {/* ... (rest of the card content is unchanged) ... */}
          <View style={styles.header}>
            <Text style={styles.title}>{activity.name}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{capitalize(activity.muscle)}</Text>
            </View>
          </View>
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💪</Text>
              <Text style={styles.detailText}>
                {capitalize(activity.difficulty)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🏋️</Text>
              <Text style={styles.detailText}>
                {capitalize(activity.equipment.replace(/_/g, " "))}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🎯</Text>
              <Text style={styles.detailText}>{capitalize(activity.type)}</Text>
            </View>
          </View>
        </View>

        {/* --- MODIFIED THIS SECTION --- */}
        <TouchableOpacity
          onPress={onAddPress}
          style={styles.buttonContainer}
          activeOpacity={0.7}
          disabled={disabled} // <-- NEW: Disable the touchable
        >
          <View style={plusButtonContainerStyle}>
            <Text style={plusButtonTextStyle}>+</Text>
          </View>
        </TouchableOpacity>
        {/* --- END OF MODIFICATION --- */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ... (all other styles are unchanged) ...
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
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
  },
  tag: {
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    gap: 24,
    flexWrap: "wrap",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#374151",
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
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  plusButtonText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#4f46e5",
    lineHeight: 24,
  },
  // --- NEW STYLES FOR DISABLED STATE ---
  plusButtonDisabled: {
    backgroundColor: "#e5e7eb", // Gray background
  },
  plusButtonTextDisabled: {
    color: "#9ca3af", // Gray text
  },
});

export default ExerciseCard;
