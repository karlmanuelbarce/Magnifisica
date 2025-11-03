import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView, // Import SafeAreaView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../navigations/MainStackNavigator";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Ionicons from "react-native-vector-icons/Ionicons";

// --- Import Firebase ---
// We no longer need 'auth' here
import firestore from "@react-native-firebase/firestore";

// --- 1. Import your Zustand store ---
import { useAuthStore } from "../store/authstore"; // Adjust path if needed

// --- Interfaces (No changes) ---
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

// --- Card Component (No changes) ---
const ExerciseTodoCard: React.FC<ExerciseTodoCardProps> = ({
  exercise,
  onToggle,
  onRemove,
  isEditing,
}) => {
  // ... (Component code is unchanged) ...
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
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={checkboxStyle}
          onPress={() => onToggle(exercise.id)}
        >
          {exercise.isDone && (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- Main HomeScreen Component ---
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  const [exercises, setExercises] = useState<ExerciseTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // --- 2. Get user from the Zustand store ---
  const user = useAuthStore((state) => state.user);

  // --- 3. Update useEffect to use the 'user' from the store ---
  useEffect(() => {
    // We now use the 'user' object from the store
    if (!user) {
      setLoading(false);
      return; // This might happen briefly on load
    }

    const subscriber = firestore()
      .collection("exercises_taken_by_user")
      .where("userID", "==", user.uid) // Use user.uid from the store
      .onSnapshot(
        (querySnapshot) => {
          const exercisesList: ExerciseTodo[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            exercisesList.push({
              id: doc.id,
              name: data.name,
              isDone: data.isDone === true ? true : false,
            });
          });
          setExercises(exercisesList);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching user exercises: ", error);
          Alert.alert("Error", "Could not load your exercises.");
          setLoading(false);
        }
      );

    return () => subscriber();
  }, [user]); // Add 'user' as a dependency

  // --- Calculations & Handlers (No changes) ---
  const currentAmount = exercises.filter((ex) => ex.isDone).length;
  const goalAmount = exercises.length;
  const fillPercent = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  function handleToggleExercise(id: string) {
    // ... (This function is unchanged) ...
    const exercise = exercises.find((ex) => ex.id === id);
    if (!exercise) return;

    firestore()
      .collection("exercises_taken_by_user")
      .doc(id)
      .update({
        isDone: !exercise.isDone,
      })
      .catch((error) => {
        console.error("Error toggling exercise: ", error);
        Alert.alert("Error", "Could not update exercise.");
      });
  }

  function handleRemoveExercise(id: string) {
    // ... (This function is unchanged) ...
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            firestore()
              .collection("exercises_taken_by_user")
              .doc(id)
              .delete()
              .catch((error) => {
                console.error("Error removing exercise: ", error);
                Alert.alert("Error", "Could not remove exercise.");
              });
          },
        },
      ]
    );
  }

  function handleAddExercise() {
    // ... (This function is unchanged) ...
    if (isEditing) {
      setIsEditing(false);
    }
    navigation.navigate("AddExercise");
  }

  // --- RENDER FUNCTION (No changes) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- 1. New Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome!</Text>
          <Text style={styles.headerSubtitle}>Here's your plan for today.</Text>
        </View>

        {/* --- 2. Progress Ring inside a Card --- */}
        <View style={styles.progressCard}>
          <Text style={styles.progressCardTitle}>Workouts This Week</Text>
          <AnimatedCircularProgress
            size={180} // Slightly smaller to fit card
            width={15}
            fill={fillPercent}
            tintColor="#007AFF"
            backgroundColor="#e0e0e0"
            rotation={0}
            lineCap="round"
          >
            {(fill: number) => (
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressTextValue}>{currentAmount}</Text>
                <Text style={styles.progressTextLabel}>/ {goalAmount}</Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>

        {/* --- 3. Workout List (Remove old button, add icon button) --- */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExerciseTodoCard
                exercise={item}
                onToggle={handleToggleExercise}
                onRemove={handleRemoveExercise}
                isEditing={isEditing}
              />
            )}
            style={styles.list}
            ListHeaderComponent={
              // Show header only if there are exercises
              goalAmount > 0 ? (
                <View style={styles.listHeaderContainer}>
                  <Text style={styles.listHeader}>Today's Workout</Text>
                  {/* --- Use an icon for the edit button --- */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(!isEditing)}
                  >
                    <Ionicons
                      name={isEditing ? "checkmark-circle" : "pencil-outline"}
                      size={24}
                      color="#007AFF"
                    />
                  </TouchableOpacity>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyListText}>
                  No exercises added yet.
                </Text>
                <Text style={styles.emptyListSubtext}>
                  Tap the '+' to add one!
                </Text>
              </View>
            }
            // Add padding to bottom to not be hidden by FAB
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* --- 4. Floating Action Button (FAB) --- */}
        <TouchableOpacity style={styles.fab} onPress={handleAddExercise}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- STYLES (No changes) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F5F7", // Light gray background
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // 1. Header Styles
  header: {
    paddingTop: 20, // Replaces old paddingTop: 60
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#555",
    marginTop: 4,
  },

  // 2. Progress Card Styles
  progressCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 15,
  },
  progressTextContainer: {
    // (from your original styles)
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  progressTextValue: {
    // (from your original styles)
    fontSize: 60,
    fontWeight: "bold",
    color: "#333",
  },
  progressTextLabel: {
    // (from your original styles)
    fontSize: 24,
    fontWeight: "600",
    color: "#555",
    paddingBottom: 8,
    marginLeft: 4,
  },

  // 3. List Styles
  list: {
    width: "100%",
    marginTop: 10,
  },
  listHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  editButton: {
    // Replaces editButtonText
    padding: 5, // Make it easier to tap
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyListText: {
    textAlign: "center",
    fontSize: 18,
    color: "#888",
  },
  emptyListSubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#AAA",
    marginTop: 8,
  },

  // 4. Card Styles
  cardContainer: {
    backgroundColor: "#FFFFFF", // Changed from #f9f9f9
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
    color: "#333",
    flex: 1,
  },
  cardTextDone: {
    textDecorationLine: "line-through",
    color: "#999",
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
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  checkboxDone: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
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

  // 5. FAB (Floating Action Button) Styles
  fab: {
    position: "absolute",
    bottom: 30, // Adjust based on your tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default HomeScreen;
