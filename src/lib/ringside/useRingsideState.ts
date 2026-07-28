'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { RingsideState } from './types';
export function useRingsideState(showNumber: string) {
  const [state, setState] = useState<RingsideState | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const load = useCallback(async () => {
    const r = await fetch(`/api/ringside/${showNumber}/state`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Unable to load Ringside show');
    setState(j);
  }, [showNumber]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`ringside:${showNumber}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringside_shows' }, () =>
        load()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringside_rings' }, () =>
        load()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringside_blocks' }, () =>
        load()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringside_entries' }, () =>
        load()
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, showNumber]);
  return { state, error, connected, reload: load };
}
