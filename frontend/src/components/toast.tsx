/**
 * Simple in-app Toast system (no Alerts).
 * Usage: const toast = useToast(); toast.success("Message"); toast.error(...);
 */
import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/src/theme";

type Kind = "success" | "error" | "info";
type ToastItem = { id: string; kind: Kind; message: string };

type ToastCtx = {
  show: (message: string, kind?: Kind) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback<ToastCtx["show"]>(
    (message, kind = "info") => {
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { id, kind, message }]);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        dismiss(id);
      }, 3200);
    },
    [dismiss, opacity],
  );

  const value = useMemo<ToastCtx>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          { top: insets.top + spacing.sm },
        ]}
      >
        {items.map((it) => (
          <ToastRow key={it.id} item={it} onClose={() => dismiss(it.id)} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastRow({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const bg =
    item.kind === "success"
      ? colors.success
      : item.kind === "error"
        ? colors.error
        : colors.brandPrimary;
  const icon =
    item.kind === "success"
      ? "checkmark-circle"
      : item.kind === "error"
        ? "alert-circle"
        : "information-circle";
  return (
    <TouchableOpacity
      testID={`toast-${item.kind}`}
      activeOpacity={0.9}
      onPress={onClose}
      style={[styles.toast, { backgroundColor: bg }]}
    >
      <Ionicons name={icon as any} size={20} color="#fff" />
      <Text style={styles.toastText} numberOfLines={3}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 9999,
    ...(Platform.OS === "web" ? { pointerEvents: "box-none" as any } : {}),
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    maxWidth: 520,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: spacing.sm,
  },
  toastText: {
    color: "#fff",
    fontSize: typography.base,
    fontWeight: "600",
    flex: 1,
  },
});
