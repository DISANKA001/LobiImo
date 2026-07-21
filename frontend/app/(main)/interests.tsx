import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Badge, EmptyState, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Interest, formatUSD } from "@/src/types";

const STATUS_LABEL: Record<Interest["status"], { label: string; variant: any }> = {
  new: { label: "En attente admin", variant: "warning" },
  contacted: { label: "Admin vous contacte bientôt", variant: "primary" },
  connected: { label: "Mise en relation ✓", variant: "success" },
  closed: { label: "Clôturé", variant: "muted" },
};

export default function ClientInterests() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Interest[]>("/interests");
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  if (!user) {
    return (
      <Screen testID="interests-screen" header={<AppHeader title="Mes intérêts" />}>
        <View style={styles.gate}>
          <Ionicons name="mail-outline" size={48} color={colors.brandPrimary} />
          <Text style={styles.gateTitle}>
            Connectez-vous pour exprimer votre intérêt
          </Text>
          <Text style={styles.gateSub}>
            {`Un compte est nécessaire pour être mis en relation avec un bailleur via l'administrateur Lobilmo.`}
          </Text>
          <View style={{ width: "100%", marginTop: spacing.lg }}>
            <PrimaryButton
              title="Se connecter"
              onPress={() => router.push("/(auth)/login")}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title="Créer un compte"
              variant="outline"
              onPress={() => router.push("/(auth)/register")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="interests-screen"
      header={
        <AppHeader
          title="Mes intérêts"
          subtitle="Suivi des mises en relation"
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
                  <Text style={styles.notes}>
                    Note admin : {item.admin_notes}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  gateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.md,
    textAlign: "center",
  },
  gateSub: {
    color: colors.onSurfaceSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
  },
  meta: {
    fontSize: typography.sm,
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
