import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/src/theme";
import { Property, TransactionType, formatUSD } from "@/src/types";

/* ------------------------------------------------------------------ Button */
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  testID,
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  testID?: string;
  style?: ViewStyle;
}) {
  const { TouchableOpacity, ActivityIndicator } = require("react-native");
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.brandSecondary,
    outline: "transparent",
    ghost: "transparent",
    danger: colors.error,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onBrandSecondary,
    outline: colors.brandPrimary,
    ghost: colors.brandPrimary,
    danger: "#fff",
  }[variant];
  const borderColor =
    variant === "outline" ? colors.brandPrimary : "transparent";
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "outline" ? 1.5 : 0,
          paddingVertical: 12,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          minHeight: 44,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={{
            color: fg,
            fontSize: typography.base,
            fontWeight: "700",
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------- Input */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  multiline,
  testID,
  error,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  testID?: string;
  error?: string;
  editable?: boolean;
}) {
  const { TextInput } = require("react-native");
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
        style={[
          styles.input,
          multiline && { height: 96, textAlignVertical: "top" },
          error ? { borderColor: colors.error } : null,
          !editable && { backgroundColor: colors.surfaceSecondary },
        ]}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------- Badge */
export function Badge({
  label,
  variant = "primary",
  testID,
}: {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "muted";
  testID?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    primary: { bg: colors.brandTertiary, fg: colors.brandPrimary },
    secondary: { bg: "#CFF0EE", fg: colors.brandSecondary },
    success: { bg: "#D1FAE5", fg: "#047857" },
    warning: { bg: "#FEF3C7", fg: "#B45309" },
    error: { bg: "#FEE2E2", fg: "#B91C1C" },
    muted: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  };
  const { bg, fg } = map[variant];
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: bg,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: fg, fontSize: typography.xs, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------- PropertyCard */
export function PropertyCard({
  property,
  onPress,
  compact,
}: {
  property: Property;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { TouchableOpacity, Image } = require("react-native");
  const firstPhoto = property.photos?.[0];
  const priceLabel =
    property.type === "location"
      ? `${formatUSD(property.price)}/mois`
      : formatUSD(property.price);
  return (
    <TouchableOpacity
      testID={`property-card-${property.id}`}
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardImageWrap}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.cardImage,
              {
                backgroundColor: colors.surfaceTertiary,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ color: colors.muted }}>Pas de photo</Text>
          </View>
        )}
        <View style={styles.cardBadge}>
          <Badge
            label={property.type === "location" ? "Location" : "Vente"}
            variant={property.type === "location" ? "primary" : "secondary"}
          />
        </View>
        {property.status !== "published" ? (
          <View style={[styles.cardBadge, { top: 44 }]}>
            <Badge
              label={property.status}
              variant={
                property.status === "pending"
                  ? "warning"
                  : property.status === "rejected"
                    ? "error"
                    : "muted"
              }
            />
          </View>
        ) : null}
      </View>
      <View style={{ padding: spacing.md }}>
        <Text style={styles.cardPrice}>{priceLabel}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {property.title}
        </Text>
        <Text style={styles.cardLocation} numberOfLines={1}>
          {property.quartier}, {property.commune}
        </Text>
        {!compact ? (
          <View style={styles.cardSpecs}>
            <SpecItem label={`${property.bedrooms} ch`} />
            <View style={styles.dot} />
            <SpecItem label={`${property.bathrooms} sdb`} />
            <View style={styles.dot} />
            <SpecItem label={`${property.surface} m²`} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SpecItem({ label }: { label: string }) {
  return (
    <Text style={{ color: colors.onSurfaceSecondary, fontSize: typography.sm }}>
      {label}
    </Text>
  );
}

/* ---------------------------------------------------- EmptyState / Section */
export function EmptyState({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.empty}>
      <View style={styles.emptyDot} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  actionLabel,
  style,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
  style?: TextStyle;
}) {
  const { TouchableOpacity } = require("react-native");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
      }}
    >
      <Text style={[styles.sectionTitle, style]}>{title}</Text>
      {action && actionLabel ? (
        <TouchableOpacity onPress={action}>
          <Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- styles */
const styles = StyleSheet.create({
  inputLabel: {
    fontSize: typography.xs,
    color: colors.onSurfaceSecondary,
    marginBottom: 4,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    minHeight: 42,
  },
  inputError: {
    color: colors.error,
    fontSize: typography.xs,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 16 / 10,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardBadge: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  cardPrice: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
  },
  cardLocation: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: 1,
  },
  cardSpecs: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  emptyDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandTertiary,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
  },
});
