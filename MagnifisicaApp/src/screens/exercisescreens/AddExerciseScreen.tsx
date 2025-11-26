import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Exercise } from "../../types/Exercise";
import ExerciseCard from "../../components/ExerciseCard";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../../navigations/MainStackNavigator";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/authstore";

// Import React Query hooks
import {
  useExerciseLibrary,
  useUserExerciseIds,
  useAddExerciseToUser,
} from "../../hooks/useExerciseLibrary";

const AddExercise: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const user = useAuthStore((state) => state.user);

  // Fetch all exercises and user's added exercise IDs
  const { data: exercises = [], isLoading: loadingExercises } =
    useExerciseLibrary();
  const { data: userExerciseIds = [], isLoading: loadingUserIds } =
    useUserExerciseIds(user?.uid);
  const { mutate: addExercise, isPending: isAdding } = useAddExerciseToUser();

  // Combined loading state
  const loading = loadingExercises || loadingUserIds;

  // Create a Set for faster lookup
  const addedExerciseIds = useMemo(
    () => new Set(userExerciseIds),
    [userExerciseIds]
  );

  const handlePressExercise = (exercise: Exercise) => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add an exercise.");
      return;
    }

    // Check if already added
    if (addedExerciseIds.has(exercise.id)) {
      Alert.alert("Already Added", "This exercise is already in your list.");
      return;
    }

    addExercise(
      { userId: user.uid, exercise },
      {
        onSuccess: () => {
          Alert.alert("Success", `${exercise.name} added to your list.`);
        },
        onError: (error) => {
          if (
            error instanceof Error &&
            error.message === "EXERCISE_ALREADY_EXISTS"
          ) {
            Alert.alert(
              "Already Added",
              "This exercise is already in your list."
            );
          } else {
            Alert.alert("Error", "Could not add exercise. Please try again.");
          }
        },
      }
    );
  };

  const renderItem = ({ item }: { item: Exercise }) => {
    const isAdded = addedExerciseIds.has(item.id);

    return (
      <ExerciseCard
        activity={item}
        onPress={() => handlePressExercise(item)}
        onAddPress={() => handleAddExercise(item)}
        disabled={isAdded || isAdding}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      );
    }

    if (exercises.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No exercises available.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={exercises}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#E0E0E0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Exercises</Text>
          <View style={styles.dummyView} />
        </View>

        {renderContent()}
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
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#E0E0E0",
  },
  dummyView: {
    width: 32,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
  },
});

export default AddExercise;
