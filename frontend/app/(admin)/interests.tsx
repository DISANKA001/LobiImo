import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Badge, EmptyState, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Interest, formatUSD } from "@/src/types";

const STATUS: Record<Interest["status"], { label: string; variant: any }> = {
  new: { label: "Nouveau", variant: "warning" },
  contacted: { label: "Contacté", variant: "primary" },
  connected: { label: "Connecté", variant: "success" },
  closed: { label: "Clôturé", variant: "muted" },
};

type Filter = "new" | "contacted" | "connected" | "closed" | "all";

export default function AdminInterests() {
  const toast = useToast();
  const [items, setItems] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("new");
  const [selected, setSelected] = useState<Interest | null>(null);
  const [notes, setNotes] = useState("");

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

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  const chips: { key: Filter; label: string }[] = [
    { key: "new", label: "Nouveaux" },
    { key: "contacted", label: "Contactés" },
    { key: "connected", label: "Connectés" },
    { key: "closed", label: "Clôturés" },
    { key: "all", label: "Tous" },
  ];

  const openManage = (item: Interest) => {
    setSelected(item);
    setNotes(item.admin_notes || "");
  };

  const setStatus = async (status: Interest["status"]) => {
    if (!selected) return;
    try {
      const updated = await api.patch<Interest>(`/interests/${selected.id}`, {
        status,
        admin_notes: notes,
      });
      toast.success(`Intérêt marqué "${STATUS[status].label}"`);
      setSelected(updated);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action impossible");
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    try {
      const updated = await api.patch<Interest>(`/interests/${selected.id}`, {
        admin_notes: notes,
      });
      toast.success("Notes enregistrées");
      setSelected(updated);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action impossible");
    }
  };

  return (
    <Screen
      testID="admin-interests-screen"
      header={
        <AppHeader
          title="Mises en relation"
          subtitle="Connectez clients & bailleurs"
        />
      }
    >
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
              testID={`interest-filter-${c.key}`}
              onPress={() => setFilter(c.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, active && { color: "#fff" }]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          testID="admin-int-empty"
          title="Aucun intérêt"
          subtitle="Rien à traiter dans cette catégorie."
        />
      ) : (
        <FlatList
          data={visible}
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
            const priceLabel =
              item.property_type === "location"
                ? `${formatUSD(item.property_price)}/mois`
                : formatUSD(item.property_price);
            return (
              <TouchableOpacity
                testID={`interest-item-${item.id}`}
                onPress={() => openManage(item)}
                style={styles.row}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Badge label={st.label} variant={st.variant} />
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {item.property_title}
                </Text>
                <Text style={styles.meta}>
                  {item.property_type === "location" ? "Location" : "Vente"} •{" "}
                  {priceLabel}
                </Text>
                <View style={styles.parties}>
                  <View style={styles.party}>
                    <Ionicons name="person-outline" size={14} color={colors.muted} />
                    <Text style={styles.partyText} numberOfLines={1}>
                      {item.client_name}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={colors.muted} />
                  <View style={styles.party}>
                    <Ionicons name="business-outline" size={14} color={colors.muted} />
                    <Text style={styles.partyText} numberOfLines={1}>
                      {item.owner_name || "—"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selected.property_title}</Text>
                <Text style={styles.modalMeta}>
                  {selected.property_type === "location" ? "Location" : "Vente"}
                  {" • "}
                  {selected.property_type === "location"
                    ? `${formatUSD(selected.property_price)}/mois`
                    : formatUSD(selected.property_price)}
                </Text>

                <Section title="Client">
                  <Row label="Nom" value={selected.client_name} />
                  <Row label="Email" value={selected.client_email} />
                  <Row label="Téléphone" value={selected.client_phone || "—"} />
                  {selected.message ? (
                    <Row label="Message" value={selected.message} />
                  ) : null}
                </Section>

                <Section title="Bailleur">
                  <Row label="Nom" value={selected.owner_name || "—"} />
                  <Row label="Téléphone" value={selected.owner_phone || "—"} />
                </Section>

                <Section title="Notes internes">
                  <TextInput
                    testID="admin-int-notes"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes de suivi (visite prévue, appel effectué...)"
                    placeholderTextColor={colors.muted}
                    multiline
                    style={styles.notesInput}
                  />
                  <PrimaryButton
                    title="Enregistrer les notes"
                    variant="outline"
                    onPress={saveNotes}
                    testID="admin-int-save-notes"
                  />
                </Section>

                <Section title="Statut">
                  <View style={styles.statusRow}>
                    <StatusBtn
                      label="Marquer contacté"
                      onPress={() => setStatus("contacted")}
                    />
                    <StatusBtn
                      label="Mise en relation"
                      onPress={() => setStatus("connected")}
                      tone="success"
                    />
                  </View>
                  <View style={{ height: spacing.sm }} />
                  <StatusBtn
                    label="Clôturer"
                    onPress={() => setStatus("closed")}
                    tone="muted"
                    fullWidth
                  />
                </Section>

                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  style={{ alignItems: "center", marginTop: spacing.md }}
                >
                  <Text style={{ color: colors.onSurfaceSecondary }}>Fermer</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function StatusBtn({
  label,
  onPress,
  tone = "primary",
  fullWidth,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "success" | "muted";
  fullWidth?: boolean;
}) {
  const bg =
    tone === "primary"
      ? colors.brandPrimary
      : tone === "success"
        ? colors.success
        : colors.surfaceTertiary;
  const fg = tone === "muted" ? colors.onSurface : "#fff";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: fullWidth ? 1 : 1,
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: "center",
      }}
    >
      <Text style={{ color: fg, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.brandPrimary, fontWeight: "600" },
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
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.base,
    marginTop: 2,
  },
  date: { color: colors.muted, fontSize: typography.sm },
  parties: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  party: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  partyText: { color: colors.onSurface, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xxl,
    maxHeight: "88%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.onSurface,
  },
  modalMeta: {
    color: colors.onSurfaceSecondary,
    marginTop: 4,
    fontSize: typography.base,
  },
  section: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailLabel: { color: colors.onSurfaceSecondary },
  detailValue: {
    color: colors.onSurface,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    marginBottom: spacing.sm,
    textAlignVertical: "top",
    color: colors.onSurface,
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
