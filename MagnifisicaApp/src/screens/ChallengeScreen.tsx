import notifee, { AndroidImportance } from "@notifee/react-native";
import {
  getFirestore,
  collection,
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ChallengeCard, { Challenge } from "../components/ChallengeCard";
import { logger } from "../utils/logger";

// --- Get Firestore instance ---
const db = getFirestore();

// --- Notifee helper function ---
async function displayNotification(title: string, body: string) {
  try {
    logger.debug(
      "Requesting notification permission",
      { title },
      "ChallengeScreen"
    );

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

    logger.info(
      "Notification displayed successfully",
      { title, body },
      "ChallengeScreen"
    );
  } catch (error) {
    logger.error(
      "Failed to display notification",
      { error, title, body },
      "ChallengeScreen"
    );
  }
}

const ChallengeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    logger.info(
      "Setting up challenges real-time subscription",
      null,
      "ChallengeScreen"
    );

    const collectionRef = collection(db, "Challenge");
    const subscriber = onSnapshot(
      collectionRef,
      (querySnapshot) => {
        const challengesList: Challenge[] = [];

        logger.debug(
          "Challenges snapshot received",
          {
            count: querySnapshot.size,
            isFirstLoad: isFirstLoad.current,
          },
          "ChallengeScreen"
        );

        if (!isFirstLoad.current) {
          // Check for new challenges added
          querySnapshot
            .docChanges()
            .forEach((change: FirebaseFirestoreTypes.DocumentChange) => {
              if (change.type === "added") {
                const newChallenge = change.doc.data() as Challenge;

                logger.success(
                  "New challenge detected",
                  {
                    challengeId: change.doc.id,
                    title: newChallenge.title,
                  },
                  "ChallengeScreen"
                );

                displayNotification(
                  "🚀 New Challenge Available!",
                  newChallenge.title || "Check out the new challenge."
                );
              }
            });
        }

        // Build challenges list
        querySnapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data() as Challenge;
            challengesList.push({
              ...data,
              id: doc.id,
            } as Challenge);
          }
        );

        setChallenges(challengesList);

        logger.debug(
          "Challenges list updated",
          { count: challengesList.length },
          "ChallengeScreen"
        );

        // After the first-ever snapshot is processed, set this to false
        if (isFirstLoad.current) {
          logger.info(
            "Initial challenges load complete",
            { count: challengesList.length },
            "ChallengeScreen"
          );
          isFirstLoad.current = false;
        }

        setLoading(false);
      },
      (error) => {
        logger.error(
          "Error fetching challenges from Firestore",
          error,
          "ChallengeScreen"
        );
        setLoading(false);
      }
    );

    return () => {
      logger.debug(
        "Cleaning up challenges subscription",
        null,
        "ChallengeScreen"
      );
      subscriber();
    };
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

// --- Styles ---
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
