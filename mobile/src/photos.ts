import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { persistPhoto } from './storage';

async function pickFromLibrary(): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos', 'Autorisez l’accès à la photothèque pour joindre des images.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.72,
    selectionLimit: 12,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.map((a) => persistPhoto(a.uri)));
}

async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Caméra', 'Autorisez la caméra pour photographier le chantier.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.72,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return persistPhoto(result.assets[0].uri);
}

export const photos = { pickFromLibrary, takePhoto };
