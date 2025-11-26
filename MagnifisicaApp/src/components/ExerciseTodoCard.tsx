import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

interface ExerciseTodo {
  id: string;
  name: string;
  isDone: boolean;
}

interface ExerciseTodoCardProps {
  exercise: ExerciseTodo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  isEditing: boolean;
}

const ExerciseTodoCard: React.FC<ExerciseTodoCardProps> = ({
  exercise,
  onToggle,
  onRemove,
  isEditing,
}) => {
  const checkboxStyle = [
    styles.checkbox,
    exercise.isDone ? styles.checkboxDone : styles.checkboxPending,
  ];

  return (
    <View style={styles.cardContainer}>
      <Text style={[styles.cardText, exercise.isDone && styles.cardTextDone]}>
        {exercise.name}
      </Text>

      {isEditing ? (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(exercise.id)}
          testID={`remove-${exercise.id}`}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={checkboxStyle}
          onPress={() => onToggle(exercise.id)}
          testID={`toggle-${exercise.id}`}
        >
          {exercise.isDone && (
            <Ionicons name="checkmark" size={20} color="#121212" /> // Dark checkmark
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardText: {
    fontSize: 16,
    color: "#E0E0E0",
    flex: 1,
  },
  cardTextDone: {
    textDecorationLine: "line-through",
    color: "#666666",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  checkboxPending: {
    borderColor: "#39FF14",
    backgroundColor: "transparent",
  },
  checkboxDone: {
    borderColor: "#39FF14",
    backgroundColor: "#39FF14",
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
});

export default ExerciseTodoCard;
