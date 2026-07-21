import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { colors, radius, spacing, typography } from "@/src/theme";

const HERO_IMAGE =
  "https://images.pexels.com/photos/30188151/pexels-photo-30188151.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1400&w=940";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);
  const [hintVisible, setHintVisible] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  // Redirect logged-in users to their portal
  if (user) {
    if (user.role === "admin") return <Redirect href="/(admin)/dashboard" />;
    if (user.role === "owner") return <Redirect href="/(owner)/dashboard" />;
    return <Redirect href="/(client)/home" />;
  }

  const onLogoPress = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      setHintVisible(false);
    }, 1600);
    if (tapCountRef.current >= 3 && tapCountRef.current < 5) {
      setHintVisible(true);
    }
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setHintVisible(false);
      router.push("/(auth)/admin");
    }
  };

  return (
    <View style={styles.container} testID="welcome-screen">
      <Image source={{ uri: HERO_IMAGE }} style={styles.hero} />
      <LinearGradient
        colors={["transparent", "rgba(10,77,104,0.85)", "#0A4D68"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          testID="app-logo"
          onPress={onLogoPress}
          activeOpacity={0.9}
          style={styles.logoWrap}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>Li</Text>
          </View>
          <Text style={styles.logoText}>LobiImo</Text>
          <Text style={styles.tagline}>
            L'immobilier à Kinshasa, sans détour.
          </Text>
          {hintVisible ? (
            <Text style={styles.adminHint}>Mode admin dans 2 taps...</Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.actions}>
          <PrimaryButton
            title="Se connecter"
            testID="welcome-login-btn"
            onPress={() => router.push("/(auth)/login")}
          />
          <View style={{ height: spacing.md }} />
          <PrimaryButton
            title="Créer un compte"
            variant="outline"
            testID="welcome-register-btn"
            onPress={() => router.push("/(auth)/register")}
            style={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "#fff" }}
          />
          <Text style={styles.footerText}>
            Location & Vente • Kinshasa 🇨🇩
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandPrimary },
  hero: { ...StyleSheet.absoluteFillObject, resizeMode: "cover", opacity: 0.9 },
  gradient: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoBadgeText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: typography.lg,
    color: "rgba(255,255,255,0.9)",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  adminHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: typography.sm,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  actions: {
    marginTop: spacing.lg,
  },
  footerText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: typography.sm,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
