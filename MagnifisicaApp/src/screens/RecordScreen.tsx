import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  PermissionsAndroid,
  Platform,
  Alert,
  TouchableOpacity, // Import TouchableOpacity
  SafeAreaView, // Import SafeAreaView
  Modal, // Import Modal
} from "react-native";
import MapLibreGL, { LineLayerStyle } from "@maplibre/maplibre-react-native";
import Geolocation, { GeoPosition } from "react-native-geolocation-service";
import Ionicons from "react-native-vector-icons/Ionicons"; // Import Icons

// --- Firebase Imports ---
import firestore from "@react-native-firebase/firestore";

// --- Zustand Store Import ---
import { useAuthStore } from "../store/authstore"; // Corrected path

// --- Haversine formula (with dLon typo corrected) ---
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
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false); // Modal state
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Timer state

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

  // --- Timer Effect ---
  useEffect(() => {
    if (recording) {
      // Start timer
      timerInterval.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      // Stop timer
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      // Cleanup
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [recording]);

  // --- Helper to format time ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // --- Helper to reset all route state ---
  const resetRoute = () => {
    setRouteCoords([]);
    setStartPoint(null);
    setEndPoint(null);
    setTotalDistance(0);
    setElapsedTime(0);
    lastPointRef.current = null;
  };

  // --- Updated startRecording ---
  const handleStartRecording = () => {
    resetRoute(); // Clear any previous route data
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

  // --- Updated stopRecording (now shows modal) ---
  const handleStopRecording = () => {
    setRecording(false);
    recordingRef.current = false;

    if (routeCoords.length > 0) {
      setEndPoint(routeCoords[routeCoords.length - 1]);
    }

    // Check if route is valid, otherwise alert and reset
    if (totalDistance === 0 || !startPoint) {
      Alert.alert(
        "Route too short",
        "No distance was recorded. Route will not be saved."
      );
      resetRoute(); // Clear the map
      return;
    }

    // Valid route, show confirmation modal
    setIsModalVisible(true);
  };

  // --- NEW: Handle saving the route from the modal ---
  const handleSaveRoute = async () => {
    if (!user || !startPoint || !endPoint) {
      Alert.alert("Error", "Could not save route. User or route data missing.");
      return;
    }

    try {
      const routesCollection = firestore().collection("routes");
      await routesCollection.add({
        userID: user.uid,
        distanceMeters: totalDistance,
        durationSeconds: elapsedTime,
        createdAt: firestore.FieldValue.serverTimestamp(),
        startPoint: new firestore.GeoPoint(startPoint[1], startPoint[0]),
        endPoint: new firestore.GeoPoint(endPoint[1], endPoint[0]),
        routePoints: routeCoords.map(
          (coord) => new firestore.GeoPoint(coord[1], coord[0])
        ),
      });
      Alert.alert("Success", "Your route has been saved!");
    } catch (error) {
      console.error("Failed to save route:", error);
      Alert.alert("Save Failed", "Could not save your route.");
    } finally {
      setIsModalVisible(false);
      resetRoute(); // Clear the map after saving
    }
  };

  // --- NEW: Handle discarding the route from the modal ---
  const handleDiscardRoute = () => {
    setIsModalVisible(false);
    resetRoute(); // Clear the map
  };

  // Loading screen (unchanged)
  if (!location) {
    return (
      <View style={styles.page}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  // --- RENDER BLOCK (Updated with new UI) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`}
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
          key={location.timestamp} // Force re-render
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
              properties: {}, // <-- ADD THIS EMPTY OBJECT
            }}
          >
            <MapLibreGL.LineLayer id="routeLineLayer" style={lineLayerStyle} />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* --- New Control Panel --- */}
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
            color={theme.white}
          />
        </TouchableOpacity>
      </View>

      {/* --- New Confirmation Modal --- */}
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

// --- New Theme & Styles ---
const theme = {
  primary: "#007AFF",
  danger: "#FF3B30",
  white: "#FFFFFF",
  background: "#F4F5F7",
  textPrimary: "#111111",
  textSecondary: "#666666",
  green: "#34C759",
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
    // (No longer used as root, but kept for loading)
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
  // Control Panel
  controlPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  stopButton: {
    backgroundColor: theme.danger,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "85%",
    backgroundColor: theme.white,
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
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  modalButtonTextDiscard: {
    color: theme.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
  modalButtonSave: {
    backgroundColor: theme.green,
    marginLeft: 10,
  },
  modalButtonTextSave: {
    color: theme.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default RecordScreen;
