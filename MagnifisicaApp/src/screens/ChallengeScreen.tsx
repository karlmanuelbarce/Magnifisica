import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- 1. Import new modular functions and Firestore Types ---
import {
  getFirestore,
  collection,
  onSnapshot,
  FirebaseFirestoreTypes, // <-- IMPORTED
} from "@react-native-firebase/firestore";

// --- 2. Import Notifee ---
import notifee, { AndroidImportance } from "@notifee/react-native";

import ChallengeCard, { Challenge } from "../components/ChallengeCard";

// --- 3. Get Firestore instance ---
const db = getFirestore();

// --- 4. Add Notifee helper function (Unchanged) ---
async function displayNotification(title: string, body: string) {
  try {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: "new-challenge",
      name: "New Challenges",
      importance: AndroidImportance.HIGH,
    });
    await notifee.displayNotification({
      title: title,
      body: body,
      android: {
        channelId,
        pressAction: {
          id: "default",
        },
      },
      ios: {
        sound: "default",
      },
    });
  } catch (error) {
    console.error("Error displaying notification:", error);
  }
}

const ChallengeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    const collectionRef = collection(db, "Challenge");
    const subscriber = onSnapshot(
      collectionRef,
      (querySnapshot) => {
        const challengesList: Challenge[] = [];

        if (!isFirstLoad.current) {
          // --- FIX 1: Type 'change' as DocumentChange ---
          querySnapshot
            .docChanges()
            .forEach((change: FirebaseFirestoreTypes.DocumentChange) => {
              if (change.type === "added") {
                // Cast doc.data() to Challenge, as it's the structure we expect
                const newChallenge = change.doc.data() as Challenge;
                console.log("New challenge added: ", newChallenge);

                displayNotification(
                  "🚀 New Challenge Available!",
                  newChallenge.title || "Check out the new challenge."
                );
              }
            });
        }

        // --- FIX 2: Type 'doc' as QueryDocumentSnapshot ---
        querySnapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            // Cast doc.data() to Challenge
            const data = doc.data() as Challenge;
            challengesList.push({
              ...data, // <-- Spread all data first (including potential inner 'id')
              id: doc.id, // <-- Explicitly define 'id' using the document ID (which is correct)
            } as Challenge);
          }
        );
        setChallenges(challengesList);

        // After the first-ever snapshot is processed, set this to false
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
        }

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
