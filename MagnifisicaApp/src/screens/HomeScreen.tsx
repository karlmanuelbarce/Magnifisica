import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../navigations/MainStackNavigator";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { Feather } from "@expo/vector-icons";

// --- Import Firebase ---
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// --- Define the shape of our exercise todo ---
interface ExerciseTodo {
  id: string;
  name: string;
  isDone: boolean;
}

// --- 1. MODIFICATION: Update Card Props ---
interface ExerciseTodoCardProps {
  exercise: ExerciseTodo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void; // <-- ADDED: Prop for removing
  isEditing: boolean; // <-- ADDED: Prop to check edit mode
}

// --- 2. MODIFICATION: Update Card Component ---
const ExerciseTodoCard: React.FC<ExerciseTodoCardProps> = ({
  exercise,
  onToggle,
  onRemove, // <-- ADDED
  isEditing, // <-- ADDED
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

      {/* --- ADDED: Conditional rendering for Edit/Toggle --- */}
      {isEditing ? (
        <TouchableOpacity
          style={styles.removeButton} // <-- New style for remove button
          onPress={() => onRemove(exercise.id)}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={checkboxStyle}
          onPress={() => onToggle(exercise.id)}
        >
          {exercise.isDone && <Feather name="check" size={20} color="#fff" />}
        </TouchableOpacity>
      )}
      {/* --- END OF MODIFICATION --- */}
    </View>
  );
};
// --- End of component ---

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  // --- State setup ---
  const [exercises, setExercises] = useState<ExerciseTodo[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 3. MODIFICATION: Add edit mode state ---
  const [isEditing, setIsEditing] = useState(false);

  // --- Fetch data from Firestore (No changes) ---
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection("exercises_taken_by_user")
      .where("userID", "==", user.uid)
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
  }, []);

  // --- Calculation (No changes) ---
  const currentAmount = exercises.filter((ex) => ex.isDone).length;
  const goalAmount = exercises.length;
  const fillPercent = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  // --- Update 'isDone' in Firestore (No changes) ---
  function handleToggleExercise(id: string) {
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

  // --- 4. MODIFICATION: Add Remove Exercise function ---
  function handleRemoveExercise(id: string) {
    // Add a confirmation alert
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // Delete the document from Firestore
            firestore()
              .collection("exercises_taken_by_user")
              .doc(id)
              .delete()
              .catch((error) => {
                console.error("Error removing exercise: ", error);
                Alert.alert("Error", "Could not remove exercise.");
              });
            // The onSnapshot listener will automatically update the UI
          },
        },
      ]
    );
  }
  // --- END OF MODIFICATION ---

  function handleAddExercise() {
    // If in edit mode, exit edit mode first
    if (isEditing) {
      setIsEditing(false);
    }
    navigation.navigate("AddExercise");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MagnifisicaApp!</Text>

      {/* --- Progress Ring (No changes) --- */}
      <View style={styles.progressContainer}>
        {/* ... (your AnimatedCircularProgress code) ... */}
        <AnimatedCircularProgress
          size={220}
          width={18}
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
        <Text style={styles.progressGoalText}>Workouts This Week</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAddExercise}>
        <Text style={styles.buttonText}>Add Exercise</Text>
      </TouchableOpacity>

      {/* --- 5. MODIFICATION: Update List with Edit Button --- */}
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
              onRemove={handleRemoveExercise} // <-- Pass remove function
              isEditing={isEditing} // <-- Pass edit state
            />
          )}
          style={styles.list}
          ListHeaderComponent={
            // Show header only if there are exercises
            goalAmount > 0 ? (
              <View style={styles.listHeaderContainer}>
                <Text style={styles.listHeader}>Today's Workout</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                  <Text style={styles.editButtonText}>
                    {isEditing ? "Done" : "Edit"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No exercises added yet.</Text>
          }
        />
      )}
      {/* --- END OF MODIFICATION --- */}
    </View>
  );
};

// --- 6. MODIFICATION: Add New Styles ---
const styles = StyleSheet.create({
  // ... (all your existing styles) ...

  emptyListText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#999",
  },
  list: {
    width: "100%",
    marginTop: 24,
  },
  // --- UPDATED AND NEW STYLES ---
  listHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  listHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  editButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  cardContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // ... (rest of card styles)
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
    backgroundColor: "#FF3B30", // Red for deletion
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  // --- (The rest of your existing container, title, etc. styles) ---
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  progressContainer: {
    alignItems: "center",
    marginVertical: 40,
    marginBottom: 20,
  },
  progressTextContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
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
    paddingBottom: 8,
    marginLeft: 4,
  },
  progressGoalText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;
