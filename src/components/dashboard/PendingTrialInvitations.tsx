'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

type Invitation = { id: string; role: string; expires_at: string | null; trials: { trial_name: string } | null };

export default function PendingTrialInvitations({ onAccepted }: { onAccepted?: () => void }) {
  const [items, setItems] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState(false);
  const call = useCallback(async (init?: RequestInit) => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    return fetch('/api/invitations', { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` } });
  }, []);
  const load = useCallback(async () => { const r = await call(); if (r.ok) setItems((await r.json()).invitations || []); }, [call]);
  useEffect(() => { void load(); }, [load]);
  async function act(id: string, action: 'accept' | 'decline') {
    setBusy(true); const r = await call({ method: 'POST', body: JSON.stringify({ id, action }) });
    if (r.ok) { await load(); if (action === 'accept') onAccepted?.(); }
    setBusy(false);
  }
  if (!items.length) return null;
  return <Card><CardHeader><CardTitle>Pending trial invitations</CardTitle></CardHeader><CardContent className="space-y-3">{items.map(i =>
    <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><div className="flex-1"><div className="font-medium">{i.trials?.trial_name || 'Trial invitation'}</div><div className="text-sm text-muted-foreground">Role: {i.role.replace('_', ' ')}</div></div><Button disabled={busy} onClick={() => act(i.id, 'accept')}>Accept</Button><Button variant="outline" disabled={busy} onClick={() => act(i.id, 'decline')}>Decline</Button></div>
  )}</CardContent></Card>;
}
