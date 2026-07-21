import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { PrimaryButton, PropertyCard } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Interest, Property } from "@/src/types";

export default function OwnerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [props, setProps] = useState<Property[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([
        api.get<Property[]>("/properties/mine"),
        api.get<Interest[]>("/interests"),
      ]);
      setProps(p);
      setInterests(i);
    } catch (e: any) {
      toast.error(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const published = props.filter((p) => p.status === "published").length;
  const pending = props.filter((p) => p.status === "pending").length;
  const newInterests = interests.filter((i) => i.status === "new").length;

  if (loading) {
    return (
      <Screen testID="owner-dashboard-screen" header={<AppHeader title="Tableau de bord" />}>
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="owner-dashboard-screen"
      header={
        <AppHeader
          title={`Bonjour ${user?.name?.split(" ")[0] || ""}`}
          subtitle="Portail Bailleur"
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brandPrimary}
          />
        }
        contentContainerStyle={{ paddingBottom: 40, paddingTop: spacing.md }}
      >
        <View style={styles.statsRow}>
          <StatCard label="Publiés" value={published} icon="checkmark-circle" tone="primary" />
          <StatCard label="En attente" value={pending} icon="time-outline" tone="warning" />
          <StatCard label="Intérêts" value={newInterests} icon="mail-unread" tone="secondary" />
        </View>

        <PrimaryButton
          testID="dashboard-add-btn"
          title="+ Ajouter une propriété"
          onPress={() => router.push("/(owner)/add-property")}
          style={{ marginBottom: spacing.lg }}
        />

        <Text style={styles.sectionTitle}>Vos annonces récentes</Text>
        {props.length === 0 ? (
          <View style={styles.emptyMini}>
            <Ionicons name="business-outline" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>
              Aucune annonce pour l'instant. Ajoutez votre premier bien.
            </Text>
          </View>
        ) : (
          props
            .slice(0, 3)
            .map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onPress={() => router.push(`/property/${p.id}`)}
              />
            ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  tone: "primary" | "warning" | "secondary";
}) {
  const bg =
    tone === "primary"
      ? colors.brandTertiary
      : tone === "warning"
        ? "#FEF3C7"
        : "#CFF0EE";
  const fg =
    tone === "primary"
      ? colors.brandPrimary
      : tone === "warning"
        ? "#B45309"
        : colors.brandSecondary;
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: typography.xxl,
    fontWeight: "800",
    marginTop: 4,
  },
  statLabel: {
    fontSize: typography.sm,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptyMini: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
});
