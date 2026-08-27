import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATALOG_SECTIONS, useCatalog, type CatalogKind } from '../catalog';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle } from '../components/ui';
import { colors } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Backoffice'>;

function Section({ kind, title, hint, isColor }: { kind: CatalogKind; title: string; hint: string; isColor?: boolean }) {
  const { items, addItem, removeItem } = useCatalog();
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#701616');
  const list = useMemo(
    () => items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position),
    [items, kind]
  );

  const add = async () => {
    if (!label.trim()) {
      Alert.alert('Back office', 'Indiquez un nom.');
      return;
    }
    await addItem(kind, label, isColor ? hex : undefined);
    setLabel('');
  };

  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <Text style={styles.hint}>{hint}</Text>
      {list.map((item) => (
        <View key={item.id} style={styles.row}>
          {isColor ? <ColorSwatch value={item.label} size={28} /> : null}
          <Text style={styles.itemLabel} numberOfLines={2}>
            {item.label}
            {item.extra.hex ? `  ${item.extra.hex}` : ''}
          </Text>
          <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
            <Text style={styles.delete}>Suppr.</Text>
          </Pressable>
        </View>
      ))}
      <Field label="Nouveau">
        <Input value={label} onChangeText={setLabel} placeholder="Nom à ajouter" />
      </Field>
      {isColor ? (
        <Field label="Couleur écran (#hex)">
          <Input value={hex} onChangeText={setHex} autoCapitalize="none" placeholder="#701616" />
        </Field>
      ) : null}
      <Button title="Ajouter" variant="secondary" onPress={add} />
    </Card>
  );
}

export function BackofficeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Button title="← Accueil" variant="ghost" onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>NEHOCPRO</Text>
          <Text style={styles.title}>Back office</Text>
          <Text style={styles.subtitle}>
            Ajoutez ou retirez les listes utilisées dans les relevés. Les 4 utilisateurs voient les mêmes choix.
          </Text>
          {CATALOG_SECTIONS.map((section) => (
            <Section
              key={section.kind}
              kind={section.kind}
              title={section.title}
              hint={section.hint}
              isColor={section.color}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 8 },
  body: { padding: 16, paddingTop: 8 },
  kicker: {
    color: colors.silver,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: 18, lineHeight: 20 },
  hint: { color: colors.muted, marginBottom: 12, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLabel: { flex: 1, color: colors.text, fontSize: 15 },
  delete: { color: colors.danger, fontWeight: '700', fontSize: 12 },
});
