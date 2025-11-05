import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  PermissionsAndroid,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import MapLibreGL, { LineLayerStyle } from "@maplibre/maplibre-react-native";
import Geolocation, { GeoPosition } from "react-native-geolocation-service";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authstore";

// --- 1. Import new modular functions ---
import firestore, { // Keep default for types
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import {
  getFirestore,
  collection,
  addDoc,
  GeoPoint, // <-- FIX 1: Import GeoPoint
  serverTimestamp, // <-- FIX 2: Import serverTimestamp
} from "@react-native-firebase/firestore";

// --- 2. Get Firestore instance ---
const db = getFirestore();

// --- Haversine formula (unchanged) ---
const haversineDistance = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // meters
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Permission Helper Function (unchanged)
const requestLocationPermission = async () => {
  if (Platform.OS === "ios") {
    const auth = await Geolocation.requestAuthorization("whenInUse");
    if (auth === "granted") return true;
    alert("Permission to access location was denied");
    return false;
  }
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "This app needs access to your location to record routes.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
      else {
        alert("Permission to access location was denied");
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return false;
};

// --- Main Component ---
const RecordScreen = () => {
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const MAPTILER_API_KEY = "LROySEFJDL5ogef2ZsWI";

  const user = useAuthStore((state) => state.user);
  const recordingRef = useRef(recording);
  const lastPointRef = useRef<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // --- Location Watcher Effect (unchanged) ---
  useEffect(() => {
    (async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => Alert.alert("Could not get initial location."),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      watchId.current = Geolocation.watchPosition(
        (position) => {
          const newCoord: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setLocation(position);

          if (recordingRef.current) {
            setRouteCoords((prev) => [...prev, newCoord]);
            if (lastPointRef.current) {
              const distance = haversineDistance(
                lastPointRef.current,
                newCoord
              );
              setTotalDistance((prev) => prev + distance);
            }
            lastPointRef.current = newCoord;
          }
        },
        (error) => console.error("WatchPosition Error:", error),
        {
          accuracy: { android: "high", ios: "best" },
          enableHighAccuracy: true,
          distanceFilter: 0,
          interval: 1000,
          fastestInterval: 500,
        }
      );
    })();

    return () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  // --- Timer Effect (unchanged) ---
  useEffect(() => {
    if (recording) {
      timerInterval.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [recording]);

  // --- Helper to format time (unchanged) ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // --- Helper to reset all route state (unchanged) ---
  const resetRoute = () => {
    setRouteCoords([]);
    setStartPoint(null);
    setEndPoint(null);
    setTotalDistance(0);
    setElapsedTime(0);
    lastPointRef.current = null;
  };

  // --- Updated startRecording (unchanged) ---
  const handleStartRecording = () => {
    resetRoute();
    Geolocation.getCurrentPosition(
      (position) => {
        const coord: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setStartPoint(coord);
        setRouteCoords([coord]);
        lastPointRef.current = coord;

        recordingRef.current = true;
        setRecording(true);
      },
      (error) => Alert.alert("Could not get current location to start."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // --- Updated stopRecording (unchanged) ---
  const handleStopRecording = () => {
    setRecording(false);
    recordingRef.current = false;

    if (routeCoords.length > 0) {
      setEndPoint(routeCoords[routeCoords.length - 1]);
    }

    if (totalDistance === 0 || !startPoint) {
      Alert.alert(
        "Route too short",
        "No distance was recorded. Route will not be saved."
      );
      resetRoute();
      return;
    }

    setIsModalVisible(true);
  };

  // --- 3. Refactored handleSaveRoute ---
  const handleSaveRoute = async () => {
    if (!user || !startPoint || !endPoint) {
      Alert.alert("Error", "Could not save route. User or route data missing.");
      return;
    }
    try {
      const routesCollection = collection(db, "routes");
      await addDoc(routesCollection, {
        userID: user.uid,
        distanceMeters: totalDistance,
        durationSeconds: elapsedTime,
        createdAt: serverTimestamp(), // <-- FIX 3: Use modular function
        startPoint: new GeoPoint(startPoint[1], startPoint[0]), // <-- FIX 4: Use modular class
        endPoint: new GeoPoint(endPoint[1], endPoint[0]), // <-- FIX 4: Use modular class
        routePoints: routeCoords.map(
          (coord) => new GeoPoint(coord[1], coord[0]) // <-- FIX 4: Use modular class
        ),
      });
      Alert.alert("Success", "Your route has been saved!");
    } catch (error) {
      console.error("Failed to save route:", error);
      Alert.alert("Save Failed", "Could not save your route.");
    } finally {
      setIsModalVisible(false);
      resetRoute();
    }
  };

  // --- Handle discarding the route (unchanged) ---
  const handleDiscardRoute = () => {
    setIsModalVisible(false);
    resetRoute();
  };

  // Loading screen (unchanged)
  if (!location) {
    return (
      <View style={[styles.page, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
          Finding location...
        </Text>
      </View>
    );
  }

  // --- RENDER BLOCK (Unchanged) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={`https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`}
      >
        <MapLibreGL.Camera
          centerCoordinate={[
            location.coords.longitude,
            location.coords.latitude,
          ]}
          zoomLevel={15}
        />
        <MapLibreGL.PointAnnotation
          id="currentLocation"
          key={location.timestamp}
          coordinate={[location.coords.longitude, location.coords.latitude]}
        >
          <View style={styles.marker} />
        </MapLibreGL.PointAnnotation>

        {routeCoords.length > 1 && (
          <MapLibreGL.ShapeSource
            id="routeLine"
            shape={{
              type: "Feature",
              geometry: { type: "LineString", coordinates: routeCoords },
              properties: {},
            }}
          >
            <MapLibreGL.LineLayer id="routeLineLayer" style={lineLayerStyle} />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* --- Control Panel --- */}
      <View style={styles.controlPanel}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {(totalDistance / 1000).toFixed(2)} km
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.recordButton, recording && styles.stopButton]}
          onPress={recording ? handleStopRecording : handleStartRecording}
        >
          <Ionicons
            name={recording ? "stop" : "play"}
            size={32}
            color={recording ? theme.white : theme.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* --- Confirmation Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={handleDiscardRoute}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Save Route?</Text>

            <View style={styles.modalStats}>
              <Text style={styles.modalStatLabel}>Distance:</Text>
              <Text style={styles.modalStatValue}>
                {(totalDistance / 1000).toFixed(2)} km
              </Text>
            </View>
            <View style={styles.modalStats}>
              <Text style={styles.modalStatLabel}>Time:</Text>
              <Text style={styles.modalStatValue}>
                {formatTime(elapsedTime)}
              </Text>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDiscard]}
                onPress={handleDiscardRoute}
              >
                <Text style={styles.modalButtonTextDiscard}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveRoute}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- Theme & Styles (Unchanged) ---
const theme = {
  primary: "#39FF14",
  success: "#34C759",
  danger: "#FF3B30",
  white: "#FFFFFF",
  background: "#121212",
  card: "#1E1E1E",
  textPrimary: "#E0E0E0",
  textSecondary: "#888888",
  textOnPrimary: "#121212",
};

const lineLayerStyle: LineLayerStyle = {
  lineColor: theme.primary,
  lineWidth: 4,
  lineCap: "round",
  lineJoin: "round",
  lineOpacity: 0.8,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  page: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.primary,
    borderColor: theme.white,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  controlPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  stopButton: {
    backgroundColor: theme.danger,
    shadowColor: theme.danger,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    width: "85%",
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: theme.textPrimary,
  },
  modalStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  modalStatLabel: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    alignItems: "center",
  },
  modalButtonDiscard: {
    backgroundColor: "#333333",
    marginRight: 10,
  },
  modalButtonTextDiscard: {
    color: theme.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
  modalButtonSave: {
    backgroundColor: theme.success,
    marginLeft: 10,
  },
  modalButtonTextSave: {
    color: theme.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default RecordScreen;
