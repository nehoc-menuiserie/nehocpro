import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { Button, Field, Input } from '../components/ui';
import { colors } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
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
      Alert.alert('Cloud', 'Les clés Supabase ne sont pas encore dans le fichier .env.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(email, password);
        try {
          await signIn(email, password);
        } catch {
          Alert.alert(
            'Compte créé',
            'Validez éventuellement l’e-mail dans Supabase, puis utilisez « J’ai déjà un compte ».'
          );
          setMode('login');
          return;
        }
      } else {
        await signIn(email, password);
      }
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Action impossible.';
      Alert.alert(mode === 'register' ? 'Création du compte' : 'Connexion', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Button title="← Accueil" variant="ghost" onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.kicker}>Cloud NEHOC</Text>
          <Text style={styles.title}>{mode === 'register' ? 'Créer un compte' : 'Se connecter'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'register'
              ? 'Première fois : créez votre compte équipe avec un e-mail et un mot de passe.'
              : 'Entrez l’e-mail et le mot de passe déjà créés.'}
          </Text>
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
              placeholder="au moins 6 caractères"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </Field>
          <Button
            title={
              busy
                ? 'Patientez…'
                : mode === 'register'
                  ? 'Créer le compte'
                  : 'Se connecter'
            }
            onPress={submit}
            disabled={busy || !configured}
          />
          <Pressable
            onPress={() => setMode(mode === 'register' ? 'login' : 'register')}
            style={styles.switch}
            hitSlop={12}
          >
            <Text style={styles.switchText}>
              {mode === 'register' ? 'J’ai déjà un compte → Se connecter' : 'Pas encore de compte → Créer un compte'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 8 },
  body: { padding: 16, paddingTop: 12, paddingBottom: 40 },
  kicker: {
    color: colors.silver,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: 22, lineHeight: 20 },
  switch: { marginTop: 22, paddingVertical: 14, alignItems: 'center' },
  switchText: { color: colors.silverSoft, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
