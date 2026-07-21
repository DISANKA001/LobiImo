import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { EmptyState, PropertyCard } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";
import { Property } from "@/src/types";

export default function ClientFavorites() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Property[]>("/favorites");
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de charger les favoris");
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
      testID="favorites-screen"
      header={<AppHeader title="Mes favoris" subtitle="Vos coups de cœur" />}
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
