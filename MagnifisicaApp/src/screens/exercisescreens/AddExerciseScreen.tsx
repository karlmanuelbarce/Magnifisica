import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView, // <-- 1. ADDED SAFEA REA VIEW
} from "react-native";
import { Exercise } from "../../types/Exercise";
import ExerciseCard from "../../components/ExerciseCard";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MainStackParamList } from "../../navigations/MainStackNavigator";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const AddExercise: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handlePressExercise = (exercise: Exercise) => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  const handleAddExercise = async (exercise: Exercise) => {
    const user = auth().currentUser;

    if (user) {
      const userExercisesRef = firestore().collection(
        "exercises_taken_by_user"
      );

      try {
        const querySnapshot = await userExercisesRef
          .where("userID", "==", user.uid)
          .where("exerciseID", "==", exercise.id)
          .get();

        if (!querySnapshot.empty) {
          Alert.alert(
            "Already Added",
            "This exercise is already in your list."
          );
        } else {
          await userExercisesRef.add({
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

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        const snapshot = await firestore().collection("exercises").get();
        const exercisesList: Exercise[] = snapshot.docs.map((doc) => {
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
    // 2. USE SAFEA REA VIEW AS THE ROOT
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Exercises</Text>
        </View>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

// --- 3. UPDATED STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  container: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  header: {
    paddingHorizontal: 20, // Consistent padding
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#E0E0E0", // Light text
  },
  list: {
    paddingHorizontal: 20, // Add padding to the list
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30", // Danger color
    fontSize: 16,
    textAlign: "center",
  },
});

export default AddExercise;
