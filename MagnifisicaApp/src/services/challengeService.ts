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
import notifee, { AndroidImportance } from "@notifee/react-native";
import { Challenge } from "../components/ChallengeCard";

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
      // Explicitly type 'doc' here
      querySnapshot.forEach(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          challenges.push({
            ...data,
            id: doc.id,
          } as Challenge);
        }
      );

      console.log("✅ Fetched challenges:", challenges.length);
      return challenges;
    } catch (error) {
      console.error("❌ Error fetching challenges:", error);

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
                console.log("🆕 New challenge detected:", newChallenge.title);
                this.displayNotification(
                  "🚀 New Challenge Available!",
                  newChallenge.title || "Check out the new challenge."
                );
                this.notificationShown.add(challengeId);
              }
            }
          });

        // Build challenges list
        // Explicitly type 'doc' here as well
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
        console.error("❌ Error in challenges subscription:", error);

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

      console.log("✅ Challenge created:", newChallenge.title);
      return newChallenge;
    } catch (error) {
      console.error("❌ Error creating challenge:", error);

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

      console.log("✅ Challenge updated:", challengeId);
    } catch (error) {
      console.error("❌ Error updating challenge:", error);

      throw error;
    }
  }

  /**
   * Delete a challenge (admin only)
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "Challenge", challengeId));
      console.log("✅ Challenge deleted:", challengeId);
    } catch (error) {
      console.error("❌ Error deleting challenge:", error);
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
    } catch (error) {
      console.error("❌ Error displaying notification:", error);
    }
  }

  /**
   * Reset notification tracking (useful for testing)
   */
  resetNotifications(): void {
    this.notificationShown.clear();
  }
}

export const challengeService = new ChallengeService();
