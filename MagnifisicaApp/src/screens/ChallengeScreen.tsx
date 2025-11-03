import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import ChallengeCard, { Challenge } from "../components/ChallengeCard"; // Adjust path as needed

const ChallengeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

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

    // Unsubscribe from listener when component unmounts
    return () => subscriber();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888",
  },
});

export default ChallengeScreen;
