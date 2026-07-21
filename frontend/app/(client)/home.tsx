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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { EmptyState, PropertyCard } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Property, TransactionType } from "@/src/types";

type Filter = "tous" | TransactionType;

export default function ClientHome() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("tous");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const params: string[] = [];
      if (filter !== "tous") params.push(`type=${filter}`);
      if (search.trim()) params.push(`q=${encodeURIComponent(search.trim())}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const data = await api.get<Property[]>(`/properties${qs}`);
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, toast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const chips: { key: Filter; label: string; icon: any }[] = useMemo(
    () => [
      { key: "tous", label: "Tous", icon: "grid-outline" },
      { key: "location", label: "Location", icon: "key-outline" },
      { key: "vente", label: "Vente", icon: "home-outline" },
    ],
    [],
  );

  return (
    <Screen
      testID="client-home-screen"
      header={
        <AppHeader
          title={`Bonjour ${user?.name?.split(" ")[0] || ""}`}
          subtitle="Trouvez votre prochain chez-vous"
        />
      }
    >
      <View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            testID="home-search-input"
            style={styles.searchInput}
            placeholder="Rechercher un quartier, un titre..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setTimeout(load, 0);
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

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
                testID={`home-filter-${c.key}`}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={c.icon}
                  size={16}
                  color={active ? "#fff" : colors.brandPrimary}
                />
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="home-empty"
          title="Aucune propriété"
          subtitle="Aucune annonce ne correspond à vos critères pour le moment."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 40 }}
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
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.onSurface,
    paddingVertical: 8,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: {
    color: colors.brandPrimary,
    fontWeight: "600",
    fontSize: typography.base,
  },
  chipTextActive: { color: "#fff" },
});
