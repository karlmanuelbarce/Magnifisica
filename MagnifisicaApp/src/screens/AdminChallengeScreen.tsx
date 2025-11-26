import React, { useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

const db = getFirestore();

const AdminChallengeScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetMetre, setTargetMetre] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateChallenge = async () => {
    // Validation
    if (!title || !description || !targetMetre || !startDate || !endDate) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const targetMetreNum = parseInt(targetMetre);
    if (isNaN(targetMetreNum) || targetMetreNum <= 0) {
      Alert.alert("Error", "Target distance must be a valid positive number.");
      return;
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert(
        "Error",
        "Invalid date format. Please use YYYY-MM-DD format."
      );
      return;
    }

    if (end <= start) {
      Alert.alert("Error", "End date must be after start date.");
      return;
    }

    setIsLoading(true);

    try {
      const challengeData = {
        title: title.trim(),
        description: description.trim(),
        TargetMetre: targetMetreNum,
        startDate: start,
        endDate: end,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "Challenge"), challengeData);

      Alert.alert("Success", "Challenge created successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setTargetMetre("");
      setStartDate("");
      setEndDate("");
    } catch (error) {
      console.error("Error creating challenge:", error);
      Alert.alert(
        "Error",
        "Failed to create challenge. Please check your permissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create New Challenge</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Marathon Challenge"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          editable={!isLoading}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Challenge description..."
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!isLoading}
        />

        <Text style={styles.label}>Target Distance (meters)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2000"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={targetMetre}
          onChangeText={setTargetMetre}
          editable={!isLoading}
        />

        <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2025-11-05"
          placeholderTextColor="#888"
          value={startDate}
          onChangeText={setStartDate}
          editable={!isLoading}
        />

        <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2025-11-09"
          placeholderTextColor="#888"
          value={endDate}
          onChangeText={setEndDate}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreateChallenge}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Text style={styles.buttonText}>Create Challenge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollContainer: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#E0E0E0",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#B0B0B0",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#222222",
    color: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#39FF14",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: "#1E7D0A",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#121212",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default AdminChallengeScreen;
