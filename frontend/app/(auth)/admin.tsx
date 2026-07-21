import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Input, PrimaryButton } from "@/src/components/ui";
import { colors, spacing, typography } from "@/src/theme";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      toast.error("Identifiants requis");
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      if (user.role !== "admin") {
        toast.error("Ce compte n'est pas administrateur");
        setLoading(false);
        return;
      }
      toast.success("Bienvenue, Admin");
      router.replace("/(admin)/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      keyboard
      scroll
      testID="admin-login-screen"
      header={
        <AppHeader
          title="Accès Administrateur"
          leftIcon="chevron-back"
          onLeftPress={() => router.back()}
        />
      }
    >
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Zone restreinte</Text>
        </View>
        <Text style={styles.title}>Portail Admin</Text>
        <Text style={styles.subtitle}>
          Réservé aux administrateurs LobiImo.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <Input
            testID="admin-email-input"
            label="Email admin"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@lobiimo.cd"
            keyboardType="email-address"
          />
          <Input
            testID="admin-password-input"
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <PrimaryButton
            title="Se connecter en tant qu'admin"
            testID="admin-submit-btn"
            onPress={onSubmit}
            loading={loading}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brandTertiary,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: typography.sm,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  title: {
    fontSize: typography.display,
    fontWeight: "800",
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: typography.lg,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
  },
});
