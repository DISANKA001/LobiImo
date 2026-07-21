import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/src/theme";

/**
 * Standard screen wrapper: SafeArea + white background + optional header.
 */
export function Screen({
  children,
  scroll = false,
  keyboard = false,
  header,
  testID,
  edges = ["top"],
  contentContainerStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  header?: React.ReactNode;
  testID?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  contentContainerStyle?: any;
}) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? {
        contentContainerStyle: [
          styles.body,
          contentContainerStyle,
        ],
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: false,
      }
    : { style: [styles.body, contentContainerStyle] };

  const inner = (
    <SafeAreaView
      testID={testID}
      style={styles.safe}
      edges={edges}
    >
      {header}
      <Body {...(bodyProps as any)}>{children}</Body>
    </SafeAreaView>
  );

  if (keyboard) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }
  return inner;
}

export function AppHeader({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  onTitlePress,
  testID,
}: {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  onTitlePress?: () => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.header}>
      <View style={styles.headerRow}>
        {leftIcon ? (
          <TouchableOpacity
            testID="header-left-btn"
            onPress={onLeftPress}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={leftIcon} size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconBtn} />
        )}
        <TouchableOpacity
          onPress={onTitlePress}
          disabled={!onTitlePress}
          activeOpacity={0.85}
          style={styles.headerTitleWrap}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </TouchableOpacity>
        {rightIcon ? (
          <TouchableOpacity
            testID="header-right-btn"
            onPress={onRightPress}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconBtn} />
        )}
      </View>
    </View>
  );
}

export function FloatingActionButton({
  icon = "add",
  onPress,
  testID,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.fab,
        { bottom: Math.max(insets.bottom + 70, 90) },
      ]}
    >
      <Ionicons name={icon} size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: typography.sm,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});
