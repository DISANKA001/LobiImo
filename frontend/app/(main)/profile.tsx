import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";

const LOGO = require("@/assets/images/logo.png");

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Screen
        scroll
        testID="profile-screen"
        header={<AppHeader title="Mon compte" />}
      >
        <View style={styles.gateCard}>
          <Image source={LOGO} style={styles.gateLogo} />
          <Text style={styles.gateTitle}>Bienvenue sur Lobilmo</Text>
          <Text style={styles.gateSub}>
            Connectez-vous pour sauvegarder vos favoris, exprimer votre intérêt
            pour un bien ou publier une annonce.
          </Text>
          <View style={{ width: "100%", marginTop: spacing.lg }}>
            <PrimaryButton
              testID="profile-login-btn"
              title="Se connecter"
              onPress={() => router.push("/(auth)/login")}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              testID="profile-register-btn"
              title="Créer un compte"
              variant="outline"
              onPress={() => router.push("/(auth)/register")}
            />
          </View>
        </View>
        <Text style={styles.footer}>Lobilmo • Kinshasa 🇨🇩</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="profile-screen" header={<AppHeader title="Mon compte" />}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name?.slice(0, 1)?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>
          {user.role === "client"
            ? "Client"
            : user.role === "owner"
              ? "Bailleur"
              : "Administrateur"}
        </Text>
        <View style={styles.divider} />
        <Row label="Email" value={user.email} />
        <Row label="Téléphone" value={user.phone || "Non renseigné"} />
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <PrimaryButton
          title="Se déconnecter"
          variant="outline"
          testID="profile-logout-btn"
          onPress={async () => {
            await logout();
            router.replace("/");
          }}
        />
      </View>

      <View style={styles.aboutRow}>
        <Ionicons name="shield-checkmark" size={16} color={colors.brandPrimary} />
        <Text style={styles.aboutText}>
          Lobilmo gère la mise en relation entre clients et bailleurs.
        </Text>
      </View>

      <Text style={styles.footer}>Lobilmo • Kinshasa 🇨🇩</Text>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  gateLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    marginBottom: spacing.md,
  },
  gateTitle: {
    fontSize: typography.xl,
    fontWeight: "800",
    color: colors.onSurface,
  },
  gateSub: {
    color: colors.onSurfaceSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    fontSize: typography.base,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: typography.xxl,
    fontWeight: "800",
  },
  name: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
  },
  role: {
    fontSize: typography.sm,
    color: colors.brandPrimary,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.base,
  },
  rowValue: {
    color: colors.onSurface,
    fontWeight: "600",
    fontSize: typography.base,
    maxWidth: "60%",
    textAlign: "right",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  aboutText: {
    color: colors.brandPrimary,
    fontSize: typography.sm,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: typography.sm,
    marginTop: spacing.xxl,
  },
});
