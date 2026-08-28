import { Image } from 'expo-image';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmartImage } from '../components/SmartImage';
import { Button, ColorSwatch } from '../components/ui';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { buildReportHtml } from '../reportHtml';
import { colors, radius } from '../theme';
import type { ReportProps } from '../types';

export function ReportScreen({ navigation, route }: ReportProps) {
  const insets = useSafeAreaInsets();
  const { getSite } = useSites();
  const site = getSite(route.params.siteId);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => site?.rooms.reduce((n, r) => n + r.openings.length, 0) ?? 0,
    [site]
  );

  if (!site) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Button title="← Retour" variant="ghost" onPress={() => navigation.goBack()} />
        <Text style={styles.missing}>Chantier introuvable.</Text>
      </View>
    );
  }

  const tel = (site.clientPhone || '').replace(/[^\d+]/g, '');
  const mail = (site.clientEmail || '').trim();

  const callClient = async () => {
    if (!tel) {
      Alert.alert('Téléphone', 'Ajoutez le numéro du client sur la fiche chantier.');
      return;
    }
    const url = `tel:${tel}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Téléphone', 'Impossible d’ouvrir l’appel.');
    }
  };

  const emailClient = async () => {
    if (!mail || !mail.includes('@')) {
      Alert.alert('E-mail', 'Ajoutez l’e-mail du client sur la fiche chantier.');
      return;
    }
    const subject = encodeURIComponent(`NEHOC — ${site.clientName || 'Chantier'}`);
    const url = `mailto:${mail}?subject=${subject}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('E-mail', 'Impossible d’ouvrir la messagerie.');
    }
  };

  const sharePdf = async () => {
    try {
      setBusy(true);
      const html = await buildReportHtml(site);
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Rapport NEHOC',
        });
      } else {
        Alert.alert('PDF', 'Le partage n’est pas disponible sur cet appareil.');
      }
    } catch {
      Alert.alert('PDF', 'Impossible de générer le rapport.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Button title="← Chantier" variant="ghost" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Rapport</Text>
        <View style={{ width: 92 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 28 + insets.bottom }]}>
        <View style={styles.hero}>
          <Image source={require('../../assets/logo-nehoc.jpeg')} style={styles.logo} contentFit="cover" />
          <Text style={styles.kicker}>Visite de chantier</Text>
          <Text style={styles.client}>{site.clientName}</Text>
          <Text style={styles.meta}>{site.address || 'Adresse non renseignée'}</Text>
          <Text style={styles.meta}>
            {authorFullName(site.author)} · {site.siteType} · {site.workType}
          </Text>
        </View>

        <View style={styles.contactRow}>
          <Button
            title={tel ? 'Appeler' : 'Pas de téléphone'}
            onPress={callClient}
            disabled={!tel}
            style={styles.contactBtn}
          />
          <Button
            title={mail.includes('@') ? 'E-mail' : 'Pas d’e-mail'}
            variant="secondary"
            onPress={emailClient}
            disabled={!mail || !mail.includes('@')}
            style={styles.contactBtn}
          />
        </View>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillNum}>{site.rooms.length}</Text>
            <Text style={styles.pillLabel}>Pièces</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillNum}>{total}</Text>
            <Text style={styles.pillLabel}>Menuiseries</Text>
          </View>
        </View>

        {site.generalPhotos[0] ? (
          <SmartImage source={{ uri: site.generalPhotos[0] }} style={styles.cover} contentFit="cover" />
        ) : null}

        {site.generalNotes ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Observations</Text>
            <Text style={styles.notes}>{site.generalNotes}</Text>
          </View>
        ) : null}

        {site.rooms.map((room) => (
          <View key={room.id} style={styles.block}>
            <Text style={styles.blockTitle}>{room.name || 'Pièce'}</Text>
            {room.notes ? <Text style={styles.notes}>{room.notes}</Text> : null}
            {room.openings.map((op) => (
              <View key={op.id} style={styles.opening}>
                {op.photos[0] ? (
                  <SmartImage source={{ uri: op.photos[0] }} style={styles.opPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.opPhoto, styles.opPhotoEmpty]}>
                    <Text style={styles.emptyPhoto}>Sans photo</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.opTitle}>
                    {op.type}
                    {op.ref ? ` — ${op.ref}` : ''}
                  </Text>
                  <Text style={styles.opMeta}>
                    {op.width || op.height ? `${op.width || '—'} × ${op.height || '—'} mm` : 'Dimensions à définir'}
                    {' · '}qté {op.quantity || '1'}
                  </Text>
                  <Text style={styles.opMeta}>{op.pose}</Text>
                  <View style={styles.colorLine}>
                    <ColorSwatch value={op.colorRal} size={18} />
                    <Text style={styles.opMeta}>{op.colorRal || 'Couleur à définir'}</Text>
                  </View>
                  {op.notes ? <Text style={styles.opNotes}>{op.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        <Button
          title={busy ? 'Génération du PDF…' : 'Partager / enregistrer le PDF'}
          onPress={sharePdf}
          disabled={busy}
        />
        {busy ? <ActivityIndicator color={colors.silver} style={{ marginTop: 16 }} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  missing: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  scroll: { padding: 16 },
  hero: { alignItems: 'center', marginBottom: 18 },
  logo: { width: 88, height: 88, borderRadius: 18, marginBottom: 12 },
  kicker: {
    color: colors.silver,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  client: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  meta: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  contactBtn: { flex: 1 },
  pills: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  pillNum: { color: colors.silverSoft, fontSize: 22, fontWeight: '800' },
  pillLabel: { color: colors.muted, marginTop: 2 },
  cover: { width: '100%', height: 190, borderRadius: radius.lg, marginBottom: 14 },
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  blockTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  notes: { color: colors.silverSoft, lineHeight: 20 },
  opening: { flexDirection: 'row', gap: 10, marginTop: 12 },
  opPhoto: { width: 76, height: 76, borderRadius: 12, backgroundColor: colors.surface2 },
  opPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  emptyPhoto: { color: colors.muted2, fontSize: 10 },
  opTitle: { color: colors.text, fontWeight: '700' },
  opMeta: { color: colors.muted, fontSize: 12, marginTop: 3, flexShrink: 1 },
  opNotes: { color: colors.silverSoft, fontSize: 12, marginTop: 6 },
  colorLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
});
