/**
 * Advanced filters bottom sheet (modal-based) for the public home.
 * Manages: price range, min surface, bedrooms, commune.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { COMMUNES_KINSHASA } from "@/src/types";

export type PropertyFilters = {
  minPrice: string;
  maxPrice: string;
  minSurface: string;
  bedrooms: number | null; // 1,2,3,4+
  commune: string | null;
};

export const EMPTY_FILTERS: PropertyFilters = {
  minPrice: "",
  maxPrice: "",
  minSurface: "",
  bedrooms: null,
  commune: null,
};

export function activeFilterCount(f: PropertyFilters): number {
  let n = 0;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  if (f.minSurface) n++;
  if (f.bedrooms != null) n++;
  if (f.commune) n++;
  return n;
}

type Props = {
  visible: boolean;
  initial: PropertyFilters;
  onClose: () => void;
  onApply: (f: PropertyFilters) => void;
};

export function FiltersSheet({ visible, initial, onClose, onApply }: Props) {
  const [f, setF] = useState<PropertyFilters>(initial);

  React.useEffect(() => {
    if (visible) setF(initial);
  }, [visible, initial]);

  const bedroomsChips = [1, 2, 3, 4];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filtres avancés</Text>
            <TouchableOpacity
              testID="filters-reset-btn"
              onPress={() => setF(EMPTY_FILTERS)}
            >
              <Text style={styles.reset}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.md }}
          >
            {/* Price */}
            <Text style={styles.section}>Fourchette de prix (USD)</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Min</Text>
                <TextInput
                  testID="filter-min-price"
                  value={f.minPrice}
                  onChangeText={(v) => setF({ ...f, minPrice: v.replace(/[^0-9.]/g, "") })}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={styles.priceInput}
                />
              </View>
              <View style={styles.dash} />
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Max</Text>
                <TextInput
                  testID="filter-max-price"
                  value={f.maxPrice}
                  onChangeText={(v) => setF({ ...f, maxPrice: v.replace(/[^0-9.]/g, "") })}
                  placeholder="∞"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={styles.priceInput}
                />
              </View>
            </View>
            <Text style={styles.helper}>
              Loyer mensuel pour les locations, prix total pour les ventes.
            </Text>

            {/* Surface */}
            <Text style={styles.section}>Superficie minimale (m²)</Text>
            <TextInput
              testID="filter-min-surface"
              value={f.minSurface}
              onChangeText={(v) => setF({ ...f, minSurface: v.replace(/[^0-9.]/g, "") })}
              placeholder="Ex : 80"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={styles.singleInput}
            />

            {/* Bedrooms */}
            <Text style={styles.section}>Chambres (minimum)</Text>
            <View style={styles.chipsRow}>
              {bedroomsChips.map((b) => {
                const active = f.bedrooms === b;
                return (
                  <Pressable
                    key={b}
                    testID={`filter-bedrooms-${b}`}
                    onPress={() =>
                      setF({ ...f, bedrooms: active ? null : b })
                    }
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && { color: "#fff" },
                      ]}
                    >
                      {b === 4 ? "4+" : `${b}+`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Commune */}
            <Text style={styles.section}>Commune</Text>
            <View style={styles.chipsRow}>
              <Pressable
                testID="filter-commune-any"
                onPress={() => setF({ ...f, commune: null })}
                style={[
                  styles.chipCommune,
                  f.commune == null && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    f.commune == null && { color: "#fff" },
                  ]}
                >
                  Toutes
                </Text>
              </Pressable>
              {COMMUNES_KINSHASA.map((c) => {
                const active = f.commune === c;
                return (
                  <Pressable
                    key={c}
                    testID={`filter-commune-${c}`}
                    onPress={() =>
                      setF({ ...f, commune: active ? null : c })
                    }
                    style={[
                      styles.chipCommune,
                      active && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && { color: "#fff" },
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              testID="filters-apply-btn"
              title="Appliquer les filtres"
              onPress={() => {
                onApply(f);
                onClose();
              }}
            />
            <TouchableOpacity
              onPress={onClose}
              style={{ alignItems: "center", marginTop: spacing.sm }}
            >
              <Text style={{ color: colors.onSurfaceSecondary, fontSize: typography.sm }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
  },
  reset: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  section: {
    fontSize: typography.xs,
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: typography.xs,
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
  },
  priceInput: {
    fontSize: typography.base,
    color: colors.onSurface,
    paddingVertical: 2,
    minHeight: 24,
  },
  dash: {
    width: 12,
    height: 2,
    backgroundColor: colors.borderStrong,
  },
  singleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
    color: colors.onSurface,
    minHeight: 42,
  },
  helper: {
    color: colors.muted,
    fontSize: typography.xs,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minWidth: 52,
    height: 34,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  chipCommune: {
    height: 32,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
});

export function FiltersButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      testID="filters-open-btn"
      onPress={onPress}
      style={fbStyles.btn}
      activeOpacity={0.85}
    >
      <Ionicons name="options-outline" size={16} color={colors.brandPrimary} />
      <Text style={fbStyles.text}>Filtres</Text>
      {count > 0 ? (
        <View style={fbStyles.badge}>
          <Text style={fbStyles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const fbStyles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  text: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: typography.xs,
    fontWeight: "800",
  },
});
