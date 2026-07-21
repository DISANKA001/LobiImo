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
import { EmptyState, PrimaryButton, PropertyCard } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";
import { Property } from "@/src/types";

export default function Favorites() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Property[]>("/favorites");
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de charger les favoris");
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
      <Screen
        testID="favorites-screen"
        header={<AppHeader title="Favoris" />}
      >
        <View style={styles.gate}>
          <Ionicons name="heart-outline" size={48} color={colors.brandPrimary} />
          <Text style={styles.gateTitle}>Créez un compte pour sauver vos favoris</Text>
          <Text style={styles.gateSub}>
            Enregistrez les biens qui vous intéressent et retrouvez-les ici.
          </Text>
          <View style={{ width: "100%", marginTop: spacing.lg }}>
            <PrimaryButton
              title="Se connecter"
              onPress={() => router.push("/(auth)/login")}
              testID="favorites-login-btn"
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title="Créer un compte"
              variant="outline"
              onPress={() => router.push("/(auth)/register")}
              testID="favorites-register-btn"
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="favorites-screen"
      header={<AppHeader title="Favoris" subtitle="Vos coups de cœur" />}
    >
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="favorites-empty"
          title="Aucun favori"
          subtitle="Appuyez sur ♥ sur une annonce pour la retrouver ici."
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
});
