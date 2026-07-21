import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/components/toast";
import { Badge, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { Property, formatUSD } from "@/src/types";

const { width: SW } = Dimensions.get("window");

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [prop, setProp] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const p = await api.get<Property>(`/properties/${id}`);
      setProp(p);
      if (user?.role === "client") {
        try {
          const favs = await api.get<Property[]>("/favorites");
          setFavorite(favs.some((f) => f.id === id));
        } catch {
          /* ignore */
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Propriété introuvable");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, toast, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async () => {
    if (!prop || user?.role !== "client") return;
    try {
      if (favorite) {
        await api.delete(`/favorites/${prop.id}`);
        setFavorite(false);
        toast.info("Retiré des favoris");
      } else {
        await api.post(`/favorites/${prop.id}`);
        setFavorite(true);
        toast.success("Ajouté aux favoris");
      }
    } catch (e: any) {
      toast.error(e?.message || "Action impossible");
    }
  };

  const submitInterest = async () => {
    if (!prop) return;
    setSubmitting(true);
    try {
      await api.post("/interests", {
        property_id: prop.id,
        message: message.trim(),
      });
      toast.success("Intérêt enregistré ! L'admin va vous recontacter.");
      setShowModal(false);
      setMessage("");
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'envoyer l'intérêt");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !prop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const priceLabel =
    prop.type === "location"
      ? `${formatUSD(prop.price)}/mois`
      : formatUSD(prop.price);

  const photos = prop.photos?.length ? prop.photos : [null];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View style={styles.heroWrap}>
          <FlatList
            data={photos}
            keyExtractor={(_, idx) => `p-${idx}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / SW,
              );
              setPhotoIndex(idx);
            }}
            renderItem={({ item }) =>
              item ? (
                <Image source={{ uri: item }} style={styles.heroImage} />
              ) : (
                <View style={[styles.heroImage, styles.heroPlaceholder]}>
                  <Text style={{ color: "#fff" }}>Pas de photo</Text>
                </View>
              )
            }
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent"]}
            style={styles.heroGradient}
          />
          <SafeAreaView edges={["top"]} style={styles.heroChrome}>
            <View style={styles.heroChromeRow}>
              <TouchableOpacity
                testID="detail-back-btn"
                onPress={() => router.back()}
                style={styles.circleBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
              </TouchableOpacity>
              {user?.role === "client" ? (
                <TouchableOpacity
                  testID="detail-fav-btn"
                  onPress={toggleFavorite}
                  style={styles.circleBtn}
                >
                  <Ionicons
                    name={favorite ? "heart" : "heart-outline"}
                    size={22}
                    color={favorite ? colors.error : colors.onSurface}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.circleBtn} />
              )}
            </View>
          </SafeAreaView>
          {photos.length > 1 ? (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === photoIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Badge
              label={prop.type === "location" ? "Location" : "Vente"}
              variant={prop.type === "location" ? "primary" : "secondary"}
            />
            {prop.status !== "published" ? (
              <Badge
                label={prop.status}
                variant={
                  prop.status === "pending"
                    ? "warning"
                    : prop.status === "rejected"
                      ? "error"
                      : "muted"
                }
              />
            ) : null}
          </View>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.title}>{prop.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={styles.locText}>
              {prop.quartier}, {prop.commune}
            </Text>
          </View>

          <View style={styles.specsGrid}>
            <Spec icon="bed-outline" value={`${prop.bedrooms}`} label="Chambres" />
            <Spec icon="water-outline" value={`${prop.bathrooms}`} label="SDB" />
            <Spec icon="resize-outline" value={`${prop.surface}`} label="m²" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{prop.description}</Text>
          </View>

          {prop.amenities?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Équipements</Text>
              <View style={styles.amenityRow}>
                {prop.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.brandPrimary}
                    />
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark" size={18} color={colors.brandPrimary} />
            <Text style={styles.noticeText}>
              L'administrateur LobiImo vous mettra en relation avec le bailleur
              après validation de votre intérêt.
            </Text>
          </View>
        </View>
      </ScrollView>

      {user?.role === "client" ? (
        <View style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <PrimaryButton
            testID="detail-interest-btn"
            title="Je suis intéressé"
            onPress={() => setShowModal(true)}
          />
        </View>
      ) : null}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirmer votre intérêt</Text>
            <Text style={styles.modalSubtitle}>
              L'administrateur LobiImo sera notifié et vous contactera pour la
              mise en relation.
            </Text>
            <TextInput
              testID="interest-message-input"
              value={message}
              onChangeText={setMessage}
              placeholder="Message optionnel (visite préférée, questions...)"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.modalInput}
            />
            <PrimaryButton
              testID="interest-confirm-btn"
              title="Envoyer mon intérêt"
              onPress={submitInterest}
              loading={submitting}
            />
            <TouchableOpacity
              style={{ marginTop: spacing.md, alignItems: "center" }}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: colors.onSurfaceSecondary }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Spec({
  icon,
  value,
  label,
}: {
  icon: any;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={20} color={colors.brandPrimary} />
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { width: SW, height: 340 },
  heroImage: { width: SW, height: 340, resizeMode: "cover" },
  heroPlaceholder: {
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  heroChromeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 18 },
  body: {
    padding: spacing.xl,
    marginTop: -20,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  price: {
    fontSize: typography.display,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginTop: spacing.md,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  locText: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.base,
  },
  specsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  specItem: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  specValue: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  specLabel: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.base,
    color: colors.onSurfaceSecondary,
    lineHeight: 22,
  },
  amenityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  amenityText: {
    color: colors.brandPrimary,
    fontWeight: "600",
    fontSize: typography.sm,
  },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.brandPrimary,
    lineHeight: 20,
  },
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
    fontSize: typography.base,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: "top",
    marginVertical: spacing.lg,
    color: colors.onSurface,
    fontSize: typography.base,
  },
});
