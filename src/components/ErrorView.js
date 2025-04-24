// components/ErrorView.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const ErrorView = ({
  message = "An error occurred.",
  onRetry,
  retryButtonText = "Retry",
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={60} color="#d32f2f" />
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>{retryButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: "#6B8E23",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default ErrorView;
