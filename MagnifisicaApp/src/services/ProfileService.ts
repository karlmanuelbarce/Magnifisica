import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
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

export const ProfileService = {
  /**
   * Fetches the last 7 days of running activity for chart display
   */
  fetchWeeklyActivity: async (userId: string): Promise<WeeklyChartData> => {
    try {
      const labels: string[] = [];
      const data: number[] = [0, 0, 0, 0, 0, 0, 0];
      const dayStartTimestamps: Date[] = [];
      const today = new Date();

      // Build date labels and timestamps
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

      // Query routes for the week
      const routesRef = collection(db, "routes");
      const routesQuery = query(
        routesRef,
        where("userID", "==", userId),
        where("createdAt", ">=", queryStartDate),
        where("createdAt", "<=", today)
      );
      const routesSnapshot = await getDocs(routesQuery);

      // Process routes and aggregate by day
      routesSnapshot.forEach(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const route = doc.data() as {
            createdAt: FirebaseFirestoreTypes.Timestamp;
            distanceMeters: number;
          };
          const routeDate = route.createdAt.toDate();
          const distanceKm = route.distanceMeters / 1000;

          // Find which day this route belongs to
          for (let i = dayStartTimestamps.length - 1; i >= 0; i--) {
            if (routeDate >= dayStartTimestamps[i]) {
              data[i] += distanceKm;
              break;
            }
          }
        }
      );

      return { labels, data };
    } catch (error) {
      console.error("Error fetching weekly activity:", error);
      throw new Error("FETCH_WEEKLY_ACTIVITY_FAILED");
    }
  },

  /**
   * Fetches all joined challenges with calculated progress
   */
  fetchJoinedChallenges: async (userId: string): Promise<JoinedChallenge[]> => {
    try {
      // Query joined challenges
      const challengesRef = collection(
        db,
        "participants",
        userId,
        "joinedChallenges"
      );
      const challengesQuery = query(challengesRef, orderBy("joinedAt", "desc"));
      const challengesSnapshot = await getDocs(challengesQuery);

      // Calculate progress for each challenge
      const challengesWithProgress = await Promise.all(
        challengesSnapshot.docs.map(
          async (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const challenge = {
              id: doc.id,
              ...doc.data(),
            } as JoinedChallenge;

            let totalProgress = 0;

            // Only calculate progress for incomplete challenges
            if (!challenge.isCompleted) {
              const challengeRoutesQuery = query(
                collection(db, "routes"),
                where("userID", "==", userId),
                where("createdAt", ">=", challenge.challengeStartDate),
                where("createdAt", "<=", challenge.challengeEndDate)
              );
              const challengeRoutesSnapshot = await getDocs(
                challengeRoutesQuery
              );

              challengeRoutesSnapshot.forEach(
                (routeDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
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

      return challengesWithProgress;
    } catch (error) {
      console.error("Error fetching joined challenges:", error);
      throw new Error("FETCH_CHALLENGES_FAILED");
    }
  },

  /**
   * Fetches all profile data (weekly activity + challenges)
   */
  fetchProfileData: async (userId: string) => {
    try {
      const [weeklyActivity, challenges] = await Promise.all([
        ProfileService.fetchWeeklyActivity(userId),
        ProfileService.fetchJoinedChallenges(userId),
      ]);

      return {
        weeklyActivity,
        challenges,
      };
    } catch (error) {
      console.error("Error fetching profile data:", error);
      throw error;
    }
  },
};
