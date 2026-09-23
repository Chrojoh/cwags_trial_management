'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle, Download, Save } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { PremiumStatus, TrialPremiumContent, TrialPremiumModel } from '@/types/trialPremium';

const fields: Array<{ key: keyof TrialPremiumContent; label: string; help: string; required?: boolean }> = [
  { key: 'paymentInstructions', label: 'Payment instructions', help: 'Explain accepted payment methods, deadlines and where payment is sent.', required: true },
  { key: 'refundPolicy', label: 'Refund and cancellation policy', help: 'State withdrawals, refunds, cancellations and emergency changes.', required: true },
  { key: 'moveUpPolicy', label: 'Move-up policy', help: 'Explain whether move-ups are allowed and how competitors request one.' },
  { key: 'volunteerInformation', label: 'Volunteer information', help: 'Describe volunteer requests, benefits and contact instructions.' },
  { key: 'awardsInformation', label: 'Awards', help: 'List awards the host plans to offer without promising unavailable ribbons.' },
  { key: 'facilityInformation', label: 'Facility information', help: 'Describe surfaces, indoor/outdoor areas and site limitations.', required: true },
  { key: 'parkingInformation', label: 'Parking', help: 'Give parking, unloading and vehicle restrictions.' },
  { key: 'cratingInformation', label: 'Crating', help: 'Explain crating areas, shade and space restrictions.' },
  { key: 'accessibilityInformation', label: 'Accessibility', help: 'Provide accessibility details and a contact for accommodations.' },
  { key: 'veterinarianInformation', label: 'Veterinarian', help: 'Name, address and phone number for the nearest emergency veterinarian.', required: true },
  { key: 'emergencyInformation', label: 'Emergency information', help: 'Give emergency procedures and site-specific safety directions.', required: true },
  { key: 'additionalInformation', label: 'Additional information', help: 'Add trial-specific instructions not covered above.' },
];

export default function TrialPremiumPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const router = useRouter();
  const [model, setModel] = useState<TrialPremiumModel | null>(null);
  const [content, setContent] = useState<TrialPremiumContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const authHeaders = async () => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your session has expired');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const load = async () => {
    try {
      setError('');
      const response = await fetch(`/api/trials/${trialId}/premium`, { headers: await authHeaders(), cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load premium');
      setModel(body);
      const local = sessionStorage.getItem(`trial-premium-draft:${trialId}`);
      setContent(local ? { ...body.content, ...JSON.parse(local) } : body.content);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load premium'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [trialId]);

  const save = async (status: PremiumStatus) => {
    if (!content) return;
    setSaving(true); setError(''); setMessage('');
    try {
      sessionStorage.setItem(`trial-premium-draft:${trialId}`, JSON.stringify(content));
      if (model?.setupRequired) {
        setMessage('Draft saved in this browser. Install the premium migration before saving it to the trial.');
        return;
      }
      const response = await fetch(`/api/trials/${trialId}/premium`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify({ content, status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.missing?.length ? `Complete: ${body.missing.join(', ')}` : body.error || 'Unable to save premium');
      setModel(body); setContent(body.content); sessionStorage.removeItem(`trial-premium-draft:${trialId}`);
      setMessage(status === 'ready' ? 'Premium marked ready for publication.' : 'Premium draft saved.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save premium'); }
    finally { setSaving(false); }
  };

  const download = async () => {
    try {
      const response = await fetch(`/api/trials/${trialId}/premium/pdf`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to generate premium');
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Trial-Premium.pdf';
      anchor.click(); URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate premium'); }
  };

  if (loading) return <MainLayout><div className="p-8">Loading Premium Builder...</div></MainLayout>;
  if (!model || !content) return <MainLayout><div className="p-8 text-red-700">{error || 'Premium unavailable'}</div></MainLayout>;

  return <MainLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Premium List Builder</h1><p className="text-gray-600">{model.trial.trialName}</p></div><Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>
    {model.setupRequired && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>The premium database migration has not been installed. You can prepare and retain a browser draft, but server saving is intentionally disabled.</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2">Workflow Status <Badge variant={model.status === 'ready' ? 'default' : 'secondary'}>{model.status === 'ready' ? 'Ready' : 'Draft'}</Badge></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Trial:</strong> {model.trial.clubName} - {model.trial.location}</p><p><strong>Schedule:</strong> {model.schedule.length} rounds pulled from trial setup.</p><p><strong>Entry opening:</strong> {model.trial.entryOpenAt || 'Not scheduled'} {model.trial.entryTimezone || ''}</p><p><strong>Entry closing:</strong> {model.trial.entriesCloseDate || "Secretary closes entries when full"}</p>{model.missingRequired.length > 0 && <p className="text-amber-800"><strong>Still required:</strong> {model.missingRequired.join(', ')}</p>}</CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-2">{fields.map((field) => <Card key={field.key}><CardHeader><CardTitle className="text-base">{field.label}{field.required ? ' *' : ''}</CardTitle></CardHeader><CardContent><Label className="sr-only">{field.label}</Label><Textarea rows={5} value={content[field.key]} onChange={(event) => setContent({ ...content, [field.key]: event.target.value })} placeholder={field.help} /><p className="mt-2 text-xs text-gray-600">{field.help}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Review and Generate</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" disabled={saving} onClick={() => void save('draft')}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button disabled={saving} onClick={() => void save('ready')}><CheckCircle className="mr-2 h-4 w-4" />Mark Premium Ready</Button><Button variant="outline" onClick={() => void download()}><Download className="mr-2 h-4 w-4" />Download Premium PDF</Button>{message && <p className="w-full text-sm text-green-700">{message}</p>}{error && <p className="w-full text-sm text-red-700">{error}</p>}<p className="w-full text-xs text-gray-600">The schedule, judges and fees come from trial setup. Change them there rather than retyping them in the premium.</p></CardContent></Card>
  </div></MainLayout>;
}
