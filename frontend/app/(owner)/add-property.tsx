import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/src/api";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { PropertyMap, KINSHASA_CENTER } from "@/src/components/property-map";
import { Input, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";
import { COMMUNES_KINSHASA, TransactionType } from "@/src/types";

const AMENITIES = [
  "Parking",
  "Piscine",
  "Jardin",
  "Sécurité 24/7",
  "Générateur",
  "Climatisation",
  "Meublé",
  "Balcon",
  "Ascenseur",
  "Cuisine équipée",
];

export default function AddProperty() {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<TransactionType>("location");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commune, setCommune] = useState(COMMUNES_KINSHASA[0]);
  const [quartier, setQuartier] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [surface, setSurface] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCommune, setShowCommune] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast.error(
          "Autorisation refusée. Ouvrez les paramètres pour l'accorder.",
        );
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      toast.success("Position enregistrée");
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'obtenir la position");
    } finally {
      setLocating(false);
    }
  };

  const useKinshasaCenter = () => {
    setLat(KINSHASA_CENTER.latitude);
    setLng(KINSHASA_CENTER.longitude);
    toast.info("Position réglée au centre de Kinshasa");
  };

  const clearLocation = () => {
    setLat(null);
    setLng(null);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      toast.error(
        "Autorisation refusée. Ouvrez les paramètres pour l'accorder.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.base64) {
      const uri = `data:image/jpeg;base64,${asset.base64}`;
      setPhotos((prev) => [...prev, uri]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const onSubmit = async () => {
    if (!title || !description || !price || !quartier) {
      toast.error("Titre, description, prix et quartier sont requis");
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Prix invalide");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/properties", {
        title: title.trim(),
        description: description.trim(),
        type,
        price: priceNum,
        commune,
        quartier: quartier.trim(),
        address: address.trim(),
        bedrooms: parseInt(bedrooms || "0", 10),
        bathrooms: parseInt(bathrooms || "0", 10),
        surface: parseFloat(surface || "0"),
        amenities,
        photos,
        lat,
        lng,
      });
      toast.success("Annonce envoyée pour validation admin");
      router.replace("/(owner)/my-properties");
    } catch (e: any) {
      toast.error(e?.message || "Envoi impossible");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      keyboard
      testID="add-property-screen"
      header={<AppHeader title="Nouvelle propriété" />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Type</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            testID="type-location-btn"
            style={[styles.segItem, type === "location" && styles.segActive]}
            onPress={() => setType("location")}
          >
            <Text
              style={[
                styles.segText,
                type === "location" && { color: "#fff" },
              ]}
            >
              Location
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="type-vente-btn"
            style={[styles.segItem, type === "vente" && styles.segActive]}
            onPress={() => setType("vente")}
          >
            <Text
              style={[
                styles.segText,
                type === "vente" && { color: "#fff" },
              ]}
            >
              Vente
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          testID="title-input"
          label="Titre"
          value={title}
          onChangeText={setTitle}
          placeholder="Villa 3 chambres à Gombe"
          autoCapitalize="sentences"
        />
        <Input
          testID="description-input"
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez la propriété..."
          autoCapitalize="sentences"
          multiline
        />
        <Input
          testID="price-input"
          label={type === "location" ? "Loyer mensuel (USD)" : "Prix de vente (USD)"}
          value={price}
          onChangeText={setPrice}
          placeholder={type === "location" ? "800" : "150000"}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Commune</Text>
        <Pressable
          testID="commune-picker"
          style={styles.select}
          onPress={() => setShowCommune((s) => !s)}
        >
          <Text style={styles.selectText}>{commune}</Text>
          <Ionicons
            name={showCommune ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.muted}
          />
        </Pressable>
        {showCommune ? (
          <View style={styles.selectList}>
            {COMMUNES_KINSHASA.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setCommune(c);
                  setShowCommune(false);
                }}
                style={[
                  styles.selectItem,
                  c === commune && { backgroundColor: colors.brandTertiary },
                ]}
              >
                <Text
                  style={{
                    color:
                      c === commune
                        ? colors.brandPrimary
                        : colors.onSurface,
                    fontWeight: c === commune ? "700" : "500",
                  }}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Input
          testID="quartier-input"
          label="Quartier"
          value={quartier}
          onChangeText={setQuartier}
          placeholder="Ex: Ma Campagne"
          autoCapitalize="words"
        />
        <Input
          testID="address-input"
          label="Adresse (optionnel)"
          value={address}
          onChangeText={setAddress}
          placeholder="Avenue..."
        />
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              testID="bedrooms-input"
              label="Chambres"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
              placeholder="2"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              testID="bathrooms-input"
              label="SDB"
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              testID="surface-input"
              label="Surface m²"
              value={surface}
              onChangeText={setSurface}
              keyboardType="numeric"
              placeholder="120"
            />
          </View>
        </View>

        <Text style={styles.section}>Équipements</Text>
        <View style={styles.amenityGrid}>
          {AMENITIES.map((a) => {
            const active = amenities.includes(a);
            return (
              <Pressable
                testID={`amenity-${a}`}
                key={a}
                onPress={() => toggleAmenity(a)}
                style={[styles.amenityChip, active && styles.amenityActive]}
              >
                <Text
                  style={[
                    styles.amenityText,
                    active && { color: "#fff" },
                  ]}
                >
                  {a}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Localisation sur carte</Text>
        {lat != null && lng != null ? (
          <>
            <PropertyMap lat={lat} lng={lng} title={title || "Ma propriété"} height={160} />
            <Text style={styles.locHint}>
              Coordonnées : {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </>
        ) : (
          <View style={styles.locEmpty}>
            <Ionicons name="location-outline" size={22} color={colors.brandPrimary} />
            <Text style={styles.locEmptyText}>
              Ajoutez une position pour afficher la carte du bien.
            </Text>
          </View>
        )}
        <View style={styles.locActions}>
          <TouchableOpacity
            testID="use-current-location-btn"
            onPress={useCurrentLocation}
            disabled={locating}
            style={[styles.locBtn, { backgroundColor: colors.brandPrimary }]}
          >
            <Ionicons name="navigate" size={13} color="#fff" />
            <Text style={styles.locBtnText}>
              {locating ? "Localisation..." : "Ma position"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="use-kinshasa-center-btn"
            onPress={useKinshasaCenter}
            style={[styles.locBtn, styles.locBtnAlt]}
          >
            <Ionicons name="business" size={13} color={colors.brandPrimary} />
            <Text style={[styles.locBtnText, { color: colors.brandPrimary }]}>
              Centre Kinshasa
            </Text>
          </TouchableOpacity>
          {lat != null ? (
            <TouchableOpacity
              testID="clear-location-btn"
              onPress={clearLocation}
              style={[styles.locBtn, styles.locBtnAlt]}
            >
              <Ionicons name="close" size={13} color={colors.error} />
              <Text style={[styles.locBtnText, { color: colors.error }]}>
                Retirer
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>


        <Text style={styles.section}>Photos ({photos.length})</Text>
        <View style={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.photoImg} />
              <TouchableOpacity
                testID={`remove-photo-${i}`}
                onPress={() => removePhoto(i)}
                style={styles.photoRemove}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            testID="add-photo-btn"
            onPress={pickPhoto}
            style={styles.photoAdd}
          >
            <Ionicons name="add" size={28} color={colors.brandPrimary} />
            <Text style={styles.photoAddText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton
            testID="add-submit-btn"
            title="Publier (soumis à validation)"
            onPress={onSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  segItem: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  segActive: { backgroundColor: colors.brandPrimary },
  segText: {
    color: colors.onSurface,
    fontWeight: "700",
  },
  select: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  selectText: {
    fontSize: typography.lg,
    color: colors.onSurface,
  },
  selectList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: -8,
    marginBottom: spacing.md,
    maxHeight: 240,
    overflow: "hidden",
  },
  selectItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  amenityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  amenityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  amenityActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  amenityText: {
    color: colors.onSurface,
    fontWeight: "600",
    fontSize: typography.sm,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: "hidden",
    position: "relative",
  },
  photoImg: { width: "100%", height: "100%", resizeMode: "cover" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  photoAddText: {
    color: colors.brandPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  locEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  locEmptyText: {
    flex: 1,
    color: colors.brandPrimary,
    fontSize: typography.sm,
    lineHeight: 18,
  },
  locHint: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.xs,
    marginTop: 4,
  },
  locActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  locBtnAlt: {
    backgroundColor: colors.brandTertiary,
  },
  locBtnText: {
    color: "#fff",
    fontSize: typography.sm,
    fontWeight: "700",
  },
});
