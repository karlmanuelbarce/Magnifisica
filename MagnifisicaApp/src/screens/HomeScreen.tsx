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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../navigations/MainStackNavigator";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Ionicons from "react-native-vector-icons/Ionicons";

// --- 1. Import new modular functions ---
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";

import { useAuthStore } from "../store/authstore"; // Adjust path if needed

// --- 2. Get Firestore instance ---
const db = getFirestore();

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
            <Ionicons name="checkmark" size={20} color="#121212" /> // Dark checkmark
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

  const user = useAuthStore((state) => state.user);

  // --- 3. Refactored useEffect ---
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Create the collection reference
    const collectionRef = collection(db, "exercises_taken_by_user");
    // Create the query
    const q = query(collectionRef, where("userID", "==", user.uid));

    // Set up the snapshot listener
    const subscriber = onSnapshot(
      q,
      (querySnapshot) => {
        const exercisesList: ExerciseTodo[] = [];
        querySnapshot.forEach((doc: any) => {
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
  }, [user]);

  // --- Calculations (No changes) ---
  const currentAmount = exercises.filter((ex) => ex.isDone).length;
  const goalAmount = exercises.length;
  const fillPercent = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  // --- 4. Refactored handleToggleExercise ---
  function handleToggleExercise(id: string) {
    const exercise = exercises.find((ex) => ex.id === id);
    if (!exercise) return;

    // Get the document reference
    const docRef = doc(db, "exercises_taken_by_user", id);

    // Use updateDoc
    updateDoc(docRef, { isDone: !exercise.isDone }).catch((error) => {
      console.error("Error toggling exercise: ", error);
      Alert.alert("Error", "Could not update exercise.");
    });
  }

  // --- 5. Refactored handleRemoveExercise ---
  function handleRemoveExercise(id: string) {
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // Get the document reference
            const docRef = doc(db, "exercises_taken_by_user", id);

            // Use deleteDoc
            deleteDoc(docRef).catch((error) => {
              console.error("Error removing exercise: ", error);
              Alert.alert("Error", "Could not remove exercise.");
            });
          },
        },
      ]
    );
  }

  function handleAddExercise() {
    if (isEditing) {
      setIsEditing(false);
    }
    navigation.navigate("AddExercise");
  }

  // --- RENDER FUNCTION (No changes) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- 1. Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome!</Text>
          <Text style={styles.headerSubtitle}>Here's your plan for today.</Text>
        </View>

        {/* --- 2. Progress Ring Card --- */}
        <View style={styles.progressCard}>
          <Text style={styles.progressCardTitle}>Workouts Today</Text>
          <AnimatedCircularProgress
            size={180}
            width={15}
            fill={fillPercent}
            tintColor="#39FF14"
            backgroundColor="#333333"
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

        {/* --- 3. Workout List --- */}
        {loading ? (
          <ActivityIndicator size="large" color="#39FF14" style={{ flex: 1 }} />
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
              goalAmount > 0 ? (
                <View style={styles.listHeaderContainer}>
                  <Text style={styles.listHeader}>Today's Workout</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(!isEditing)}
                  >
                    <Ionicons
                      name={isEditing ? "checkmark-circle" : "pencil-outline"}
                      size={24}
                      color="#39FF14"
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
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* --- 4. Floating Action Button (FAB) --- */}
        <TouchableOpacity style={styles.fab} onPress={handleAddExercise}>
          <Ionicons name="add" size={30} color="#121212" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- STYLES (No changes) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#E0E0E0",
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#888888",
    marginTop: 4,
  },
  progressCard: {
    width: "100%",
    backgroundColor: "#1E1E1E",
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
    color: "#AAAAAA",
    marginBottom: 15,
  },
  progressTextContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  progressTextValue: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#E0E0E0",
  },
  progressTextLabel: {
    fontSize: 24,
    fontWeight: "600",
    color: "#AAAAAA",
    paddingBottom: 8,
    marginLeft: 4,
  },
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
    color: "#E0E0E0",
  },
  editButton: {
    padding: 5,
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyListText: {
    textAlign: "center",
    fontSize: 18,
    color: "#888888",
  },
  emptyListSubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#777777",
    marginTop: 8,
  },
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
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#39FF14",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default HomeScreen;
