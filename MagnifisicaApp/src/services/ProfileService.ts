import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot, // Import onSnapshot
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

const db = getFirestore();

export interface JoinedChallenge {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeDescription: string;
  challengeStartDate: FirebaseFirestoreTypes.Timestamp;
  challengeEndDate: FirebaseFirestoreTypes.Timestamp;
  isCompleted: boolean;
  progress: number;
  joinedAt: FirebaseFirestoreTypes.Timestamp;
  targetMetre?: number;
  calculatedProgress?: number;
}

export interface WeeklyChartData {
  labels: string[];
  data: number[];
}

export interface ProfileData {
  weeklyActivity: WeeklyChartData;
  challenges: JoinedChallenge[];
}

export const ProfileService = {
  /**
   * Subscribes to the last 7 days of running activity
   */
  subscribeToWeeklyActivity: (
    userId: string,
    onUpdate: (data: WeeklyChartData) => void,
    onError: (error: Error) => void
  ) => {
    const today = new Date();
    const dayStartTimestamps: Date[] = [];
    const labels: string[] = [];

    // Pre-calculate date ranges
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      labels.push(
        day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
      );
      const startOfDay = new Date(day);
      startOfDay.setHours(0, 0, 0, 0);
      dayStartTimestamps.push(startOfDay);
    }

    const queryStartDate = dayStartTimestamps[0];

    const routesRef = collection(db, "routes");
    const routesQuery = query(
      routesRef,
      where("userID", "==", userId),
      where("createdAt", ">=", queryStartDate),
      where("createdAt", "<=", today)
    );

    return onSnapshot(
      routesQuery,
      (snapshot) => {
        const data: number[] = [0, 0, 0, 0, 0, 0, 0];

        snapshot.forEach(
          (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const route = doc.data() as {
              createdAt: FirebaseFirestoreTypes.Timestamp;
              distanceMeters: number;
            };
            const routeDate = route.createdAt.toDate();
            const distanceKm = route.distanceMeters / 1000;

            // Aggregate
            for (let i = dayStartTimestamps.length - 1; i >= 0; i--) {
              if (routeDate >= dayStartTimestamps[i]) {
                data[i] += distanceKm;
                break;
              }
            }
          }
        );

        onUpdate({ labels, data });
      },
      (error) => {
        console.error("Error subscribing to weekly activity:", error);
        onError(error);
      }
    );
  },

  /**
   * Subscribes to joined challenges and calculates progress
   * Note: This requires fetching routes inside the subscription callback
   */
  subscribeToJoinedChallenges: (
    userId: string,
    onUpdate: (data: JoinedChallenge[]) => void,
    onError: (error: Error) => void
  ) => {
    const challengesRef = collection(
      db,
      "participants",
      userId,
      "joinedChallenges"
    );
    const challengesQuery = query(challengesRef, orderBy("joinedAt", "desc"));

    return onSnapshot(
      challengesQuery,
      async (snapshot) => {
        try {
          const challengesWithProgress = await Promise.all(
            snapshot.docs.map(
              async (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const challenge = {
                  id: doc.id,
                  ...doc.data(),
                } as JoinedChallenge;

                let totalProgress = 0;

                if (!challenge.isCompleted) {
                  // Fetch routes for this specific challenge duration
                  // Note: We use getDocs here to avoid nested listeners overload,
                  // effectively making this "Reactive to Challenge Changes" but "Pulling Route Data"
                  const challengeRoutesQuery = query(
                    collection(db, "routes"),
                    where("userID", "==", userId),
                    where("createdAt", ">=", challenge.challengeStartDate),
                    where("createdAt", "<=", challenge.challengeEndDate)
                  );

                  const routeSnaps = await getDocs(challengeRoutesQuery);

                  routeSnaps.forEach(
                    (
                      routeDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot
                    ) => {
                      const routeData = routeDoc.data() as {
                        distanceMeters: number;
                      };
                      totalProgress += routeData.distanceMeters;
                    }
                  );
                }

                return {
                  ...challenge,
                  calculatedProgress: totalProgress,
                };
              }
            )
          );

          onUpdate(challengesWithProgress);
        } catch (err) {
          console.error("Error calculating progress in subscription:", err);
          onError(err instanceof Error ? err : new Error("Unknown error"));
        }
      },
      (error) => {
        console.error("Error subscribing to joined challenges:", error);
        onError(error);
      }
    );
  },

  /**
   * Subscribes to BOTH weekly activity and challenges
   * Merges the results into one ProfileData object
   */
  subscribeToProfileData: (
    userId: string,
    onUpdate: (data: ProfileData) => void,
    onError: (error: Error) => void
  ) => {
    let currentWeekly: WeeklyChartData | null = null;
    let currentChallenges: JoinedChallenge[] | null = null;

    const checkAndUpdate = () => {
      if (currentWeekly && currentChallenges) {
        onUpdate({
          weeklyActivity: currentWeekly,
          challenges: currentChallenges,
        });
      }
    };

    const unsubWeekly = ProfileService.subscribeToWeeklyActivity(
      userId,
      (data) => {
        currentWeekly = data;
        checkAndUpdate();
      },
      onError
    );

    const unsubChallenges = ProfileService.subscribeToJoinedChallenges(
      userId,
      (data) => {
        currentChallenges = data;
        checkAndUpdate();
      },
      onError
    );

    // Return a function that unsubscribes from both
    return () => {
      unsubWeekly();
      unsubChallenges();
    };
  },

  // --- Keep Fetch Methods for Initial Server Side Props or non-realtime needs if necessary ---
  fetchWeeklyActivity: async (userId: string): Promise<WeeklyChartData> => {
    // ... (Implementation same as before if needed, or can just wrap subscribe in a promise)
    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToWeeklyActivity(
        userId,
        (data) => {
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },

  fetchJoinedChallenges: async (userId: string): Promise<JoinedChallenge[]> => {
    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToJoinedChallenges(
        userId,
        (data) => {
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },

  fetchProfileData: async (userId: string): Promise<ProfileData> => {
    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToProfileData(
        userId,
        (data) => {
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },
};
