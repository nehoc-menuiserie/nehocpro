import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '../catalog';
import { PhotoGrid } from '../components/PhotoGrid';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle, Select } from '../components/ui';
import { useSites } from '../context';
import { composeClientName, createEmptyOpening, createEmptyRoom, createEmptySite, normalizeSite } from '../storage';
import { colors, radius } from '../theme';
import type { Opening, Room, Site, SiteProps } from '../types';

export function SiteScreen({ navigation, route }: SiteProps) {
  const insets = useSafeAreaInsets();
  const { getSite, upsert } = useSites();
  const { labels } = useCatalog();
  const existing = route.params?.siteId ? getSite(route.params.siteId) : undefined;
  const [site, setSite] = useState<Site>(() =>
    existing ? normalizeSite(JSON.parse(JSON.stringify(existing)) as Site) : createEmptySite()
  );
  const [activeRoomId, setActiveRoomId] = useState(site.rooms[0]?.id || '');
  const [saving, setSaving] = useState(false);

  const openingCount = useMemo(
    () => site.rooms.reduce((n, r) => n + r.openings.length, 0),
    [site.rooms]
  );

  const patch = (partial: Partial<Site>) => setSite((s) => ({ ...s, ...partial }));

  const updateRoom = (id: string, partial: Partial<Room>) => {
    setSite((s) => ({
      ...s,
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    }));
  };

  const updateOpening = (roomId: string, openingId: string, partial: Partial<Opening>) => {
    setSite((s) => ({
      ...s,
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : { ...r, openings: r.openings.map((o) => (o.id === openingId ? { ...o, ...partial } : o)) }
      ),
    }));
  };

  const addRoom = () => {
    const room = createEmptyRoom();
    setSite((s) => ({ ...s, rooms: [...s.rooms, room] }));
    setActiveRoomId(room.id);
  };

  const addOpening = (roomId?: string) => {
    const targetId = roomId || activeRoomId || site.rooms.at(-1)?.id;
    if (!targetId) {
      const room = createEmptyRoom();
      room.openings = [createEmptyOpening()];
      setSite((s) => ({ ...s, rooms: [...s.rooms, room] }));
      setActiveRoomId(room.id);
      return;
    }
    const opening = createEmptyOpening();
    setSite((s) => ({
      ...s,
      rooms: s.rooms.map((r) => (r.id === targetId ? { ...r, openings: [...r.openings, opening] } : r)),
    }));
    setActiveRoomId(targetId);
  };

  const validate = () => {
    if (!site.author) {
      Alert.alert('Relevé', 'Sélectionnez la personne qui effectue le relevé.');
      return false;
    }
    if (!site.clientFirstName.trim() || !site.clientLastName.trim()) {
      Alert.alert('Relevé', 'Indiquez le prénom et le nom du client.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await upsert(site);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Enregistré', 'Le chantier a été enregistré sur cet appareil.');
    } finally {
      setSaving(false);
    }
  };

  const onReport = async () => {
    if (!validate()) return;
    await upsert(site);
    navigation.navigate('Report', { siteId: site.id });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Button title="← Accueil" variant="ghost" onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{existing ? 'Chantier' : 'Nouveau chantier'}</Text>
          <Text style={styles.headerMeta}>
            {site.rooms.length} pièce{site.rooms.length > 1 ? 's' : ''} · {openingCount} menuiserie
            {openingCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 84 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 150 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <SectionTitle>Responsable du relevé</SectionTitle>
            <Select
              label="Relevé effectué par *"
              value={site.author}
              options={['', ...labels('authors')]}
              placeholder="Sélectionner"
              onChange={(author) => patch({ author })}
            />
          </Card>

          <Card>
            <SectionTitle>Client et chantier</SectionTitle>
            <Field label="Prénom *">
              <Input
                value={site.clientFirstName}
                onChangeText={(clientFirstName) =>
                  patch({
                    clientFirstName,
                    clientName: composeClientName(clientFirstName, site.clientLastName),
                  })
                }
              />
            </Field>
            <Field label="Nom *">
              <Input
                value={site.clientLastName}
                onChangeText={(clientLastName) =>
                  patch({
                    clientLastName,
                    clientName: composeClientName(site.clientFirstName, clientLastName),
                  })
                }
              />
            </Field>
            <Field label="Adresse du chantier">
              <Input value={site.address} onChangeText={(address) => patch({ address })} />
            </Field>
            <Field label="Téléphone">
              <Input
                value={site.clientPhone}
                onChangeText={(clientPhone) => patch({ clientPhone })}
                keyboardType="phone-pad"
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={site.clientEmail}
                onChangeText={(clientEmail) => patch({ clientEmail })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>
            <Select
              label="Type de chantier"
              value={site.siteType}
              options={labels('site_types')}
              onChange={(siteType) => patch({ siteType })}
            />
            <Select
              label="Nature des travaux"
              value={site.workType}
              options={labels('work_types')}
              onChange={(workType) => patch({ workType })}
            />
            <Field label="Notes générales">
              <Input
                value={site.generalNotes}
                onChangeText={(generalNotes) => patch({ generalNotes })}
                multiline
                style={styles.textarea}
              />
            </Field>
          </Card>

          <Card>
            <SectionTitle>Photos générales</SectionTitle>
            <PhotoGrid uris={site.generalPhotos} onChange={(generalPhotos) => patch({ generalPhotos })} />
          </Card>

          <View style={styles.sectionHead}>
            <Text style={styles.blockTitle}>Pièces et menuiseries</Text>
            <Button title="+ Pièce" variant="secondary" onPress={addRoom} />
          </View>

          {site.rooms.map((room, index) => (
            <Animated.View key={room.id} layout={LinearTransition.springify()} entering={FadeInUp.springify()}>
              <Card style={activeRoomId === room.id ? styles.roomActive : styles.roomCard}>
                <View style={styles.sectionHead}>
                  <Text style={styles.roomTitle}>Pièce {index + 1}</Text>
                  <Button
                    title="Supprimer"
                    variant="danger"
                    onPress={() => {
                      setSite((s) => ({ ...s, rooms: s.rooms.filter((r) => r.id !== room.id) }));
                    }}
                  />
                </View>
                <Field label="Nom de la pièce">
                  <Input
                    value={room.name}
                    placeholder="Ex. Séjour, Chambre 1…"
                    onFocus={() => setActiveRoomId(room.id)}
                    onChangeText={(name) => updateRoom(room.id, { name })}
                  />
                </Field>
                <Field label="Notes sur la pièce">
                  <Input
                    value={room.notes}
                    multiline
                    style={styles.textareaSm}
                    onFocus={() => setActiveRoomId(room.id)}
                    onChangeText={(notes) => updateRoom(room.id, { notes })}
                  />
                </Field>
                {room.openings.map((op, oi) => (
                  <View key={op.id} style={styles.opening}>
                    <View style={styles.sectionHead}>
                      <Text style={styles.openingTitle}>Menuiserie {oi + 1}</Text>
                      <Button
                        title="Supprimer"
                        variant="danger"
                        onPress={() =>
                          updateRoom(room.id, {
                            openings: room.openings.filter((o) => o.id !== op.id),
                          })
                        }
                      />
                    </View>
                    <Select
                      label="Type"
                      value={op.type}
                      options={labels('opening_types')}
                      onChange={(type) => updateOpening(room.id, op.id, { type })}
                    />
                    <Field label="Repère">
                      <Input
                        value={op.ref}
                        placeholder="Ex. F01"
                        onChangeText={(ref) => updateOpening(room.id, op.id, { ref })}
                      />
                    </Field>
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <Field label="Largeur (mm)">
                          <Input
                            value={op.width}
                            keyboardType="numeric"
                            onChangeText={(width) => updateOpening(room.id, op.id, { width })}
                          />
                        </Field>
                      </View>
                      <View style={styles.col}>
                        <Field label="Hauteur (mm)">
                          <Input
                            value={op.height}
                            keyboardType="numeric"
                            onChangeText={(height) => updateOpening(room.id, op.id, { height })}
                          />
                        </Field>
                      </View>
                    </View>
                    <Select
                      label="Type de pose"
                      value={op.pose}
                      options={labels('pose_types')}
                      onChange={(pose) => updateOpening(room.id, op.id, { pose })}
                    />
                    <Field label="Quantité">
                      <Input
                        value={op.quantity}
                        keyboardType="numeric"
                        onChangeText={(quantity) => updateOpening(room.id, op.id, { quantity })}
                      />
                    </Field>
                    <Text style={styles.colorLabel}>Couleur extérieure (RAL)</Text>
                    <View style={styles.colorRow}>
                      <ColorSwatch value={op.colorRal} size={42} />
                      <View style={{ flex: 1 }}>
                        <Select
                          value={op.colorRal}
                          options={[
                            { value: '', label: 'À définir' },
                            ...labels('ral_colors').map((v) => ({ value: v, label: v })),
                          ]}
                          onChange={(colorRal) => updateOpening(room.id, op.id, { colorRal })}
                        />
                      </View>
                    </View>
                    <Field label="Notes">
                      <Input
                        value={op.notes}
                        multiline
                        style={styles.textareaSm}
                        onChangeText={(notes) => updateOpening(room.id, op.id, { notes })}
                      />
                    </Field>
                    <PhotoGrid
                      uris={op.photos}
                      onChange={(photos) => updateOpening(room.id, op.id, { photos })}
                    />
                  </View>
                ))}
                <Button title="+ Ajouter une menuiserie" variant="secondary" onPress={() => addOpening(room.id)} />
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.stickyRow}>
          <Button title="+ Pièce" variant="outline" onPress={addRoom} style={styles.stickyBtn} />
          <Button title="+ Menuiserie" variant="outline" onPress={() => addOpening()} style={styles.stickyBtn} />
        </View>
        <View style={styles.stickyRow}>
          <Button
            title={saving ? 'Enregistrement…' : 'Enregistrer'}
            onPress={onSave}
            disabled={saving}
            style={styles.stickyBtn}
          />
          <Button title="Rapport PDF" variant="secondary" onPress={onReport} style={styles.stickyBtn} />
        </View>
      </View>
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
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  headerMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  scroll: { padding: 16 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  textareaSm: { minHeight: 68, textAlignVertical: 'top' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  blockTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  roomCard: { borderLeftWidth: 4, borderLeftColor: colors.silver },
  roomActive: { borderLeftWidth: 4, borderLeftColor: colors.silverSoft },
  roomTitle: { color: colors.silverSoft, fontSize: 16, fontWeight: '800' },
  opening: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  openingTitle: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  colorLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  colorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,12,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    gap: 8,
  },
  stickyRow: { flexDirection: 'row', gap: 8 },
  stickyBtn: { flex: 1 },
});
