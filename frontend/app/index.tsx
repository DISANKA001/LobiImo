import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth";
import { colors } from "@/src/theme";

/**
 * Root landing:
 * - Owner / Admin → their portal
 * - Everyone else (including anonymous) → public browse (main tabs)
 */
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  if (user?.role === "admin") return <Redirect href="/(admin)/dashboard" />;
  if (user?.role === "owner") return <Redirect href="/(owner)/dashboard" />;
  return <Redirect href="/(main)/home" />;
}
