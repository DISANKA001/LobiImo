import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Badge, EmptyState, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Interest, Payment, formatUSD } from "@/src/types";

const STATUS: Record<Payment["status"], { label: string; variant: any }> = {
  pending: { label: "En attente", variant: "warning" },
  paid: { label: "Payé", variant: "success" },
  cancelled: { label: "Annulé", variant: "muted" },
};

export default function AdminFinances() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<null | "manual" | "stripe">(null);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([
        api.get<Payment[]>("/payments"),
        api.get<Interest[]>("/interests"),
      ]);
      setPayments(p);
      setInterests(i);
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

  const eligible = useMemo(
    () => interests.filter((i) => i.status !== "closed"),
    [interests],
  );

  const total = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  const commission = (interest: Interest) =>
    interest.property_type === "location"
      ? interest.property_price
      : interest.property_price * 0.1;

  const submitManual = async () => {
    if (!selectedInterestId) return;
    setSubmitting("manual");
    try {
      await api.post("/payments/manual", {
        interest_id: selectedInterestId,
        notes,
      });
      toast.success("Paiement en présentiel enregistré");
      setShowNew(false);
      setSelectedInterestId(null);
      setNotes("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Enregistrement impossible");
    } finally {
      setSubmitting(null);
    }
  };

  const submitStripe = async () => {
    if (!selectedInterestId) return;
    setSubmitting("stripe");
    try {
      const backend = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const p = await api.post<Payment>("/payments/stripe", {
        interest_id: selectedInterestId,
        success_url: `${backend}/api/health?paid=1`,
        cancel_url: `${backend}/api/health?paid=0`,
      });
      if (p.stripe_url) {
        toast.success("Session Stripe créée. Ouverture...");
        await WebBrowser.openBrowserAsync(p.stripe_url);
      } else {
        toast.info(
          "Session enregistrée. La clé Stripe test doit être configurée.",
        );
      }
      setShowNew(false);
      setSelectedInterestId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Stripe indisponible");
    } finally {
      setSubmitting(null);
    }
  };

  const markPaid = async (id: string) => {
    try {
      await api.patch(`/payments/${id}/mark-paid`);
      toast.success("Paiement marqué payé");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action impossible");
    }
  };

  return (
    <Screen
      testID="admin-finances-screen"
      header={
        <AppHeader
          title="Finances"
          subtitle="Commissions LobiImo"
        />
      }
    >
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Revenus totaux</Text>
        <Text style={styles.summaryValue}>{formatUSD(total)}</Text>
        <Text style={styles.summaryHint}>
          Location = 1 mois de loyer · Vente = 10% du prix
        </Text>
      </View>

      <PrimaryButton
        testID="new-payment-btn"
        title="+ Nouveau paiement / commission"
        onPress={() => setShowNew(true)}
        style={{ marginTop: spacing.md, marginBottom: spacing.md }}
      />

      {loading ? (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : payments.length === 0 ? (
        <EmptyState
          testID="admin-payments-empty"
          title="Aucun paiement"
          subtitle="Créez un paiement lorsqu'une transaction est finalisée."
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 40 }}
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
              <View style={styles.paymentRow}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Badge label={st.label} variant={st.variant} />
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text style={styles.propTitle}>{item.property_title}</Text>
                <Text style={styles.meta}>
                  {item.transaction_type === "location" ? "Location" : "Vente"}
                  {" • "}Base: {formatUSD(item.base_price)} · Commission:{" "}
                  <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>
                    {formatUSD(item.commission)}
                  </Text>
                </Text>
                <View style={styles.paymentFooter}>
                  <View style={styles.methodBadge}>
                    <Ionicons
                      name={item.method === "stripe" ? "card" : "cash-outline"}
                      size={14}
                      color={colors.brandPrimary}
                    />
                    <Text style={styles.methodText}>
                      {item.method === "stripe" ? "Stripe" : "Présentiel"}
                    </Text>
                  </View>
                  {item.status === "pending" ? (
                    <TouchableOpacity
                      testID={`mark-paid-${item.id}`}
                      onPress={() => markPaid(item.id)}
                      style={styles.markPaid}
                    >
                      <Text style={styles.markPaidText}>Marquer payé</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={showNew}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNew(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nouveau paiement</Text>
              <Text style={styles.modalSubtitle}>
                Sélectionnez la mise en relation puis le mode de paiement.
              </Text>

              <Text style={styles.section}>Mise en relation</Text>
              {eligible.length === 0 ? (
                <Text style={styles.info}>
                  Aucune mise en relation ouverte. Marquez-en une comme
                  "Connecté" dans l'onglet Intérêts.
                </Text>
              ) : (
                eligible.map((i) => {
                  const c = commission(i);
                  const active = selectedInterestId === i.id;
                  return (
                    <TouchableOpacity
                      key={i.id}
                      testID={`select-int-${i.id}`}
                      onPress={() => setSelectedInterestId(i.id)}
                      style={[
                        styles.optCard,
                        active && {
                          borderColor: colors.brandPrimary,
                          backgroundColor: colors.brandTertiary,
                        },
                      ]}
                    >
                      <View>
                        <Text style={styles.optTitle} numberOfLines={1}>
                          {i.property_title}
                        </Text>
                        <Text style={styles.optMeta}>
                          {i.client_name} • {i.property_type === "location" ? "Location" : "Vente"}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.optAmount}>{formatUSD(c)}</Text>
                        <Text style={styles.optAmountLabel}>commission</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={styles.section}>Notes (optionnel)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex: Reçu signé, versement au bureau..."
                placeholderTextColor={colors.muted}
                style={styles.notesInput}
                multiline
              />

              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton
                  testID="submit-manual"
                  title="Enregistrer paiement en présentiel"
                  onPress={submitManual}
                  loading={submitting === "manual"}
                  disabled={!selectedInterestId}
                />
                <View style={{ height: spacing.sm }} />
                <PrimaryButton
                  testID="submit-stripe"
                  title="Générer lien de paiement Stripe"
                  variant="outline"
                  onPress={submitStripe}
                  loading={submitting === "stripe"}
                  disabled={!selectedInterestId}
                />
                <TouchableOpacity
                  onPress={() => setShowNew(false)}
                  style={{ alignItems: "center", marginTop: spacing.md }}
                >
                  <Text style={{ color: colors.onSurfaceSecondary }}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.brandPrimary,
    padding: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: typography.base,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: typography.sm,
    marginTop: 4,
  },
  paymentRow: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  date: { color: colors.muted, fontSize: typography.sm },
  propTitle: {
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
  paymentFooter: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodBadge: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  methodText: {
    color: colors.brandPrimary,
    fontWeight: "600",
    fontSize: typography.sm,
  },
  markPaid: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  markPaidText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: typography.sm,
  },
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
  modalSubtitle: {
    color: colors.onSurfaceSecondary,
    marginTop: 4,
  },
  section: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  info: {
    color: colors.onSurfaceSecondary,
    fontStyle: "italic",
  },
  optCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  optTitle: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
    maxWidth: 200,
  },
  optMeta: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.sm,
    marginTop: 2,
  },
  optAmount: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  optAmountLabel: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.onSurface,
  },
});
