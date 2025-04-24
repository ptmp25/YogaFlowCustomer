// components/LoadingIndicator.js
import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

const LoadingIndicator = ({ message = "Loading..." }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6B8E23" />
      <Text style={styles.message}>{message}</Text>
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
    marginTop: 10,
    fontSize: 16,
    color: "#6B8E23",
  },
});

export default LoadingIndicator;
