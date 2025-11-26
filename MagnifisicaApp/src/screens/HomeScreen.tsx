import React, { useState } from "react";
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
import ExerciseTodoCard from "../components/ExerciseTodoCard";
import { useAuthStore } from "../store/authstore";

// --- Import React Query Hooks ---
import {
  useUserExercises,
  useToggleExercise,
  useRemoveExercise,
} from "../hooks/useExercise";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [isEditing, setIsEditing] = useState(false);
  const user = useAuthStore((state) => state.user);

  // --- React Query Hooks ---
  const { data: exercises = [], isLoading } = useUserExercises(user?.uid);
  const { mutate: toggleExercise } = useToggleExercise();
  const { mutate: removeExercise } = useRemoveExercise();

  // --- Calculations ---
  const currentAmount = exercises.filter((ex) => ex.isDone).length;
  const goalAmount = exercises.length;
  const fillPercent = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  // --- Event Handlers ---
  const handleToggleExercise = (id: string) => {
    if (!user) return;

    const exercise = exercises.find((ex) => ex.id === id);
    if (!exercise) return;

    toggleExercise(
      { id, currentStatus: exercise.isDone, userId: user.uid },
      {
        onError: () => {
          Alert.alert("Error", "Could not update exercise status.");
        },
      }
    );
  };

  const handleRemoveExercise = (id: string) => {
    if (!user) return;

    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeExercise(
              { exerciseId: id, userId: user.uid },
              {
                onError: () => {
                  Alert.alert("Error", "Could not remove exercise.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleAddExercise = () => {
    if (isEditing) {
      setIsEditing(false);
    }
    navigation.navigate("AddExercise");
  };

  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome!</Text>
          <Text style={styles.headerSubtitle}>
            Here&#39;s your plan for today.
          </Text>
        </View>

        {/* Progress Card */}
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
            {() => (
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressTextValue}>{currentAmount}</Text>
                <Text style={styles.progressTextLabel}>/ {goalAmount}</Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>

        {/* List Section */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#39FF14"
            style={{ flex: 1 }}
            testID="loading-indicator"
          />
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
                  <Text style={styles.listHeader}>Today&#39;s Workout</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(!isEditing)}
                    testID="edit-button"
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
                  Tap the &#39;+&#39; to add one!
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddExercise}
          testID="add-exercise-fab"
        >
          <Ionicons name="add" size={30} color="#121212" />
        </TouchableOpacity>
      </View>
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
