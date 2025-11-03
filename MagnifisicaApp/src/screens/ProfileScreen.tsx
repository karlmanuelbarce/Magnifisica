import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore"; // Import Timestamp type
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../store/authstore";

// Get the screen width
const screenWidth = Dimensions.get("window").width;

// --- 1. UPDATE INTERFACE ---
interface JoinedChallenge {
  id: string; // This will be the challengeId
  challengeId: string;
  challengeTitle: string;
  challengeDescription: string;
  challengeStartDate: FirebaseFirestoreTypes.Timestamp;
  challengeEndDate: FirebaseFirestoreTypes.Timestamp;
  isCompleted: boolean;
  progress: number;
  joinedAt: FirebaseFirestoreTypes.Timestamp;
  targetMetre?: number; // <-- ADD THIS (make it optional for old data)
}

// Add formatDate helper (unchanged)
const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp) => {
  if (!timestamp) {
    return "N/A";
  }
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Configuration for the chart (unchanged)
const chartConfig = {
  // ... (unchanged)
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: "#007AFF",
  },
};

const ProfileScreen: React.FC = () => {
  // ... (all state hooks are unchanged) ...
  const [loading, setLoading] = useState(true);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [joinedChallenges, setJoinedChallenges] = useState<JoinedChallenge[]>(
    []
  );
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // --- fetchData function is unchanged ---
  // It will automatically pick up the new 'targetMetre' field
  // if it exists on the document.
  const fetchData = async () => {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Chart Data (unchanged)
      const labels: string[] = [];
      const data: number[] = [0, 0, 0, 0, 0, 0, 0];
      const dayStartTimestamps: Date[] = [];
      const today = new Date();
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
      const routesRef = firestore().collection("routes");
      const query = routesRef
        .where("userID", "==", user.uid)
        .where("createdAt", ">=", queryStartDate)
        .where("createdAt", "<=", today);
      const snapshot = await query.get();
      snapshot.forEach((doc) => {
        const route = doc.data();
        const routeDate = route.createdAt.toDate();
        const distanceKm = route.distanceMeters / 1000;
        for (let i = dayStartTimestamps.length - 1; i >= 0; i--) {
          if (routeDate >= dayStartTimestamps[i]) {
            data[i] += distanceKm;
            break;
          }
        }
      });
      setChartLabels(labels);
      setChartData(data);

      // 2. Fetch Joined Challenges (unchanged)
      const challengesList: JoinedChallenge[] = [];
      const challengesSnapshot = await firestore()
        .collection("participants")
        .doc(user.uid)
        .collection("joinedChallenges")
        .orderBy("joinedAt", "desc")
        .get();

      challengesSnapshot.forEach((doc) => {
        challengesList.push({
          id: doc.id,
          ...doc.data(),
        } as JoinedChallenge);
      });
      setJoinedChallenges(challengesList);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      Alert.alert(
        "Data Load Error",
        "There was an error loading your data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // ... (useFocusEffect, handleSignOut, dataForChart, renderChart are unchanged) ...
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  function handleSignOut() {
    logout();
    console.log("User signed out!");
  }

  const dataForChart = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData.length > 0 ? chartData : [0],
      },
    ],
    legend: ["Distance (km)"],
  };

  const renderChart = () => {
    // ... (unchanged)
    if (loading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    const noData = chartData.every((item) => item === 0);
    if (noData) {
      return (
        <Text style={styles.noDataText}>Record a run to see your stats!</Text>
      );
    }
    return (
      <LineChart
        data={dataForChart}
        width={screenWidth - 72}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    );
  };

  // --- 2. UPDATE renderChallenges ---
  const renderChallenges = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    if (joinedChallenges.length === 0) {
      return (
        <Text style={styles.noDataText}>
          You haven't joined any challenges yet.
        </Text>
      );
    }
    return (
      <View>
        {joinedChallenges.map((challenge, index) => {
          // --- Logic to display progress ---
          let progressDisplay;
          if (challenge.isCompleted) {
            progressDisplay = (
              <Text style={styles.challengeStatusComplete}>Completed</Text>
            );
          } else if (challenge.targetMetre) {
            // Check if targetMetre exists (for new data)
            const progressKm = (challenge.progress / 1000).toFixed(1);
            const targetKm = (challenge.targetMetre / 1000).toFixed(1);
            progressDisplay = (
              <Text
                style={styles.challengeStatusActive}
              >{`${progressKm} / ${targetKm} km`}</Text>
            );
          } else {
            // Fallback for old data without targetMetre
            progressDisplay = (
              <Text style={styles.challengeStatusActive}>In Progress</Text>
            );
          }

          return (
            <View
              key={challenge.id}
              style={[
                styles.challengeRow,
                index === joinedChallenges.length - 1 &&
                  styles.lastChallengeRow,
              ]}
            >
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeName}>
                  {challenge.challengeTitle}
                </Text>
                <Text style={styles.challengeDates}>
                  Ends: {formatDate(challenge.challengeEndDate)}
                </Text>
              </View>
              <View style={styles.challengeProgress}>
                {/* Use the new progressDisplay variable */}
                {progressDisplay}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // --- Render block (unchanged) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* 1. Header */}
          <Text style={styles.title}>Profile</Text>
          {user && <Text style={styles.userEmail}>{user.email}</Text>}

          {/* 2. Activity Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Activity</Text>
            <View style={styles.chartContainer}>{renderChart()}</View>
          </View>

          {/* 3. My Challenges Card */}
          <Text style={styles.sectionTitle}>My Challenges</Text>
          <View style={styles.card}>{renderChallenges()}</View>

          {/* 4. Account Card */}
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.buttonRow} onPress={handleSignOut}>
              <Ionicons
                name="log-out-outline"
                size={24}
                color={theme.danger}
                style={styles.buttonIcon}
              />
              <Text style={styles.signOutText}>Sign Out</Text>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles (unchanged) ---
const theme = {
  // ... (unchanged)
  primary: "#007AFF",
  background: "#F4F5F7",
  card: "#FFFFFF",
  text: "#111111",
  textSecondary: "#666666",
  danger: "#FF3B30",
  success: "#34C759",
};

const styles = StyleSheet.create({
  // ... (all other styles are unchanged)
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 16,
  },
  chartContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
    paddingRight: 35,
  },
  noDataText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  signOutText: {
    color: theme.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  challengeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  lastChallengeRow: {
    borderBottomWidth: 0,
  },
  challengeInfo: {
    flex: 1,
    marginRight: 10,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.text,
    marginBottom: 4,
  },
  challengeDates: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  challengeProgress: {
    alignItems: "flex-end",
  },
  challengeStatusActive: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.primary,
  },
  challengeStatusComplete: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.success,
  },
});

export default ProfileScreen;
