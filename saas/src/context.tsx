import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { deleteCloudSite, mergeSites, pullSites, pushSite } from './lib/sync';
import { isSupabaseConfigured } from './lib/supabase';
import { loadSites, saveSites } from './storage';
import type { Site } from './types';

type SitesContextValue = {
  sites: Site[];
  ready: boolean;
  syncing: boolean;
  upsert: (site: Site) => Promise<void>;
  remove: (id: string) => Promise<void>;
  replaceAll: (next: Site[]) => Promise<void>;
  getSite: (id: string) => Site | undefined;
  syncNow: () => Promise<void>;
};

const SitesContext = createContext<SitesContextValue | null>(null);

export function SitesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setSites(loadSites());
    setReady(true);
  }, []);

  const persist = useCallback(async (next: Site[]) => {
    setSites(next);
    saveSites(next);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isSupabaseConfigured || !session) return;
    setSyncing(true);
    try {
      const remote = await pullSites();
      const local = loadSites();
      const merged = mergeSites(local, remote);
      await persist(merged);
      for (const site of merged) {
        await pushSite(site);
      }
    } finally {
      setSyncing(false);
    }
  }, [persist, session]);

  useEffect(() => {
    if (ready && session) {
      syncNow().catch(() => {});
    }
  }, [ready, session, syncNow]);

  const upsert = useCallback(
    async (site: Site) => {
      const stamped = { ...site, updatedAt: new Date().toISOString() };
      const next = [stamped, ...sites.filter((s) => s.id !== stamped.id)];
      await persist(next);
      if (session) {
        try {
          await pushSite(stamped);
        } catch {
          /* hors-ligne */
        }
      }
    },
    [persist, session, sites]
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(sites.filter((s) => s.id !== id));
      if (session) {
        try {
          await deleteCloudSite(id);
        } catch {
          /* ignore */
        }
      }
    },
    [persist, session, sites]
  );

  const replaceAll = useCallback(
    async (next: Site[]) => {
      await persist(next);
    },
    [persist]
  );

  const getSite = useCallback((id: string) => sites.find((s) => s.id === id), [sites]);

  const value = useMemo(
    () => ({ sites, ready, syncing, upsert, remove, replaceAll, getSite, syncNow }),
    [sites, ready, syncing, upsert, remove, replaceAll, getSite, syncNow]
  );

  return <SitesContext.Provider value={value}>{children}</SitesContext.Provider>;
}

export function useSites() {
  const ctx = useContext(SitesContext);
  if (!ctx) throw new Error('useSites must be used within SitesProvider');
  return ctx;
}
