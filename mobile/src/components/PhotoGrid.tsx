import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { photos } from '../photos';
import { colors, radius } from '../theme';
import { SmartImage } from './SmartImage';
import { PressScale } from './ui';

export function PhotoGrid({
  uris,
  onChange,
}: {
  uris: string[];
  onChange: (next: string[]) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  const addCamera = async () => {
    const uri = await photos.takePhoto();
    if (uri) onChange([...uris, uri]);
  };
  const addLibrary = async () => {
    const added = await photos.pickFromLibrary();
    if (added.length) onChange([...uris, ...added]);
  };

  return (
    <View>
      <View style={styles.actions}>
        <PressScale onPress={addCamera} style={styles.actionWrap}>
          <View style={styles.action}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionText}>Photo</Text>
          </View>
        </PressScale>
        <PressScale onPress={addLibrary} style={styles.actionWrap}>
          <View style={styles.action}>
            <Text style={styles.actionIcon}>🖼</Text>
            <Text style={styles.actionText}>Galerie</Text>
          </View>
        </PressScale>
      </View>
      {uris.length ? (
        <View style={styles.grid}>
          {uris.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.item}>
              <Pressable onPress={() => setPreview(uri)}>
                <SmartImage source={{ uri }} style={styles.image} contentFit="cover" />
              </Pressable>
              <Pressable style={styles.remove} onPress={() => onChange(uris.filter((_, idx) => idx !== i))}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Aucune photo pour le moment.</Text>
      )}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.preview} onPress={() => setPreview(null)}>
          {preview ? <SmartImage source={{ uri: preview }} style={styles.previewImg} contentFit="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionWrap: { flex: 1 },
  action: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 18, marginBottom: 4 },
  actionText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { width: '31%', aspectRatio: 1, position: 'relative' },
  image: { width: '100%', height: '100%', borderRadius: radius.sm, backgroundColor: colors.surface2 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -1 },
  empty: { color: colors.muted, fontSize: 13 },
  preview: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewImg: { width: '100%', height: '80%' },
});
