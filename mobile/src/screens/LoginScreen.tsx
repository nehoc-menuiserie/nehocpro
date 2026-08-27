import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../auth';
import { Button, Field, Input } from '../components/ui';
import { colors } from '../theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    if (!email.trim() || password.length < 6) {
      Alert.alert('Compte', 'Indiquez un e-mail et un mot de passe d’au moins 6 caractères.');
      return;
    }
    if (!configured) {
      Alert.alert('Cloud', 'Les clés Supabase ne sont pas encore configurées.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connexion impossible.';
      Alert.alert('Connexion', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Image source={require('../../assets/logo-nehoc.jpeg')} style={styles.logo} contentFit="cover" />
          <Text style={styles.kicker}>Cloud NEHOC</Text>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Connectez-vous avec votre compte équipe pour accéder à NEHOCPRO.</Text>
          <Field label="E-mail">
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="prenom@nehoc.fr"
              returnKeyType="next"
            />
          </Field>
          <Field label="Mot de passe">
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="mot de passe"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </Field>
          <Button title={busy ? 'Connexion…' : 'Se connecter'} onPress={submit} disabled={busy || !configured} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 8 },
  body: { padding: 16, paddingTop: 48, paddingBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 18 },
  kicker: {
    color: colors.silver,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: 22, lineHeight: 20 },
});
