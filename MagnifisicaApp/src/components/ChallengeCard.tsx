import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";

import { useAuthStore } from "../store/authstore";
import { logger } from "../utils/logger";

// --- 2. Get Firestore instance ---
const db = getFirestore();

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

  // --- useEffect - Check participation status ---
  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      logger.debug("No user logged in", null, "ChallengeCard");
      return;
    }

    const participantRef = doc(
      db,
      "participants",
      user.uid,
      "joinedChallenges",
      challenge.id
    );

    const checkParticipation = async () => {
      setIsChecking(true);
      try {
        logger.debug(
          "Checking participation status",
          { userId: user.uid, challengeId: challenge.id },
          "ChallengeCard"
        );

        const docSnap = await getDoc(participantRef);
        if (docSnap.exists()) {
          setIsJoined(true);
          logger.info(
            "User already joined challenge",
            { challengeTitle: challenge.title },
            "ChallengeCard"
          );
        } else {
          setIsJoined(false);
          logger.debug(
            "User has not joined challenge",
            { challengeTitle: challenge.title },
            "ChallengeCard"
          );
        }
      } catch (error) {
        logger.error(
          "Error checking participation status",
          error,
          "ChallengeCard"
        );
      } finally {
        setIsChecking(false);
      }
    };

    checkParticipation();
  }, [user, challenge.id]);

  // --- 3. Refactored handleJoin ---
  const handleJoin = async () => {
    if (!user) {
      logger.warn("Join attempt without logged in user", null, "ChallengeCard");
      Alert.alert("Error", "You must be logged in to join a challenge.");
      return;
    }

    setLoading(true);
    logger.info(
      "User attempting to join challenge",
      {
        userId: user.uid,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
      },
      "ChallengeCard"
    );

    try {
      const participantRef = doc(
        db,
        "participants",
        user.uid,
        "joinedChallenges",
        challenge.id
      );

      // Use setDoc(ref, data)
      await setDoc(participantRef, {
        userId: user.uid,
        joinedAt: serverTimestamp(),
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

      logger.success(
        "User successfully joined challenge",
        {
          userId: user.uid,
          challengeId: challenge.id,
          challengeTitle: challenge.title,
        },
        "ChallengeCard"
      );

      Alert.alert(
        "Success!",
        `You have joined the "${challenge.title}" challenge.`
      );
      setIsJoined(true);
    } catch (error) {
      logger.error(
        "Failed to join challenge",
        {
          error,
          userId: user.uid,
          challengeId: challenge.id,
          challengeTitle: challenge.title,
        },
        "ChallengeCard"
      );
      Alert.alert("Error", "Could not join the challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Render logic (Unchanged) ---
  const isDisabled = isJoined || isChecking || loading;
  const buttonStyle = [styles.button, isDisabled && styles.buttonDisabled];
  const buttonTextStyle = [
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
        <Text style={buttonTextStyle}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
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
    color: "#E0E0E0",
  },
  cardDescription: {
    fontSize: 14,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  metaText: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#39FF14",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#333333",
  },
  buttonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextDisabled: {
    color: "#888888",
  },
});

export default ChallengeCard;
