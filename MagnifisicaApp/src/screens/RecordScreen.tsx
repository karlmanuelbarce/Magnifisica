import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Button,
  Text,
  PermissionsAndroid,
  Platform,
} from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import Geolocation, { GeoPosition } from "react-native-geolocation-service";

// Haversine formula (unchanged)
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

// --- NEW: Permission Helper Function ---
const requestLocationPermission = async () => {
  if (Platform.OS === "ios") {
    // requestAuthorization returns a promise with the new status
    const auth = await Geolocation.requestAuthorization("whenInUse");
    if (auth === "granted") {
      return true;
    }
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
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        alert("Permission to access location was denied");
        return false;
      }
    } catch (err) {
      console.warn("Permission request error:", err);
      return false;
    }
  }
  return false; // Should not happen
};

const RecordScreen = () => {
  // Changed: Use GeoPosition type from the new library
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);
  const MAPTILER_API_KEY = "TwX5oDLyc1NqQdNGe184";

  const recordingRef = useRef(recording);
  const lastPointRef = useRef<[number, number] | null>(null);
  // Changed: Use a ref to store the numeric watcher ID
  const watchId = useRef<number | null>(null);

  // Handle all location tracking in useEffect
  useEffect(() => {
    (async () => {
      // Changed: Use new permission helper
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return; // Don't proceed without permission
      }

      // Changed: getCurrentPosition is now callback-based
      Geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
        },
        (error) => {
          console.error("Initial location error:", error);
          alert("Could not get initial location.");
        },
        // Options
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      // Changed: watchPosition is callback-based and returns a numeric ID
      watchId.current = Geolocation.watchPosition(
        (position) => {
          const newCoord: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          // Always update the current location
          setLocation(position);

          // Check the ref to see if we should be recording
          if (recordingRef.current) {
            setRouteCoords((prev) => [...prev, newCoord]);

            // Check .current for the ref
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
        (error) => {
          console.error("WatchPosition Error:", error);
        },
        // Options
        {
          accuracy: { android: "high", ios: "best" }, // Adjusted accuracy options
          enableHighAccuracy: true,
          distanceFilter: 0, // Get all updates
          interval: 1000, // Every 1 second
          fastestInterval: 500, // At most every 0.5 seconds
        }
      );
    })();

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const startRecording = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const coord: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setStartPoint(coord);
        setRouteCoords([coord]); // Start the route with the current location
        lastPointRef.current = coord;
        setTotalDistance(0);
        setEndPoint(null);

        // Set state and ref immediately
        recordingRef.current = true;
        setRecording(true);
      },
      (error) => {
        alert("Could not get current location to start recording.");
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const stopRecording = () => {
    // Set state and ref immediately
    setRecording(false);
    recordingRef.current = false;
    if (routeCoords.length > 0) {
      setEndPoint(routeCoords[routeCoords.length - 1]);
    }
  };

  if (!location) {
    return (
      <View style={styles.page}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`}
      >
        <MapLibreGL.Camera
          followUserLocation={!recording} // Follow user when not recording
          followZoomLevel={3}
          centerCoordinate={
            recording
              ? undefined
              : [location.coords.longitude, location.coords.latitude]
          } // Only center manually if not following
          zoomLevel={recording ? undefined : 1}
        />

        {/* Current Location Marker */}
        <MapLibreGL.PointAnnotation
          id="currentLocation"
          coordinate={[location.coords.longitude, location.coords.latitude]}
        >
          <View style={styles.marker} />
        </MapLibreGL.PointAnnotation>

        {/* Route line (unchanged) */}
        {routeCoords.length > 1 && (
          <MapLibreGL.ShapeSource
            id="routeLine"
            shape={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeCoords,
              },
              properties: {},
            }}
          >
            <MapLibreGL.LineLayer
              id="routeLineLayer"
              style={{
                lineColor: "#FF6600",
                lineWidth: 4,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      <View style={styles.controls}>
        {!recording ? (
          <Button title="Start Recording" onPress={startRecording} />
        ) : (
          <Button title="Stop Recording" onPress={stopRecording} />
        )}
        {!recording && (
          <Text style={styles.distanceText}>
            Distance: {(totalDistance / 1000).toFixed(2)} km
          </Text>
        )}
        {startPoint && (
          <Text style={styles.meta}>
            Start: {startPoint[1].toFixed(5)}, {startPoint[0].toFixed(5)}
          </Text>
        )}
        {endPoint && (
          <Text style={styles.meta}>
            End: {endPoint[1].toFixed(5)}, {endPoint[0].toFixed(5)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { flex: 1, width: "100%" }, // Ensure map takes full width
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff3300",
    borderColor: "#fff",
    borderWidth: 3,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 10,
    padding: 10,
  },
  distanceText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: "#444",
  },
});

export default RecordScreen;
