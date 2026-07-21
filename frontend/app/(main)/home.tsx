import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/toast";
import { EmptyState, PropertyCard } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Property, TransactionType } from "@/src/types";

type Filter = "tous" | TransactionType;

const LOGO = require("@/assets/images/logo.png");

/**
 * PUBLIC home — browsing works without an account.
 * The Lobilmo logo header opens an admin login after 5 rapid taps.
 */
export default function PublicHome() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("tous");
  const [search, setSearch] = useState("");

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const params: string[] = [];
      if (filter !== "tous") params.push(`type=${filter}`);
      if (search.trim()) params.push(`q=${encodeURIComponent(search.trim())}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const url = `/properties/public${qs}`;
      const data = await api.get<Property[]>(url);
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

  const chips: { key: Filter; label: string }[] = useMemo(
    () => [
      { key: "tous", label: "Tous" },
      { key: "location", label: "Location" },
      { key: "vente", label: "Vente" },
    ],
    [],
  );

  const onLogoPress = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1600);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      router.push("/(auth)/admin");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="public-home-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="app-logo"
          activeOpacity={0.9}
          onPress={onLogoPress}
          style={styles.logoRow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={LOGO} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>Lobilmo</Text>
            <Text style={styles.brandSub}>Immobilier • Kinshasa</Text>
          </View>
        </TouchableOpacity>
        {user ? (
          <TouchableOpacity
            testID="home-profile-btn"
            onPress={() => router.push("/(main)/profile")}
            style={styles.iconBtn}
          >
            <Ionicons name="person-circle" size={26} color={colors.brandPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="home-login-btn"
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search + Filters */}
      <View style={styles.sticky}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.muted} />
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
              <Ionicons name="close-circle" size={16} color={colors.muted} />
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

      {/* List */}
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
          contentContainerStyle={styles.listContent}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    borderRadius: 8,
  },
  brandName: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.2,
  },
  brandSub: {
    fontSize: typography.xs,
    color: colors.onSurfaceSecondary,
    marginTop: -1,
  },
  loginBtn: {
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#fff",
    fontSize: typography.sm,
    fontWeight: "700",
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  sticky: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.onSurface,
    paddingVertical: 6,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  chipTextActive: { color: "#fff" },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
});
