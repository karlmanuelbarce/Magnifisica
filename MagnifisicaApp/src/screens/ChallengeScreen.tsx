import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import ChallengeCard, { Challenge } from "../components/ChallengeCard"; // Adjust path as needed

const ChallengeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Set up a real-time listener for the challenges
    const subscriber = firestore()
      .collection("Challenge") // Your collection name
      .onSnapshot(
        (querySnapshot) => {
          const challengesList: Challenge[] = [];

          querySnapshot.forEach((doc) => {
            challengesList.push({
              id: doc.id,
              ...doc.data(),
            } as Challenge);
          });
          setChallenges(challengesList);

          setLoading(false);
        },
        (error) => {
          console.error("Error fetching challenges: ", error);
          setLoading(false);
        }
      );

    return () => subscriber();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        {/* --- DESIGN CHANGE --- */}
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={challenges}
        renderItem={({ item }) => <ChallengeCard challenge={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Text style={styles.title}>Available Challenges</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No challenges available right now.
          </Text>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

// --- DESIGN CHANGES IN STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  container: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16, // Added horizontal padding
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#E0E0E0", // Light text
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888888", // Muted light text
  },
});

export default ChallengeScreen;
