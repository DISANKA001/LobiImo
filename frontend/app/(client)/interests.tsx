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
import { Interest, formatUSD } from "@/src/types";

const STATUS_LABEL: Record<Interest["status"], { label: string; variant: any }> = {
  new: { label: "En attente admin", variant: "warning" },
  contacted: { label: "Admin vous contacte bientôt", variant: "primary" },
  connected: { label: "Mise en relation ✓", variant: "success" },
  closed: { label: "Clôturé", variant: "muted" },
};

export default function ClientInterests() {
  const toast = useToast();
  const [items, setItems] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Interest[]>("/interests");
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
      testID="client-interests-screen"
      header={
        <AppHeader
          title="Mes intérêts"
          subtitle="Suivi des mises en relation par l'admin"
        />
      }
    >
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="interests-empty"
          title="Aucun intérêt exprimé"
          subtitle="Cliquez sur « Je suis intéressé » depuis une annonce."
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
          renderItem={({ item }) => {
            const st = STATUS_LABEL[item.status];
            const priceLabel =
              item.property_type === "location"
                ? `${formatUSD(item.property_price)}/mois`
                : formatUSD(item.property_price);
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.property_title}
                  </Text>
                  <Text style={styles.meta}>
                    {item.property_type === "location" ? "Location" : "Vente"} •{" "}
                    {priceLabel}
                  </Text>
                  <View style={{ marginTop: spacing.sm }}>
                    <Badge label={st.label} variant={st.variant} />
                  </View>
                  {item.admin_notes ? (
                    <Text style={styles.notes}>Note admin : {item.admin_notes}</Text>
                  ) : null}
                </View>
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
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
  },
  meta: {
    fontSize: typography.base,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
  notes: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
