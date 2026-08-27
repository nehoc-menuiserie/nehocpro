import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import {
  AUTHORS,
  OPENING_TYPES,
  POSE_TYPES,
  RAL_OPTIONS,
  SITE_TYPES,
  WORK_TYPES,
  ralHex,
} from './constants';
import { supabase } from './lib/supabase';
import { uid } from './storage';

export type CatalogKind =
  | 'authors'
  | 'site_types'
  | 'work_types'
  | 'opening_types'
  | 'pose_types'
  | 'ral_colors';

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  label: string;
  extra: { hex?: string };
  position: number;
};

const KEY = 'nehocpro_catalogs_v01';

export const CATALOG_SECTIONS: { kind: CatalogKind; title: string; hint: string; color?: boolean }[] = [
  { kind: 'authors', title: 'Responsables du relevé', hint: 'Nathaniel, Michael…' },
  { kind: 'site_types', title: 'Types de chantier', hint: 'Maison, appartement…' },
  { kind: 'work_types', title: 'Nature des travaux', hint: 'Rénovation, neuf…' },
  { kind: 'opening_types', title: 'Types de menuiserie', hint: 'Fenêtre, coulissant…' },
  { kind: 'pose_types', title: 'Types de pose', hint: 'Applique, tunnel…' },
  { kind: 'ral_colors', title: 'Couleurs RAL', hint: 'Nom + code hexadécimal', color: true },
];

function fromLabels(kind: CatalogKind, labels: string[], hexFor?: (label: string) => string | undefined): CatalogItem[] {
  return labels.filter(Boolean).map((label, position) => ({
    id: `${kind}-${position}-${label}`,
    kind,
    label,
    extra: hexFor?.(label) ? { hex: hexFor(label) } : {},
    position,
  }));
}

export function defaultCatalog(): CatalogItem[] {
  return [
    ...fromLabels('authors', [...AUTHORS]),
    ...fromLabels('site_types', SITE_TYPES),
    ...fromLabels('work_types', WORK_TYPES),
    ...fromLabels('opening_types', OPENING_TYPES),
    ...fromLabels('pose_types', POSE_TYPES),
    ...fromLabels(
      'ral_colors',
      RAL_OPTIONS.filter(Boolean),
      (label) => ralHex(label) || undefined
    ),
  ];
}

let liveItems: CatalogItem[] = defaultCatalog();

export function lookupColorHex(value: string) {
  if (!value) return null;
  const hit = liveItems.find(
    (i) => i.kind === 'ral_colors' && (i.label === value || value.startsWith(i.label) || i.label.startsWith(value))
  );
  if (hit?.extra?.hex) return hit.extra.hex;
  return ralHex(value);
}

async function loadLocal(): Promise<CatalogItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaultCatalog();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultCatalog();
  } catch {
    return defaultCatalog();
  }
}

async function saveLocal(items: CatalogItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

async function pullCloud(): Promise<CatalogItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('catalogs').select('*').order('position');
  if (error || !data) return null;
  if (!data.length) return [];
  return data.map((row) => ({
    id: String(row.id),
    kind: row.kind as CatalogKind,
    label: String(row.label || ''),
    extra: (row.extra as CatalogItem['extra']) || {},
    position: Number(row.position || 0),
  }));
}

async function pushCloud(items: CatalogItem[]) {
  if (!supabase) return;
  const { error: delError } = await supabase.from('catalogs').delete().neq('id', '__none__');
  if (delError) throw delError;
  if (!items.length) return;
  const { error } = await supabase.from('catalogs').insert(
    items.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      extra: item.extra,
      position: item.position,
    }))
  );
  if (error) throw error;
}

type CatalogContextValue = {
  items: CatalogItem[];
  ready: boolean;
  labels: (kind: CatalogKind) => string[];
  colorHex: (value: string) => string | null;
  addItem: (kind: CatalogKind, label: string, hex?: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, label: string, hex?: string) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>(defaultCatalog());
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (next: CatalogItem[]) => {
    liveItems = next;
    setItems(next);
    await saveLocal(next);
    if (session) {
      try {
        await pushCloud(next);
      } catch {
        // hors-ligne
      }
    }
  }, [session]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const local = await loadLocal();
      if (!alive) return;
      setItems(local);
      liveItems = local;
      if (session) {
        try {
          const remote = await pullCloud();
          if (remote && remote.length) {
            setItems(remote);
            liveItems = remote;
            await saveLocal(remote);
          } else if (remote && !remote.length) {
            await pushCloud(local);
          }
        } catch {
          // keep local
        }
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      items,
      ready,
      labels: (kind) =>
        items
          .filter((i) => i.kind === kind)
          .sort((a, b) => a.position - b.position)
          .map((i) => i.label),
      colorHex: (value) => lookupColorHex(value),
      addItem: async (kind, label, hex) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const next = [
          ...items,
          {
            id: uid(),
            kind,
            label: trimmed,
            extra: hex ? { hex } : {},
            position: items.filter((i) => i.kind === kind).length,
          },
        ];
        await persist(next);
      },
      removeItem: async (id) => {
        await persist(items.filter((i) => i.id !== id));
      },
      updateItem: async (id, label, hex) => {
        await persist(
          items.map((i) =>
            i.id === id ? { ...i, label: label.trim() || i.label, extra: hex ? { hex } : i.extra } : i
          )
        );
      },
    }),
    [items, persist, ready]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
