/**
 * PropertyMap (native — iOS/Android) — uses react-native-maps.
 * A .web.tsx sibling handles the web fallback (OpenStreetMap iframe).
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

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
    const label = encodeURIComponent(title || "Bien immobilier");
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url).catch(() => {
      /* ignore */
    });
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        pointerEvents="none"
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={title} />
      </MapView>
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
