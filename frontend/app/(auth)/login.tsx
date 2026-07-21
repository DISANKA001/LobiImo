import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Input, PrimaryButton } from "@/src/components/ui";
import { colors, spacing, typography } from "@/src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      toast.error("Email et mot de passe requis");
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(`Bienvenue, ${user.name}`);
      if (user.role === "admin") router.replace("/(admin)/dashboard");
      else if (user.role === "owner") router.replace("/(owner)/dashboard");
      else router.replace("/(client)/home");
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
      testID="login-screen"
      header={
        <AppHeader
          title="Se connecter"
          leftIcon="chevron-back"
          onLeftPress={() => router.back()}
        />
      }
    >
      <View style={{ paddingTop: spacing.lg }}>
        <Text style={styles.title}>Bon retour 👋</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour retrouver vos annonces et vos favoris.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <Input
            testID="login-email-input"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
          />
          <Input
            testID="login-password-input"
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <PrimaryButton
            title="Se connecter"
            testID="login-submit-btn"
            onPress={onSubmit}
            loading={loading}
          />
          <TouchableOpacity
            style={styles.linkWrap}
            onPress={() => router.replace("/(auth)/register")}
            testID="login-to-register-btn"
          >
            <Text style={styles.linkText}>
              Pas de compte ?{" "}
              <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>
                Créer un compte
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  linkWrap: { marginTop: spacing.lg, alignItems: "center" },
  linkText: { color: colors.onSurfaceSecondary, fontSize: typography.base },
});
