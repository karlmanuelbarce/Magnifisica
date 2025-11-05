import React, { useEffect, useState } from "react";
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

// --- 1. Import new modular functions ---
import { getAuth } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "@react-native-firebase/firestore";

// --- 2. Get service instances ---
const auth = getAuth();
const db = getFirestore();

const AddExercise: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handlePressExercise = (exercise: Exercise) => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  // --- 3. Refactored handleAddExercise ---
  const handleAddExercise = async (exercise: Exercise) => {
    const user = auth.currentUser; // No longer a function call

    if (user) {
      // Get the collection reference
      const userExercisesRef = collection(db, "exercises_taken_by_user");

      try {
        // Build the query
        const q = query(
          userExercisesRef,
          where("userID", "==", user.uid),
          where("exerciseID", "==", exercise.id)
        );

        // Execute the query
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          Alert.alert(
            "Already Added",
            "This exercise is already in your list."
          );
        } else {
          // Use addDoc to add a new document
          await addDoc(userExercisesRef, {
            userID: user.uid,
            exerciseID: exercise.id,
            name: exercise.name,
            difficulty: exercise.difficulty,
            equipment: exercise.equipment,
            muscle: exercise.muscle,
            type: exercise.type,
            description: exercise.instructions,
            isDone: false,
          });

          Alert.alert("Success", `${exercise.name} added to your list.`);
        }
      } catch (error) {
        console.error("Error checking or adding exercise: ", error);
        Alert.alert("Error", "Could not add exercise. Please try again.");
      }
    } else {
      Alert.alert("Error", "You must be logged in to add an exercise.");
    }
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <ExerciseCard
      activity={item}
      onPress={() => handlePressExercise(item)}
      onAddPress={() => {
        handleAddExercise(item);
      }}
    />
  );

  // --- 4. Refactored loadExercises ---
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);

        // Get the collection ref and execute getDocs
        const snapshot = await getDocs(collection(db, "exercises"));

        const exercisesList: Exercise[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            difficulty: data.difficulty,
            equipment: data.equipment,
            muscle: data.muscle,
            type: data.type,
            instructions: data.description,
          };
        });

        setExercises(exercisesList);
      } catch (err) {
        console.error("Error fetching Firestore exercises: ", err);
        setError("Failed to load exercises.");
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#39FF14" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
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

// --- Styles (Unchanged) ---
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
