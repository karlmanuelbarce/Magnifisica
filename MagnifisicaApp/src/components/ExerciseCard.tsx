import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Exercise } from "../types/Exercise";

interface ExerciseCardProps {
  activity: Exercise;
  onPress?: () => void;
}

const capitalize = (s: string) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({ activity, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1, // Allow title to wrap if long
    marginRight: 8,
  },
  tag: {
    backgroundColor: "#eef2ff", // A soft blue background
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    color: "#4f46e5", // A matching blue text color
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    gap: 24, // Adds space between items
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
});

export default ExerciseCard;
