'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { RingsideState } from './types';
import {
  createReloadCoordinator,
  applyRingsideRealtimeRecord,
  mergeRingsideMutation,
  type RingsideMutation,
} from './stateSync';
export function useRingsideState(showNumber: string) {
  const [state, setState] = useState<RingsideState | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const coordinatorRef = useRef<ReturnType<typeof createReloadCoordinator<RingsideState>> | null>(
    null
  );
  const fetchState = useCallback(
    async (signal: AbortSignal) => {
      const r = await fetch(`/api/ringside/${showNumber}/state`, {
        cache: 'no-store',
        signal,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to load Ringside show');
      return j as RingsideState;
    },
    [showNumber]
  );

  useEffect(() => {
    const coordinator = createReloadCoordinator(
      fetchState,
      (next) => {
        setState(next);
        setError('');
      },
      (nextError) => setError(nextError instanceof Error ? nextError.message : 'Unable to reload')
    );
    coordinatorRef.current = coordinator;
    void coordinator.run();
    return () => {
      coordinator.dispose();
      if (coordinatorRef.current === coordinator) coordinatorRef.current = null;
    };
  }, [fetchState]);

  const ringIds = useMemo(
    () =>
      state?.rings
        .map((ring) => ring.id)
        .sort()
        .join(',') || '',
    [state]
  );
  const blockIds = useMemo(
    () =>
      state?.blocks
        .map((block) => block.id)
        .sort()
        .join(',') || '',
    [state]
  );

  useEffect(() => {
    if (!state) return;
    const supabase = getSupabaseBrowser();
    let channel = supabase.channel(`ringside:${showNumber}:${state.show.id}`);
    const applyRealtime =
      (table: 'ringside_shows' | 'ringside_rings' | 'ringside_blocks' | 'ringside_entries') =>
      (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      }) => {
        const record = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (!record?.id) return coordinatorRef.current?.schedule();
        setState((current) =>
          current ? applyRingsideRealtimeRecord(current, table, payload.eventType, record) : current
        );
      };
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ringside_shows', filter: `id=eq.${state.show.id}` },
      applyRealtime('ringside_shows')
    );
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ringside_rings',
        filter: `show_id=eq.${state.show.id}`,
      },
      applyRealtime('ringside_rings')
    );
    for (const ringId of ringIds ? ringIds.split(',') : []) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ringside_blocks', filter: `ring_id=eq.${ringId}` },
        applyRealtime('ringside_blocks')
      );
    }
    for (const blockId of blockIds ? blockIds.split(',') : []) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ringside_entries',
          filter: `block_id=eq.${blockId}`,
        },
        applyRealtime('ringside_entries')
      );
    }
    let subscribedOnce = false;
    let disconnectedAfterSubscribe = false;
    channel.subscribe((status) => {
      const isConnected = status === 'SUBSCRIBED';
      setConnected(isConnected);
      if (isConnected) {
        if (subscribedOnce && disconnectedAfterSubscribe) coordinatorRef.current?.schedule();
        subscribedOnce = true;
        disconnectedAfterSubscribe = false;
      } else if (subscribedOnce) disconnectedAfterSubscribe = true;
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [blockIds, ringIds, showNumber, state?.show.id]);

  const reload = useCallback(() => coordinatorRef.current?.run() ?? Promise.resolve(), []);
  const applyMutation = useCallback((mutation: RingsideMutation) => {
    setState((current) => (current ? mergeRingsideMutation(current, mutation) : current));
  }, []);
  return { state, error, connected, reload, applyMutation };
}
