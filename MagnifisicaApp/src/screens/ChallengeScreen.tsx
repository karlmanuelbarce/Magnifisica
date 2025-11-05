import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  // Alert, // We are replacing Alert with Notifee
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- 1. Import new modular functions ---
import {
  getFirestore,
  collection,
  onSnapshot,
} from "@react-native-firebase/firestore";

// --- 2. Import Notifee ---

import ChallengeCard, { Challenge } from "../components/ChallengeCard"; // Adjust path as needed

// --- 3. Get Firestore instance ---
const db = getFirestore();

// --- 4. Add Notifee helper function ---

const ChallengeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    // --- This code is already correct ---
    const collectionRef = collection(db, "Challenge");
    const subscriber = onSnapshot(
      collectionRef,
      (querySnapshot) => {
        const challengesList: Challenge[] = [];

        querySnapshot.forEach((doc: any) => {
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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#E0E0E0",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888888",
  },
});

export default ChallengeScreen;
