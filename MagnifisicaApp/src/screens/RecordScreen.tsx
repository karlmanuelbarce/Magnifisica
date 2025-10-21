import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Button, Text } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";

// Haversine formula
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

const RecordScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);

  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);

  const lastPointRef = useRef<[number, number] | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    const loc = await Location.getCurrentPositionAsync({});
    const coord: [number, number] = [loc.coords.longitude, loc.coords.latitude];

    setStartPoint(coord);
    setRouteCoords([coord]);
    lastPointRef.current = coord;
    setTotalDistance(0);
    setEndPoint(null);
    setRecording(true);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 0,
        timeInterval: 5000,
      },
      (loc) => {
        const newCoord: [number, number] = [
          loc.coords.longitude,
          loc.coords.latitude,
        ];
        setLocation(loc);
        setRouteCoords((prev) => [...prev, newCoord]);

        if (lastPointRef.current) {
          const distance = haversineDistance(lastPointRef.current, newCoord);
          setTotalDistance((prev) => prev + distance);
        }

        lastPointRef.current = newCoord;
      }
    );
  };

  const stopRecording = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (routeCoords.length > 0) {
      setEndPoint(routeCoords[routeCoords.length - 1]);
    }

    setRecording(false);
  };

  if (!location) return <Text>Loading location...</Text>;

  return (
    <View style={styles.page}>
      <MapLibreGL.MapView style={styles.map}>
        <MapLibreGL.Camera
          zoomLevel={5}
          centerCoordinate={[
            location.coords.longitude,
            location.coords.latitude,
          ]}
        />

        {/* Current Location Marker */}
        <MapLibreGL.PointAnnotation
          id="currentLocation"
          coordinate={[location.coords.longitude, location.coords.latitude]}
        >
          <View style={styles.marker} />
        </MapLibreGL.PointAnnotation>

        {/* Route line */}
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
  page: { flex: 1 },
  map: { flex: 1 },
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
