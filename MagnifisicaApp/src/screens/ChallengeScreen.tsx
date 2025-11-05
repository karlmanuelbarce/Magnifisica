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
import notifee, { AndroidImportance } from "@notifee/react-native";

import ChallengeCard, { Challenge } from "../components/ChallengeCard"; // Adjust path as needed

// --- 3. Get Firestore instance ---
const db = getFirestore();

// --- 4. Add Notifee helper function ---
async function displayNotification(title: string, body: string) {
  try {
    // Request permissions (required for iOS)
    await notifee.requestPermission();

    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
      id: "new-challenge",
      name: "New Challenges",
      importance: AndroidImportance.HIGH, // This ensures the notification pops up
    });

    // Display the notification
    await notifee.displayNotification({
      title: title,
      body: body,
      android: {
        channelId,
        pressAction: {
          id: "default", // This will open the app when pressed
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

        // --- MODIFIED: Notification Logic ---
        // Check for new documents *after* the initial load
        if (!isFirstLoad.current) {
          querySnapshot.docChanges().forEach((change: any) => {
            if (change.type === "added") {
              console.log("New challenge added: ", change.doc.data());
              const newChallenge = change.doc.data() as Challenge;

              // Send a notification
              // Assumes your Challenge object has 'title' and 'description' fields
              displayNotification(
                "🚀 New Challenge Available!",
                newChallenge.title || "Check out the new challenge." // Use challenge title or a fallback
              );
            }
          });
        }

        // --- This code is still needed to update the UI ---
        querySnapshot.forEach((doc: any) => {
          challengesList.push({
            id: doc.id,
            ...doc.data(),
          } as Challenge);
        });
        setChallenges(challengesList);

        // After the first-ever snapshot is processed, set this to false
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
        }
        // --- END OF MODIFICATION ---

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
