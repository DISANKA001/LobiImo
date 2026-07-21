import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth";
import { AppHeader, Screen } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { Input, PrimaryButton } from "@/src/components/ui";
import { colors, radius, spacing, typography } from "@/src/theme";

type Role = "client" | "owner";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<Role>("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      toast.error("Nom, email et mot de passe requis");
      return;
    }
    if (password.length < 6) {
      toast.error("Mot de passe : 6 caractères minimum");
      return;
    }
    setLoading(true);
    try {
      const user = await register({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        role,
      });
      toast.success(`Bienvenue sur LobiImo, ${user.name} !`);
      if (user.role === "owner") router.replace("/(owner)/dashboard");
      else router.replace("/(main)/home");
    } catch (e: any) {
      toast.error(e?.message || "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      keyboard
      scroll
      testID="register-screen"
      header={
        <AppHeader
          title="Créer un compte"
          leftIcon="chevron-back"
          onLeftPress={() => router.back()}
        />
      }
    >
      <View style={{ paddingTop: spacing.md }}>
        <Text style={styles.title}>Rejoignez LobiImo</Text>
        <Text style={styles.subtitle}>Je suis un(e)...</Text>

        <View style={styles.segment} testID="register-role-segment">
          <TouchableOpacity
            testID="register-role-client"
            style={[styles.segItem, role === "client" && styles.segActive]}
            onPress={() => setRole("client")}
          >
            <Text
              style={[
                styles.segText,
                role === "client" && styles.segTextActive,
              ]}
            >
              Client
            </Text>
            <Text
              style={[
                styles.segSub,
                role === "client" && { color: "rgba(255,255,255,0.85)" },
              ]}
            >
              Cherche à louer ou acheter
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="register-role-owner"
            style={[styles.segItem, role === "owner" && styles.segActive]}
            onPress={() => setRole("owner")}
          >
            <Text
              style={[
                styles.segText,
                role === "owner" && styles.segTextActive,
              ]}
            >
              Bailleur
            </Text>
            <Text
              style={[
                styles.segSub,
                role === "owner" && { color: "rgba(255,255,255,0.85)" },
              ]}
            >
              Publie ses biens
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Input
            testID="register-name-input"
            label="Nom complet"
            value={name}
            onChangeText={setName}
            placeholder="Jean Kabila"
            autoCapitalize="words"
          />
          <Input
            testID="register-email-input"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
          />
          <Input
            testID="register-phone-input"
            label="Téléphone (optionnel)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+243 ..."
            keyboardType="phone-pad"
          />
          <Input
            testID="register-password-input"
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 caractères"
            secureTextEntry
          />
          <PrimaryButton
            title="Créer mon compte"
            testID="register-submit-btn"
            onPress={onSubmit}
            loading={loading}
          />
          <TouchableOpacity
            style={{ marginTop: spacing.lg, alignItems: "center" }}
            onPress={() => router.replace("/(auth)/login")}
            testID="register-to-login-btn"
          >
            <Text style={{ color: colors.onSurfaceSecondary }}>
              Déjà un compte ?{" "}
              <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>
                Se connecter
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
    fontSize: typography.xxl,
    fontWeight: "800",
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.xs,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: 4,
    marginTop: spacing.md,
    gap: 4,
  },
  segItem: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: "flex-start",
  },
  segActive: {
    backgroundColor: colors.brandPrimary,
  },
  segText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  segTextActive: { color: "#fff" },
  segSub: {
    color: colors.onSurfaceSecondary,
    fontSize: typography.xs,
    marginTop: 2,
  },
});
