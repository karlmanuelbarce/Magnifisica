import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  GeoPoint,
  serverTimestamp,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

const db = getFirestore();

export interface RouteData {
  id?: string;
  userID: string;
  distanceMeters: number;
  durationSeconds: number;
  createdAt: FirebaseFirestoreTypes.Timestamp | Date;
  startPoint: { latitude: number; longitude: number };
  endPoint: { latitude: number; longitude: number };
  routePoints: Array<{ latitude: number; longitude: number }>;
}

export interface SaveRouteParams {
  userId: string;
  distanceMeters: number;
  durationSeconds: number;
  startPoint: [number, number]; // [longitude, latitude]
  endPoint: [number, number];
  routePoints: Array<[number, number]>;
}

export const RouteService = {
  /**
   * Saves a recorded route to Firestore
   */
  saveRoute: async (params: SaveRouteParams): Promise<string> => {
    try {
      const {
        userId,
        distanceMeters,
        durationSeconds,
        startPoint,
        endPoint,
        routePoints,
      } = params;

      // Validate data
      if (!userId) {
        throw new Error("User ID is required");
      }
      if (distanceMeters <= 0) {
        throw new Error("Distance must be greater than 0");
      }
      if (!startPoint || !endPoint) {
        throw new Error("Start and end points are required");
      }

      const routesCollection = collection(db, "routes");
      const docRef = await addDoc(routesCollection, {
        userID: userId,
        distanceMeters,
        durationSeconds,
        createdAt: serverTimestamp(),
        startPoint: new GeoPoint(startPoint[1], startPoint[0]),
        endPoint: new GeoPoint(endPoint[1], endPoint[0]),
        routePoints: routePoints.map(
          (coord) => new GeoPoint(coord[1], coord[0])
        ),
      });

      console.log("Route saved successfully with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error saving route:", error);
      throw new Error("SAVE_ROUTE_FAILED");
    }
  },

  /**
   * Fetches all routes for a specific user
   */
  fetchUserRoutes: async (userId: string): Promise<RouteData[]> => {
    try {
      const routesRef = collection(db, "routes");
      const q = query(
        routesRef,
        where("userID", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);

      const routes: RouteData[] = querySnapshot.docs.map(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          return {
            id: doc.id,
            userID: data.userID,
            distanceMeters: data.distanceMeters,
            durationSeconds: data.durationSeconds,
            createdAt: data.createdAt,
            startPoint: {
              latitude: data.startPoint.latitude,
              longitude: data.startPoint.longitude,
            },
            endPoint: {
              latitude: data.endPoint.latitude,
              longitude: data.endPoint.longitude,
            },
            routePoints: data.routePoints.map((point: any) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            })),
          } as RouteData;
        }
      );

      return routes;
    } catch (error) {
      console.error("Error fetching user routes:", error);
      throw new Error("FETCH_ROUTES_FAILED");
    }
  },

  /**
   * Fetches the most recent routes for a user
   */
  fetchRecentRoutes: async (
    userId: string,
    limitCount: number = 10
  ): Promise<RouteData[]> => {
    try {
      const routesRef = collection(db, "routes");
      const q = query(
        routesRef,
        where("userID", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);

      const routes: RouteData[] = querySnapshot.docs.map(
        (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          return {
            id: doc.id,
            userID: data.userID,
            distanceMeters: data.distanceMeters,
            durationSeconds: data.durationSeconds,
            createdAt: data.createdAt,
            startPoint: {
              latitude: data.startPoint.latitude,
              longitude: data.startPoint.longitude,
            },
            endPoint: {
              latitude: data.endPoint.latitude,
              longitude: data.endPoint.longitude,
            },
            routePoints: data.routePoints.map((point: any) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            })),
          } as RouteData;
        }
      );

      return routes;
    } catch (error) {
      console.error("Error fetching recent routes:", error);
      throw new Error("FETCH_RECENT_ROUTES_FAILED");
    }
  },

  /**
   * Calculates total statistics for a user's routes
   */
  calculateUserStats: async (
    userId: string
  ): Promise<{
    totalDistance: number;
    totalDuration: number;
    totalRoutes: number;
    averageDistance: number;
    averageDuration: number;
  }> => {
    try {
      const routes = await RouteService.fetchUserRoutes(userId);

      const totalDistance = routes.reduce(
        (sum, route) => sum + route.distanceMeters,
        0
      );
      const totalDuration = routes.reduce(
        (sum, route) => sum + route.durationSeconds,
        0
      );
      const totalRoutes = routes.length;

      return {
        totalDistance,
        totalDuration,
        totalRoutes,
        averageDistance: totalRoutes > 0 ? totalDistance / totalRoutes : 0,
        averageDuration: totalRoutes > 0 ? totalDuration / totalRoutes : 0,
      };
    } catch (error) {
      console.error("Error calculating user stats:", error);
      throw new Error("CALCULATE_STATS_FAILED");
    }
  },
};
