'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { TrialCollaboratorRole } from '@/lib/trialPermissions';

type Collaborator = { id: string; invited_email: string; role: TrialCollaboratorRole; invitation_status: string; expires_at: string | null };

export default function TrialCollaboratorsPage() {
  const trialId = useParams<{ trialId: string }>().trialId;
  const [items, setItems] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TrialCollaboratorRole>('secretary');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (init?: RequestInit) => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    return fetch(`/api/trials/${trialId}/collaborators`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}`, ...(init?.headers || {}) } });
  }, [trialId]);

  const load = useCallback(async () => {
    const response = await request();
    if (response.ok) setItems((await response.json()).collaborators || []);
    else setMessage((await response.json()).error || 'Unable to load collaborators');
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  async function invite() {
    setBusy(true); setMessage('');
    const response = await request({ method: 'POST', body: JSON.stringify({ email, role }) });
    const body = await response.json();
    setMessage(response.ok ? 'Invitation created. It will appear in the user’s pending invitations after the migration is installed.' : body.error);
    if (response.ok) { setEmail(''); await load(); }
    setBusy(false);
  }

  async function change(id: string, action: 'revoke' | 'resend' | 'role', nextRole?: TrialCollaboratorRole) {
    setBusy(true); setMessage('');
    const response = await request({ method: 'PATCH', body: JSON.stringify({ id, action, role: nextRole }) });
    const body = await response.json();
    setMessage(response.ok ? 'Collaborator updated.' : body.error);
    if (response.ok) await load();
    setBusy(false);
  }

  return <MainLayout title="Trial Collaborators"><div className="mx-auto max-w-4xl space-y-6">
    <Card><CardHeader><CardTitle>Invite a secretary</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Invitations must be accepted using the recipient’s own account. Pending invitations do not grant trial access.</p>
      <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="invite-role">Role</Label><select id="invite-role" className="h-10 w-full rounded-md border bg-background px-3" value={role} onChange={e => setRole(e.target.value as TrialCollaboratorRole)}><option value="secretary">Secretary</option><option value="assistant">Assistant</option><option value="read_only">Read only</option></select></div>
        <Button disabled={busy || !email.trim()} onClick={invite}>Invite</Button>
      </div>{message && <p className="text-sm">{message}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Current invitations and collaborators</CardTitle></CardHeader><CardContent className="space-y-3">
      {!items.length && <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
      {items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
        <div className="min-w-56 flex-1"><div className="font-medium">{item.invited_email}</div><div className="text-sm text-muted-foreground">{item.invitation_status.replace('_', ' ')}</div></div>
        <select className="h-9 rounded-md border bg-background px-2" value={item.role} disabled={busy || item.invitation_status === 'revoked'} onChange={e => change(item.id, 'role', e.target.value as TrialCollaboratorRole)}><option value="secretary">Secretary</option><option value="assistant">Assistant</option><option value="read_only">Read only</option></select>
        {item.invitation_status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => change(item.id, 'resend')}>Resend</Button>}
        {item.invitation_status !== 'revoked' && <Button variant="outline" disabled={busy} onClick={() => change(item.id, 'revoke')}>Revoke</Button>}
      </div>)}
    </CardContent></Card>
  </div></MainLayout>;
}
