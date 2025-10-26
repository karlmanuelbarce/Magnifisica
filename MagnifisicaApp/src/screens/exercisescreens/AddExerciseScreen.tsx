import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  ActivityIndicator,
  Alert,
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
        // 1. Query to see if this exercise already exists for this user
        const querySnapshot = await userExercisesRef
          .where("userID", "==", user.uid)
          .where("exerciseID", "==", exercise.id)
          .get();

        // 2. If the query is NOT empty, a doc already exists
        if (!querySnapshot.empty) {
          Alert.alert(
            "Already Added",
            "This exercise is already in your list."
          );
        } else {
          // 3. If the query IS empty, add the document
          //    with ALL the data HomeScreen needs

          // --- THIS IS THE UPDATED CODE ---
          await userExercisesRef.add({
            userID: user.uid,
            exerciseID: exercise.id,

            // Add all the other exercise data
            name: exercise.name,
            difficulty: exercise.difficulty,
            equipment: exercise.equipment,
            muscle: exercise.muscle,
            type: exercise.type,
            description: exercise.instructions,
            isDone: false, // <-- Add this field, default to false
          });
          // --- END OF UPDATE ---

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

        // 1. Get the collection

        const snapshot = await firestore().collection("exercises").get();

        // 2. Map the Firestore docs to your Exercise[] type

        const exercisesList: Exercise[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id, // Use the Firestore Document ID as the unique ID

            name: data.name,

            difficulty: data.difficulty,

            equipment: data.equipment,

            muscle: data.muscle, // Make sure this field exists in your docs

            type: data.type, // Make sure this field exists in your docs

            instructions: data.description, // Map Firestore 'description' to your app's 'instructions'
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercises</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0000ff"
          style={{ marginTop: 20 }}
        />
      ) : error ? (
        <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
          {error}
        </Text>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

    padding: 24,

    backgroundColor: "#fff",

    justifyContent: "center",
  },

  title: {
    fontSize: 24,

    fontWeight: "bold",

    marginBottom: 24,

    textAlign: "center",
  },

  header: {
    paddingHorizontal: 16,

    paddingTop: 16,

    paddingBottom: 8,
  },

  headerTitle: {
    fontSize: 28,

    fontWeight: "bold",
  },

  list: {
    paddingBottom: 16,
  },
});

export default AddExercise;
