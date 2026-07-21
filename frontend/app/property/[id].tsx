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
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      // Use public endpoint when anonymous; authed endpoint otherwise.
      const p = user
        ? await api.get<Property>(`/properties/${id}`)
        : await api.get<Property>(`/properties/public/${id}`);
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

  const requireAuth = () => {
    setShowAuthGate(true);
  };

  const toggleFavorite = async () => {
    if (!prop) return;
    if (!user) return requireAuth();
    if (user.role !== "client") {
      toast.info("Seuls les clients peuvent enregistrer des favoris");
      return;
    }
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

  const onInterestPress = () => {
    if (!user) return requireAuth();
    if (user.role !== "client") {
      toast.info("Seuls les clients peuvent exprimer un intérêt");
      return;
    }
    setShowModal(true);
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
  const canInteract = !user || user.role === "client";

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
              const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
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
                <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="detail-fav-btn"
                onPress={toggleFavorite}
                style={styles.circleBtn}
              >
                <Ionicons
                  name={favorite ? "heart" : "heart-outline"}
                  size={20}
                  color={favorite ? colors.error : colors.onSurface}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          {photos.length > 1 ? (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === photoIndex && styles.dotActive]}
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
          </View>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.title}>{prop.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
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
                      size={12}
                      color={colors.brandPrimary}
                    />
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark" size={16} color={colors.brandPrimary} />
            <Text style={styles.noticeText}>
              L'administrateur Lobilmo vous met en relation avec le bailleur
              après validation de votre intérêt.
            </Text>
          </View>
        </View>
      </ScrollView>

      {canInteract ? (
        <View
          style={[
            styles.stickyBar,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <PrimaryButton
            testID="detail-interest-btn"
            title="Je suis intéressé"
            onPress={onInterestPress}
          />
        </View>
      ) : null}

      {/* Interest confirmation modal */}
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
              L'administrateur Lobilmo sera notifié et vous contactera pour la
              mise en relation.
            </Text>
            <TextInput
              testID="interest-message-input"
              value={message}
              onChangeText={setMessage}
              placeholder="Message optionnel (visite préférée...)"
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

      {/* Auth gate modal for anonymous interaction */}
      <Modal
        visible={showAuthGate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAuthGate(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Ionicons
              name="lock-closed"
              size={28}
              color={colors.brandPrimary}
              style={{ alignSelf: "center", marginBottom: spacing.sm }}
            />
            <Text style={styles.modalTitle}>Compte requis</Text>
            <Text style={styles.modalSubtitle}>
              Créez un compte gratuit ou connectez-vous pour continuer.
            </Text>
            <View style={{ height: spacing.md }} />
            <PrimaryButton
              testID="gate-login-btn"
              title="Se connecter"
              onPress={() => {
                setShowAuthGate(false);
                router.push("/(auth)/login");
              }}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              testID="gate-register-btn"
              title="Créer un compte"
              variant="outline"
              onPress={() => {
                setShowAuthGate(false);
                router.push("/(auth)/register");
              }}
            />
            <TouchableOpacity
              style={{ marginTop: spacing.md, alignItems: "center" }}
              onPress={() => setShowAuthGate(false)}
            >
              <Text style={{ color: colors.onSurfaceSecondary }}>
                Continuer sans compte
              </Text>
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
      <Ionicons name={icon} size={18} color={colors.brandPrimary} />
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { width: SW, height: 300 },
  heroImage: { width: SW, height: 300, resizeMode: "cover" },
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
    height: 110,
  },
  heroChrome: { position: "absolute", top: 0, left: 0, right: 0 },
  heroChromeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 10,
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
  dotActive: { backgroundColor: "#fff", width: 16 },
  body: {
    padding: spacing.lg,
    marginTop: -16,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  price: {
    fontSize: typography.xxl,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 2,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  locText: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.sm,
  },
  specsGrid: {
    flexDirection: "row",
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
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 2,
  },
  specLabel: {
    fontSize: typography.xs,
    color: colors.onSurfaceSecondary,
    marginTop: 1,
  },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: typography.base,
    color: colors.onSurfaceSecondary,
    lineHeight: 20,
  },
  amenityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  amenityText: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: typography.xs,
  },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.brandPrimary,
    lineHeight: 18,
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
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  modalSubtitle: {
    color: colors.onSurfaceSecondary,
    marginTop: 4,
    fontSize: typography.sm,
    lineHeight: 18,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 84,
    textAlignVertical: "top",
    marginVertical: spacing.md,
    color: colors.onSurface,
    fontSize: typography.base,
  },
});
