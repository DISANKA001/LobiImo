import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth";
import { colors, typography } from "@/src/theme";

/**
 * PUBLIC browseable tabs — anonymous users can navigate.
 * Owners / Admins are redirected to their dedicated portals.
 */
export default function MainTabsLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  if (user?.role === "owner") return <Redirect href="/(owner)/dashboard" />;
  if (user?.role === "admin") return <Redirect href="/(admin)/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: typography.xs, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoris",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: "Intérêts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Compte",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
