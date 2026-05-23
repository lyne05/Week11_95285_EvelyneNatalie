import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Alert, Button, Platform, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (!Device.isDevice) {
    Alert.alert("Warning", "Push notification needs a physical device.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Error", "Notification permission is required.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token.data;
};

const Index = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    const setupNotification = async () => {
      const token = await registerForPushNotificationsAsync();

      if (!token) return;

      setExpoPushToken(token);

      const { error } = await supabase.from("notification_tokens").upsert(
        {
          expo_push_token: token,
          device_name: Device.deviceName,
        },
        {
          onConflict: "expo_push_token",
        },
      );

      if (error) {
        console.log(error);
        Alert.alert("Error", error.message);
      }
    };

    setupNotification();
  }, []);

  const showLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Success",
        body: "Data has been added to Supabase.",
      },
      trigger: null,
    });
  };

  const addData = async () => {
    try {
      const { error } = await supabase.from("users").insert([
        {
          first: "Ada",
          last: "Lovelace",
          birth: 1815,
        },
      ]);

      if (error) throw error;

      await showLocalNotification();

      Alert.alert("Success", "Data added successfully.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to add data.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase connection test</Text>

      <Text style={styles.subtitle}>Week 12 Notification with Supabase</Text>

      {expoPushToken && (
        <Text style={styles.tokenText}>
          Notification token saved to Supabase.
        </Text>
      )}

      <Button title="Add Data" onPress={addData} />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f7fb",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: "#4b5563",
  },
  tokenText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    color: "green",
  },
});
