import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useAuthStore } from "../store/authstore";

// --- 1. UPDATE THE INTERFACE ---
export interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  TargetMetre: number; // <-- ADDED THIS LINE (matches your screenshot)
}

interface ChallengeCardProps {
  challenge: Challenge;
}

// formatDate function (unchanged)
const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp) => {
  if (!timestamp) {
    return "N/A";
  }
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => {
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const [isJoined, setIsJoined] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // useEffect (unchanged, still correct)
  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    const participantRef = firestore()
      .collection("participants")
      .doc(user.uid)
      .collection("joinedChallenges")
      .doc(challenge.id);

    const checkParticipation = async () => {
      setIsChecking(true);
      try {
        const doc = await participantRef.get();
        if (doc.exists()) {
          setIsJoined(true);
        } else {
          setIsJoined(false);
        }
      } catch (error) {
        console.error("Error checking participation: ", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkParticipation();
  }, [user, challenge.id]);

  // --- 2. UPDATE THE handleJoin FUNCTION ---
  const handleJoin = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to join a challenge.");
      return;
    }

    setLoading(true);
    try {
      const participantRef = firestore()
        .collection("participants") // Top-level collection
        .doc(user.uid) // User's document
        .collection("joinedChallenges") // Sub-collection of challenges
        .doc(challenge.id); // Document for this specific challenge

      // Add the 'targetMetre' field to the data being set
      await participantRef.set({
        userId: user.uid,
        joinedAt: firestore.FieldValue.serverTimestamp(),
        displayName: user.email,
        progress: 0,
        isCompleted: false,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        challengeStartDate: challenge.startDate,
        challengeEndDate: challenge.endDate,

        // --- THIS IS THE FIX ---
        targetMetre: challenge.TargetMetre, // <-- ADDED THIS LINE
        // --- END OF FIX ---
      });

      Alert.alert(
        "Success!",
        `You have joined the "${challenge.title}" challenge.`
      );
      setIsJoined(true);
    } catch (error) {
      console.error("Error joining challenge:", error);
      Alert.alert("Error", "Could not join the challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Return/Render logic is unchanged ---
  const buttonStyle = [
    styles.button,
    (isJoined || isChecking || loading) && styles.buttonDisabled,
  ];
  const buttonText = isChecking
    ? "Loading..."
    : isJoined
    ? "Joined"
    : "Join Challenge";

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{challenge.title}</Text>
      <Text style={styles.cardDescription}>{challenge.description}</Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaText}>
          Starts: {formatDate(challenge.startDate)}
        </Text>
        <Text style={styles.metaText}>
          Ends: {formatDate(challenge.endDate)}
        </Text>
      </View>

      <TouchableOpacity
        style={buttonStyle}
        onPress={handleJoin}
        disabled={loading || isChecking || isJoined}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Styles are unchanged ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#a9a9a9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChallengeCard;
