import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type Opening = {
  id: string;
  type: string;
  ref: string;
  width: string;
  height: string;
  pose: string;
  quantity: string;
  colorRal: string;
  notes: string;
  photos: string[];
};

export type Room = {
  id: string;
  name: string;
  notes: string;
  openings: Opening[];
};

export type Site = {
  id: string;
  author: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  siteType: string;
  workType: string;
  followUpStatus: string;
  generalNotes: string;
  generalPhotos: string[];
  rooms: Room[];
  updatedAt: string;
};

export type RootStackParamList = {
  Home: undefined;
  Site: { siteId?: string };
  Report: { siteId: string };
  Backoffice: undefined;
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type SiteProps = NativeStackScreenProps<RootStackParamList, 'Site'>;
export type ReportProps = NativeStackScreenProps<RootStackParamList, 'Report'>;
