import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { EmptyState, PropertyCard } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Property } from "@/src/types";

type Filter = "all" | "pending" | "published" | "rejected";

export default function AdminProperties() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const data = await api.get<Property[]>(`/properties${qs}`);
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, toast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const chips: { key: Filter; label: string }[] = useMemo(
    () => [
      { key: "pending", label: "À valider" },
      { key: "published", label: "Publiées" },
      { key: "rejected", label: "Refusées" },
      { key: "all", label: "Toutes" },
    ],
    [],
  );

  const setStatus = async (id: string, status: "published" | "rejected") => {
    setActionId(id);
    try {
      await api.patch(`/properties/${id}/status`, { status });
      toast.success(
        status === "published" ? "Propriété publiée" : "Propriété refusée",
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action impossible");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Screen
      testID="admin-properties-screen"
      header={
        <AppHeader
          title="Gestion des propriétés"
          subtitle="Validez ou refusez les annonces"
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((c) => {
          const active = c.key === filter;
          return (
            <Pressable
              key={c.key}
              testID={`filter-${c.key}`}
              onPress={() => setFilter(c.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, active && { color: "#fff" }]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="admin-props-empty"
          title="Aucune propriété"
          subtitle="Aucune annonce ne correspond à ce filtre."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 40 }}
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
          renderItem={({ item }) => (
            <View>
              <PropertyCard
                property={item}
                onPress={() => router.push(`/property/${item.id}`)}
              />
              <View style={styles.actionRow}>
                {item.status !== "published" ? (
                  <TouchableOpacity
                    testID={`publish-${item.id}`}
                    onPress={() => setStatus(item.id, "published")}
                    style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    disabled={actionId === item.id}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.actionText}>Publier</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status !== "rejected" ? (
                  <TouchableOpacity
                    testID={`reject-${item.id}`}
                    onPress={() => setStatus(item.id, "rejected")}
                    style={[styles.actionBtn, { backgroundColor: colors.error }]}
                    disabled={actionId === item.id}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.actionText}>Refuser</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.ownerLabel}>
                Bailleur : {item.owner_name}
                {item.owner_phone ? ` • ${item.owner_phone}` : ""}
              </Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.brandPrimary, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: typography.base,
  },
  ownerLabel: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
});
