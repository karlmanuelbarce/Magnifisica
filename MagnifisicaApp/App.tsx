import { StyleSheet, Text, View } from "react-native";

import RootStackNavigator from "./src/navigations/RootStackNAvigator";
export default function App() {
  return <RootStackNavigator />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
