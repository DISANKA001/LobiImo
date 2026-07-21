import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Badge, EmptyState } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { User } from "@/src/auth";

export default function AdminUsers() {
  const toast = useToast();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<User[]>("/admin/users");
      setItems(data);
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

  return (
    <Screen
      testID="admin-users-screen"
      header={<AppHeader title="Utilisateurs" subtitle="Comptes de la plateforme" />}
    >
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="users-empty"
          title="Aucun utilisateur"
          subtitle="Aucun compte pour l'instant."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
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
          renderItem={({ item }) => {
            const variant =
              item.role === "admin"
                ? "primary"
                : item.role === "owner"
                  ? "secondary"
                  : "muted";
            const label =
              item.role === "admin"
                ? "Admin"
                : item.role === "owner"
                  ? "Bailleur"
                  : "Client";
            return (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name?.slice(0, 1)?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  {item.phone ? (
                    <Text style={styles.phone}>{item.phone}</Text>
                  ) : null}
                </View>
                <Badge label={label} variant={variant as any} />
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: typography.lg,
    fontWeight: "800",
  },
  name: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
  },
  email: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.sm,
    marginTop: 1,
  },
  phone: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.sm,
  },
});
