import notifee, { AndroidImportance } from "@notifee/react-native";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

import { Challenge } from "../components/ChallengeCard";
import { logger } from "../utils/logger";

const db = getFirestore();

class ChallengeService {
  private notificationShown = new Set<string>();

  /**
   * Fetch all challenges (for React Query)
   */
  async fetchChallenges(): Promise<Challenge[]> {
    try {
      const collectionRef = collection(db, "Challenge");
      const querySnapshot = await getDocs(collectionRef);

      const challenges: Challenge[] = [];
      querySnapshot.forEach(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          challenges.push({
            ...data,
            id: doc.id,
          } as Challenge);
        }
      );

      logger.success(
        `Fetched challenges: ${challenges.length}`,
        { count: challenges.length },
        "ChallengeService"
      );
      return challenges;
    } catch (error) {
      logger.error("Error fetching challenges", error, "ChallengeService");
      throw error;
    }
  }

  /**
   * Subscribe to real-time challenge updates
   * Returns unsubscribe function
   */
  subscribeToChallenges(
    onUpdate: (challenges: Challenge[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, "Challenge");

    const unsubscribe = onSnapshot(
      collectionRef,
      (querySnapshot) => {
        const challenges: Challenge[] = [];

        // Check for new challenges (for notifications)
        querySnapshot
          .docChanges()
          .forEach((change: FirebaseFirestoreTypes.DocumentChange) => {
            if (change.type === "added") {
              const newChallenge = change.doc.data() as Challenge;
              const challengeId = change.doc.id;

              // Only show notification if we haven't shown it before
              if (!this.notificationShown.has(challengeId)) {
                logger.info(
                  `New challenge detected: ${newChallenge.title}`,
                  { challengeId, title: newChallenge.title },
                  "ChallengeService"
                );
                this.displayNotification(
                  "🚀 New Challenge Available!",
                  newChallenge.title || "Check out the new challenge."
                );
                this.notificationShown.add(challengeId);
              }
            }
          });

        // Build challenges list
        querySnapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data();
            challenges.push({
              ...data,
              id: doc.id,
            } as Challenge);
          }
        );

        onUpdate(challenges);
      },
      (error) => {
        logger.error(
          "Error in challenges subscription",
          error,
          "ChallengeService"
        );
        onError(error as Error);
      }
    );

    return unsubscribe;
  }

  /**
   * Create a new challenge (admin only)
   */
  async createChallenge(
    challengeData: Omit<Challenge, "id">
  ): Promise<Challenge> {
    try {
      const docRef = await addDoc(collection(db, "Challenge"), {
        ...challengeData,
        createdAt: serverTimestamp(),
      });

      const newChallenge = {
        ...challengeData,
        id: docRef.id,
      } as Challenge;

      logger.success(
        `Challenge created: ${newChallenge.title}`,
        { challengeId: docRef.id, title: newChallenge.title },
        "ChallengeService"
      );
      return newChallenge;
    } catch (error) {
      logger.error("Error creating challenge", error, "ChallengeService");
      throw error;
    }
  }

  /**
   * Update an existing challenge (admin only)
   */
  async updateChallenge(
    challengeId: string,
    updates: Partial<Challenge>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, "Challenge", challengeId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      logger.success(
        `Challenge updated: ${challengeId}`,
        { challengeId, updates },
        "ChallengeService"
      );
    } catch (error) {
      logger.error("Error updating challenge", error, "ChallengeService");
      throw error;
    }
  }

  /**
   * Delete a challenge (admin only)
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "Challenge", challengeId));
      logger.success(
        `Challenge deleted: ${challengeId}`,
        { challengeId },
        "ChallengeService"
      );
    } catch (error) {
      logger.error("Error deleting challenge", error, "ChallengeService");
      throw error;
    }
  }

  /**
   * Display push notification for new challenges
   */
  private async displayNotification(
    title: string,
    body: string
  ): Promise<void> {
    try {
      await notifee.requestPermission();

      const channelId = await notifee.createChannel({
        id: "new-challenge",
        name: "New Challenges",
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title,
        body,
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

      logger.debug(
        `Notification displayed: ${title}`,
        { title, body },
        "ChallengeService"
      );
    } catch (error) {
      logger.error("Error displaying notification", error, "ChallengeService");
    }
  }

  /**
   * Reset notification tracking (useful for testing)
   */
  resetNotifications(): void {
    this.notificationShown.clear();
    logger.debug("Notification tracking reset", null, "ChallengeService");
  }
}

export const challengeService = new ChallengeService();
