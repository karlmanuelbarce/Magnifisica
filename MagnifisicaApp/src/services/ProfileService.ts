import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

import { logger } from "../utils/logger";

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
    logger.info("Subscribing to weekly activity", { userId }, "ProfileService");

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

        const totalDistance = data.reduce((sum, val) => sum + val, 0);
        logger.debug(
          `Weekly activity updated: ${totalDistance.toFixed(2)}km total`,
          { userId, totalDistance, routeCount: snapshot.size },
          "ProfileService"
        );

        onUpdate({ labels, data });
      },
      (error) => {
        logger.error(
          "Error subscribing to weekly activity",
          error,
          "ProfileService"
        );
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
    logger.info(
      "Subscribing to joined challenges",
      { userId },
      "ProfileService"
    );

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
          logger.debug(
            `Processing ${snapshot.size} joined challenges`,
            { userId, challengeCount: snapshot.size },
            "ProfileService"
          );

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

                  logger.debug(
                    `Challenge progress calculated: ${challenge.challengeTitle}`,
                    {
                      challengeId: challenge.id,
                      totalProgress,
                      routeCount: routeSnaps.size,
                    },
                    "ProfileService"
                  );
                }

                return {
                  ...challenge,
                  calculatedProgress: totalProgress,
                };
              }
            )
          );

          logger.success(
            `Joined challenges updated: ${challengesWithProgress.length}`,
            { userId, count: challengesWithProgress.length },
            "ProfileService"
          );

          onUpdate(challengesWithProgress);
        } catch (err) {
          logger.error(
            "Error calculating progress in subscription",
            err,
            "ProfileService"
          );
          onError(err instanceof Error ? err : new Error("Unknown error"));
        }
      },
      (error) => {
        logger.error(
          "Error subscribing to joined challenges",
          error,
          "ProfileService"
        );
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
    logger.info(
      "Subscribing to profile data (weekly + challenges)",
      { userId },
      "ProfileService"
    );

    let currentWeekly: WeeklyChartData | null = null;
    let currentChallenges: JoinedChallenge[] | null = null;

    const checkAndUpdate = () => {
      if (currentWeekly && currentChallenges) {
        logger.debug(
          "Profile data merged and ready",
          {
            userId,
            hasWeekly: !!currentWeekly,
            hasChallenges: !!currentChallenges,
            challengeCount: currentChallenges.length,
          },
          "ProfileService"
        );

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
      logger.debug(
        "Unsubscribing from profile data",
        { userId },
        "ProfileService"
      );
      unsubWeekly();
      unsubChallenges();
    };
  },

  // --- Keep Fetch Methods for Initial Server Side Props or non-realtime needs if necessary ---
  fetchWeeklyActivity: async (userId: string): Promise<WeeklyChartData> => {
    logger.info(
      "Fetching weekly activity (one-time)",
      { userId },
      "ProfileService"
    );

    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToWeeklyActivity(
        userId,
        (data) => {
          logger.success(
            "Weekly activity fetched",
            { userId },
            "ProfileService"
          );
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },

  fetchJoinedChallenges: async (userId: string): Promise<JoinedChallenge[]> => {
    logger.info(
      "Fetching joined challenges (one-time)",
      { userId },
      "ProfileService"
    );

    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToJoinedChallenges(
        userId,
        (data) => {
          logger.success(
            `Joined challenges fetched: ${data.length}`,
            { userId, count: data.length },
            "ProfileService"
          );
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },

  fetchProfileData: async (userId: string): Promise<ProfileData> => {
    logger.info(
      "Fetching profile data (one-time)",
      { userId },
      "ProfileService"
    );

    return new Promise((resolve, reject) => {
      const unsub = ProfileService.subscribeToProfileData(
        userId,
        (data) => {
          logger.success("Profile data fetched", { userId }, "ProfileService");
          resolve(data);
          unsub();
        },
        reject
      );
    });
  },
};
