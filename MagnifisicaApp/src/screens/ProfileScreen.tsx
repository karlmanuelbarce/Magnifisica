import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { LineChart } from "react-native-chart-kit";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../store/authstore";
import { useProfileData } from "../hooks/userProfile";

const screenWidth = Dimensions.get("window").width;

// --- Utility Functions ---
const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp) => {
  if (!timestamp) return "N/A";
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// --- Theme ---
const theme = {
  primary: "#39FF14",
  background: "#121212",
  card: "#1E1E1E",
  text: "#E0E0E0",
  textSecondary: "#888888",
  danger: "#FF3B30",
  success: "#34C759",
};

// --- Chart Configuration ---
const chartConfig = {
  backgroundColor: theme.card,
  backgroundGradientFrom: theme.card,
  backgroundGradientTo: theme.card,
  color: (opacity = 1) => `rgba(57, 255, 20, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(224, 224, 224, ${opacity})`,
  strokeWidth: 2,
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: theme.primary,
  },
};

const ProfileScreen: React.FC = () => {
  // Auth Store
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Custom Query Hook - All data fetching logic is abstracted
  const {
    data: profileData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProfileData(user?.uid);

  // Extract data with defaults
  const chartLabels = profileData?.weeklyActivity.labels || [];
  const chartData = profileData?.weeklyActivity.data || [];
  const joinedChallenges = profileData?.challenges || [];

  // --- Event Handlers ---
  const handleSignOut = () => {
    logout();
    console.log("User signed out!");
  };

  const handleRefresh = () => {
    refetch();
  };

  // --- Chart Rendering ---
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
    if (isLoading) {
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

  // --- Challenge Rendering ---
  const renderChallenges = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    if (joinedChallenges.length === 0) {
      return (
        <Text style={styles.noDataText}>
          You haven&#39;t joined any challenges yet.
        </Text>
      );
    }
    return (
      <View>
        {joinedChallenges.map((challenge, index) => {
          const progressInMeters = challenge.calculatedProgress || 0;
          let progressDisplay;

          if (challenge.isCompleted) {
            progressDisplay = (
              <Text style={styles.challengeStatusComplete}>Completed</Text>
            );
          } else if (
            challenge.targetMetre &&
            progressInMeters >= challenge.targetMetre
          ) {
            progressDisplay = (
              <Text style={styles.challengeStatusComplete}>Completed</Text>
            );
          } else if (challenge.targetMetre) {
            const progressKm = (progressInMeters / 1000).toFixed(1);
            const targetKm = (challenge.targetMetre / 1000).toFixed(1);
            progressDisplay = (
              <Text
                style={styles.challengeStatusActive}
              >{`${progressKm} / ${targetKm} km`}</Text>
            );
          } else {
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
              <View style={styles.challengeProgress}>{progressDisplay}</View>
            </View>
          );
        })}
      </View>
    );
  };

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          {user && <Text style={styles.userEmail}>{user.email}</Text>}

          {/* Error State */}
          {isError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load data</Text>
              <TouchableOpacity
                onPress={handleRefresh}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weekly Activity Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Activity</Text>
            <View style={styles.chartContainer}>{renderChart()}</View>
          </View>

          {/* Challenges Section */}
          <Text style={styles.sectionTitle}>My Challenges</Text>
          <View style={styles.card}>{renderChallenges()}</View>

          {/* Account Section */}
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

// --- Styles ---
const styles = StyleSheet.create({
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
  errorContainer: {
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  errorText: {
    color: theme.danger,
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: theme.background,
    fontWeight: "600",
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
    borderBottomColor: "#333333",
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
