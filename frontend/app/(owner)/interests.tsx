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

const STATUS: Record<Interest["status"], { label: string; variant: any }> = {
  new: { label: "Nouveau", variant: "warning" },
  contacted: { label: "Admin en contact", variant: "primary" },
  connected: { label: "Client connecté", variant: "success" },
  closed: { label: "Clôturé", variant: "muted" },
};

export default function OwnerInterests() {
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
      testID="owner-interests-screen"
      header={
        <AppHeader
          title="Intérêts reçus"
          subtitle="L'admin gère la mise en relation"
        />
      }
    >
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="owner-interests-empty"
          title="Aucun intérêt"
          subtitle="Vous serez notifié dès qu'un client s'intéresse à un de vos biens."
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
            const st = STATUS[item.status];
            return (
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.property_title}
                </Text>
                <Text style={styles.meta}>
                  {item.property_type === "location"
                    ? `Location • ${formatUSD(item.property_price)}/mois`
                    : `Vente • ${formatUSD(item.property_price)}`}
                </Text>
                <View style={{ marginTop: spacing.sm, flexDirection: "row" }}>
                  <Badge label={st.label} variant={st.variant} />
                </View>
                {item.status === "connected" || item.status === "closed" ? (
                  <View style={styles.contact}>
                    <Text style={styles.contactTitle}>Client mis en relation</Text>
                    <Text style={styles.contactRow}>👤 {item.client_name}</Text>
                    <Text style={styles.contactRow}>✉️ {item.client_email}</Text>
                    {item.client_phone ? (
                      <Text style={styles.contactRow}>📞 {item.client_phone}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.info}>
                    L'administrateur LobiImo vous contactera pour organiser la
                    visite.
                  </Text>
                )}
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
    color: colors.onSurfaceSecondary,
    fontSize: typography.base,
    marginTop: 2,
  },
  info: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    fontStyle: "italic",
  },
  contact: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
  },
  contactTitle: {
    fontWeight: "700",
    color: colors.brandPrimary,
    marginBottom: 4,
  },
  contactRow: {
    color: colors.brandPrimary,
    marginTop: 2,
    fontSize: typography.base,
  },
});
