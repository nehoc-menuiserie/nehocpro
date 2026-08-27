import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmartImage } from '../components/SmartImage';
import { Button, PressScale } from '../components/ui';
import { authorFullName } from '../constants';
import { useAuth } from '../auth';
import { useSites } from '../context';
import { exportBackup, importBackup } from '../storage';
import { colors, radius } from '../theme';
import type { HomeProps, Site } from '../types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function countOpenings(site: Site) {
  return site.rooms.reduce((n, r) => n + r.openings.length, 0);
}

export function HomeScreen({ navigation }: HomeProps) {
  const insets = useSafeAreaInsets();
  const { sites, ready, syncing, remove, replaceAll, syncNow } = useSites();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) =>
      [s.clientName, s.address, s.author, s.siteType].join(' ').toLowerCase().includes(q)
    );
  }, [query, sites]);

  const onExport = async () => {
    try {
      setBusy(true);
      await exportBackup(sites);
    } catch {
      Alert.alert('Sauvegarde', 'Impossible d’exporter la sauvegarde.');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      const imported = await importBackup();
      if (!imported) return;
      await replaceAll(imported);
      Alert.alert('Import', `${imported.length} chantier(s) importé(s).`);
    } catch {
      Alert.alert('Import', 'Fichier non valide.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (site: Site) => {
    Alert.alert('Supprimer', `Supprimer le chantier « ${site.clientName || 'Sans nom'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          remove(site.id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1C1C20', colors.bg]} style={styles.hero}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/logo-nehoc.jpeg')} style={styles.logo} contentFit="cover" />
          <View style={styles.brandText}>
            <Text style={styles.kicker}>Menuiserie aluminium</Text>
            <Text style={styles.title}>NEHOCPRO</Text>
            <Text style={styles.subtitle}>Relevés de chantier</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{sites.length}</Text>
            <Text style={styles.statLabel}>Chantiers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{sites.reduce((n, s) => n + countOpenings(s), 0)}</Text>
            <Text style={styles.statLabel}>Menuiseries</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.toolbar}>
        <Button title="Sauvegarde" variant="secondary" onPress={onExport} style={styles.toolBtn} />
        <Button title="Importer" variant="outline" onPress={onImport} style={styles.toolBtn} />
      </View>
      <View style={styles.toolbar}>
        <Button
          title={syncing ? 'Sync…' : 'Synchroniser'}
          variant="secondary"
          onPress={async () => {
            try {
              setBusy(true);
              await syncNow();
            } catch {
              Alert.alert('Cloud', 'Synchronisation impossible. Vérifiez le réseau.');
            } finally {
              setBusy(false);
            }
          }}
          style={styles.toolBtn}
        />
        <Button title="Déconnexion" variant="outline" onPress={() => signOut()} style={styles.toolBtn} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un client, une adresse…"
          placeholderTextColor={colors.muted2}
          style={styles.search}
        />
      </View>

      <Button
        title="+ Nouveau chantier"
        onPress={() => navigation.navigate('Site', {})}
        style={styles.cta}
      />

      {!ready || busy ? (
        <ActivityIndicator color={colors.silver} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun chantier</Text>
              <Text style={styles.emptyText}>
                Créez un relevé, photographiez les menuiseries et générez le rapport PDF.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify()}>
              <PressScale onPress={() => navigation.navigate('Site', { siteId: item.id })}>
                <View style={styles.card}>
                  {item.generalPhotos[0] ? (
                    <SmartImage source={{ uri: item.generalPhotos[0] }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbFallback}>
                      <Text style={styles.thumbLetter}>
                        {(item.clientName || 'N').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.clientName || 'Sans nom'}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.address || 'Adresse non renseignée'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {authorFullName(item.author) || 'Responsable ?'} · {formatDate(item.updatedAt)}
                    </Text>
                    <Text style={styles.cardCount}>
                      {item.rooms.length} pièce{item.rooms.length > 1 ? 's' : ''} · {countOpenings(item)} menuiserie
                      {countOpenings(item) > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <PressScale onPress={() => confirmDelete(item)}>
                    <View style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>Suppr.</Text>
                    </View>
                  </PressScale>
                </View>
              </PressScale>
            </Animated.View>
          )}
        />
      )}
      <Pressable onPress={() => navigation.navigate('Backoffice')} hitSlop={12}>
        <Text style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>back office</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#111' },
  brandText: { flex: 1 },
  kicker: {
    color: colors.silver,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 2,
  },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: 14 },
  stats: {
    marginTop: 18,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: colors.silverSoft, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2, letterSpacing: 0.4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 8 },
  toolBtn: { flex: 1 },
  searchWrap: { paddingHorizontal: 20, marginTop: 12 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  cta: { marginHorizontal: 20, marginTop: 12 },
  list: { padding: 20, paddingTop: 16, paddingBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  thumb: { width: 62, height: 62, borderRadius: 12, backgroundColor: colors.surface2 },
  thumbFallback: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbLetter: { color: colors.silver, fontSize: 22, fontWeight: '800' },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  cardCount: { color: colors.silver, fontSize: 12, marginTop: 4, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  empty: {
    padding: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  footer: {
    textAlign: 'center',
    color: colors.muted2,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
