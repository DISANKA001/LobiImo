import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { EmptyState, PrimaryButton, PropertyCard } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";
import { Property } from "@/src/types";

export default function MyProperties() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api.get<Property[]>("/properties/mine");
      setItems(p);
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
      testID="my-properties-screen"
      header={<AppHeader title="Mes propriétés" subtitle="Gérez vos annonces" />}
    >
      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          testID="mine-empty"
          title="Aucune propriété"
          subtitle="Créez votre première annonce pour toucher des clients."
          action={
            <PrimaryButton
              title="Ajouter une propriété"
              onPress={() => router.push("/(owner)/add-property")}
            />
          }
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
