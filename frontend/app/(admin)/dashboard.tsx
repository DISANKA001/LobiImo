import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { AdminStats, formatUSD } from "@/src/types";

export default function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.get<AdminStats>("/admin/stats");
      setStats(s);
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

  if (loading || !stats) {
    return (
      <Screen
        testID="admin-dashboard-screen"
        header={<AppHeader title="Admin LobiImo" />}
      >
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="admin-dashboard-screen"
      header={
        <AppHeader
          title="Admin LobiImo"
          subtitle="Vue d'ensemble de la plateforme"
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 60 }}
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
      >
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Revenus encaissés</Text>
          <Text style={styles.revenueValue}>{formatUSD(stats.revenue_total)}</Text>
          <View style={styles.revenueRow}>
            <View>
              <Text style={styles.revenueMini}>{stats.payments_paid}</Text>
              <Text style={styles.revenueMiniLabel}>paiements</Text>
            </View>
            <View>
              <Text style={styles.revenueMini}>{stats.interests_new}</Text>
              <Text style={styles.revenueMiniLabel}>intérêts en attente</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <MetricCard
            label="Propriétés"
            value={stats.properties_total}
            sub={`${stats.properties_published} publiées`}
            icon="business"
            onPress={() => router.push("/(admin)/properties")}
          />
          <MetricCard
            label="En attente"
            value={stats.properties_pending}
            sub="à valider"
            icon="time"
            tone="warning"
            onPress={() => router.push("/(admin)/properties")}
          />
          <MetricCard
            label="Utilisateurs"
            value={stats.users_total}
            sub={`${stats.clients} clients • ${stats.owners} bailleurs`}
            icon="people"
            onPress={() => router.push("/(admin)/users")}
          />
          <MetricCard
            label="Intérêts"
            value={stats.interests_total}
            sub={`${stats.interests_new} nouveaux`}
            icon="flame"
            tone="secondary"
            onPress={() => router.push("/(admin)/interests")}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton
            title="Se déconnecter"
            variant="outline"
            testID="admin-logout-btn"
            onPress={async () => {
              await logout();
              router.replace("/");
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = "primary",
  onPress,
}: {
  label: string;
  value: number;
  sub: string;
  icon: any;
  tone?: "primary" | "warning" | "secondary";
  onPress?: () => void;
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
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.metric, { backgroundColor: bg }]}
    >
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={[styles.metricValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: fg }]}>{label}</Text>
      <Text style={[styles.metricSub, { color: fg, opacity: 0.75 }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  revenueCard: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  revenueLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: typography.base,
    fontWeight: "600",
  },
  revenueValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  revenueMini: {
    color: "#fff",
    fontSize: typography.xl,
    fontWeight: "700",
  },
  revenueMiniLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: typography.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radius.md,
    minHeight: 120,
  },
  metricValue: {
    fontSize: typography.xxl,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  metricLabel: {
    fontSize: typography.base,
    fontWeight: "700",
    marginTop: 2,
  },
  metricSub: {
    fontSize: typography.sm,
    marginTop: 2,
  },
});
