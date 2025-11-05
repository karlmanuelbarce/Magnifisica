import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useAuthStore } from "../store/authstore";

// --- Interface (Unchanged) ---
export interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  TargetMetre: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

// formatDate function (Unchanged)
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

  // useEffect (Unchanged)
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

  // handleJoin function (Unchanged)
  const handleJoin = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to join a challenge.");
      return;
    }

    setLoading(true);
    try {
      const participantRef = firestore()
        .collection("participants")
        .doc(user.uid)
        .collection("joinedChallenges")
        .doc(challenge.id);

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
        targetMetre: challenge.TargetMetre,
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

  // --- DESIGN CHANGE IN RENDER LOGIC ---
  const isDisabled = isJoined || isChecking || loading;
  const buttonStyle = [styles.button, isDisabled && styles.buttonDisabled];
  const buttonTextStyle = [
    // Create a dynamic style for the text
    styles.buttonText,
    isDisabled && styles.buttonTextDisabled,
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
        disabled={isDisabled}
      >
        {/* Use the new dynamic text style */}
        <Text style={buttonTextStyle}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- STYLES (Redesigned) ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E", // <-- DESIGN CHANGE
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    // marginHorizontal: 16, // This is handled by the FlatList's padding
    shadowColor: "#000", // Shadow is less effective but fine
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#E0E0E0", // <-- DESIGN CHANGE
  },
  cardDescription: {
    fontSize: 14,
    color: "#AAAAAA", // <-- DESIGN CHANGE
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333333", // <-- DESIGN CHANGE
  },
  metaText: {
    fontSize: 12,
    color: "#888888", // <-- DESIGN CHANGE
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#39FF14", // <-- DESIGN CHANGE (Lime Green)
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#333333", // <-- DESIGN CHANGE (Dark Gray)
  },
  buttonText: {
    color: "#121212", // <-- DESIGN CHANGE (Dark text for lime button)
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextDisabled: {
    color: "#888888", // <-- DESIGN CHANGE (Light text for gray button)
  },
});

export default ChallengeCard;
