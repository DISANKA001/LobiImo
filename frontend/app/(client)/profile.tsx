import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen
      scroll
      testID="profile-screen"
      header={<AppHeader title="Mon profil" />}
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.slice(0, 1)?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>
          {user?.role === "client"
            ? "Client"
            : user?.role === "owner"
              ? "Bailleur"
              : "Administrateur"}
        </Text>
        <View style={styles.divider} />
        <Row label="Email" value={user?.email || ""} />
        <Row label="Téléphone" value={user?.phone || "Non renseigné"} />
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

      <Text style={styles.footer}>LobiImo • Kinshasa 🇨🇩</Text>
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
  },
  name: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.onSurface,
  },
  role: {
    fontSize: typography.base,
    color: colors.brandPrimary,
    fontWeight: "600",
    marginTop: 4,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
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
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: typography.sm,
    marginTop: spacing.xxl,
  },
});
