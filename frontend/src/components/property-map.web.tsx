/**
 * PropertyMap (web fallback) — uses OpenStreetMap iframe.
 * A separate native version at property-map.tsx uses react-native-maps.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, spacing, typography } from "@/src/theme";

export const KINSHASA_CENTER = { latitude: -4.4419, longitude: 15.2663 };

export function PropertyMap({
  lat,
  lng,
  title,
  height = 180,
}: {
  lat: number;
  lng: number;
  title?: string;
  height?: number;
}) {
  const openInMaps = () => {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    Linking.openURL(url).catch(() => {
      /* ignore */
    });
  };

  const bbox = `${lng - 0.01},${lat - 0.008},${lng + 0.01},${lat + 0.008}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <View style={[styles.wrap, { height }]}>
      {/* @ts-ignore — iframe is valid on web */}
      <iframe
        src={src}
        style={{ width: "100%", height: "100%", border: 0 }}
        title={title || "Carte"}
      />
      <TouchableOpacity
        testID="open-in-maps-btn"
        onPress={openInMaps}
        style={styles.openBtn}
        activeOpacity={0.9}
      >
        <Ionicons name="navigate" size={14} color="#fff" />
        <Text style={styles.openBtnText}>Ouvrir dans Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  openBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  openBtnText: {
    color: "#fff",
    fontSize: typography.xs,
    fontWeight: "700",
  },
});
