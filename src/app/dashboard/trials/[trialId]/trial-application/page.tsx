'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle, Download, FileText } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import JudgeAutocomplete from '@/components/judges/JudgeAutocomplete';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { Judge } from '@/types/judge';
import type { TrialApplicationData, TrialApplicationOverrides } from '@/types/trialApplication';

export default function TrialApplicationReviewPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const router = useRouter();
  const [data, setData] = useState<TrialApplicationData | null>(null);
  const [overrides, setOverrides] = useState<TrialApplicationOverrides>({});
  const [advocateInput, setAdvocateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = async () => {
    const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Your session has expired');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(`trial-application-overrides:${trialId}`);
    if (saved) {
      try {
        const savedOverrides = JSON.parse(saved) as TrialApplicationOverrides;
        setOverrides(savedOverrides);
        setAdvocateInput((savedOverrides.advocateNames || []).join(', '));
      } catch { sessionStorage.removeItem(`trial-application-overrides:${trialId}`); }
    }
    void (async () => {
      try {
        const response = await fetch(`/api/trials/${trialId}/trial-application`, { headers: await authHeaders() });
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load application');
        const applicationData = await response.json() as TrialApplicationData;
        setData(applicationData);
        setAdvocateInput((current) => current || applicationData.advocates.join(', '));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load application');
      } finally {
        setLoading(false);
      }
    })();
  }, [trialId]);

  const setValue = <K extends keyof TrialApplicationOverrides>(key: K, value: TrialApplicationOverrides[K]) =>
    setOverrides((current) => ({ ...current, [key]: value }));

  const unresolvedResetIssues = useMemo(
    () => data?.resetIssues.filter((issue) => !overrides.resetJudgeOverrides?.[issue.parentRoundId]?.judgeName) || [],
    [data, overrides.resetJudgeOverrides]
  );
  const requiredMissing = useMemo(
    () => data?.missingRequired.filter((item) => item !== 'Reset setup' || unresolvedResetIssues.length > 0) || [],
    [data, unresolvedResetIssues.length]
  );

  const download = async (draft: boolean) => {
    setGenerating(true);
    setError('');
    try {
      const response = await fetch(`/api/trials/${trialId}/trial-application/pdf`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify({ overrides, draft }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'PDF generation failed');
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'CWAGS_Trial_Application.pdf';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <MainLayout><div className="p-8">Loading Trial Application…</div></MainLayout>;
  if (!data) return <MainLayout><div className="p-8 text-red-700">{error || 'Application unavailable'}</div></MainLayout>;

  const source = (key: string) => overrides[key as keyof TrialApplicationOverrides] !== undefined
    ? 'Entered for application (Application only)' : data.sources[key] === 'derived' ? 'Derived' : data.sources[key] === 'stored' ? 'Stored' : 'Application only';

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Trial Application Review</h1><p className="text-gray-600">Template: {data.template === 'scent' ? 'Scent Trial Application' : 'Combined Trial Application'}</p></div>
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </div>

        <Card><CardHeader><CardTitle>Generation Status</CardTitle></CardHeader><CardContent>
          {requiredMissing.length ? <div className="flex gap-2 text-amber-800"><AlertTriangle className="h-5 w-5" /><span>Required information missing: {requiredMissing.join(', ')}</span></div>
            : data.missingOptional.length ? <div className="flex gap-2 text-blue-800"><CheckCircle className="h-5 w-5" /><span>Ready with optional information missing</span></div>
            : <div className="flex gap-2 text-green-700"><CheckCircle className="h-5 w-5" /><span>Ready to generate</span></div>}
          {error && <p className="mt-3 text-red-700">{error}</p>}
        </CardContent></Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Trial Information</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <p><strong>Host:</strong> {data.hostName}</p><p><strong>Dates:</strong> {data.trialDates.join(', ')}</p>
            <p><strong>Location:</strong> {data.locationName}, {data.city}, {data.region} <span className="text-blue-700">(Derived)</span></p>
            <Field label="Premium website" value={overrides.premiumWebsite ?? data.premiumWebsite} source={source('premiumWebsite')} onChange={(value) => setValue('premiumWebsite', value)} />
            <Field label="Submitted date" type="date" value={overrides.submittedDate ?? data.submittedDate} source={source('submittedDate')} onChange={(value) => setValue('submittedDate', value)} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Contact and Host Information</CardTitle></CardHeader><CardContent className="space-y-3">
            <p className="text-sm"><strong>{data.contact.name}</strong><br />{data.contact.email}</p>
            <Field label="Trial contact phone" type="tel" value={overrides.contactPhone ?? data.contact.phone} source={source('contactPhone')} onChange={(value) => setValue('contactPhone', value)} />
            <Field label="C-WAGS Advocate(s), comma separated" value={advocateInput} source={overrides.advocateNames ? 'Entered for application' : 'Application only'} onChange={(value) => {
              setAdvocateInput(value);
              setValue('advocateNames', value.split(',').map((item) => item.trim()).filter(Boolean));
            }} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Programs and Schedule</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <p>{Object.entries(data.programs).filter(([, enabled]) => enabled).map(([name]) => name).join(', ')}</p>
            <p>{data.schedule.length} schedule rows; {data.schedule.filter((row) => row.isReset).length} reset rows.</p>
            {data.unmappedScheduleRows.map((row) => <p key={row} className="text-amber-800">⚠ {row}</p>)}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Venue and Insurance</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Inside / Outside</Label><div className="mt-1 flex gap-2">{(['inside','outside','both'] as const).map((value) => <Button key={value} size="sm" variant={overrides.venueSetting === value ? 'default' : 'outline'} onClick={() => setValue('venueSetting', value)}>{value}</Button>)}</div><Source value={source('venueSetting')} /></div>
            <div><Label>League</Label><div className="mt-1 flex gap-2"><Button size="sm" variant={overrides.isLeague === true ? 'default' : 'outline'} onClick={() => setValue('isLeague', true)}>Yes</Button><Button size="sm" variant={overrides.isLeague === false ? 'default' : 'outline'} onClick={() => setValue('isLeague', false)}>No</Button></div><Source value={source('isLeague')} /></div>
            <Field label="Ring/Search surface" value={overrides.surface ?? data.venue.surface} source={source('surface')} onChange={(value) => setValue('surface', value)} />
            <Field label="Insurance expiration date" type="date" value={overrides.insuranceExpirationDate ?? data.venue.insuranceExpirationDate} source={source('insuranceExpirationDate')} onChange={(value) => setValue('insuranceExpirationDate', value)} />
            <div><Label>Ring/Search-size exception request</Label><Textarea value={overrides.ringSizeExceptionRequest ?? data.venue.ringSizeExceptionRequest} onChange={(event) => setValue('ringSizeExceptionRequest', event.target.value)} /><Source value={source('ringSizeExceptionRequest')} /></div>
            {data.programs.scent ? <Field label="Number of search areas" type="number" value={String(overrides.numberOfSearchAreas ?? data.scent?.numberOfSearchAreas ?? '')} source={source('numberOfSearchAreas')} onChange={(value) => setValue('numberOfSearchAreas', value === '' ? undefined : Math.max(0, Number(value)))} />
              : <Field label="Number of rings" type="number" value={String(overrides.numberOfRings ?? data.venue.numberOfRings ?? '')} source={source('numberOfRings')} onChange={(value) => setValue('numberOfRings', value === '' ? undefined : Math.max(0, Number(value)))} />}
          </CardContent></Card>
        </div>

        {data.resetIssues.length > 0 && <Card><CardHeader><CardTitle>Reset Setup Incomplete</CardTitle></CardHeader><CardContent className="space-y-6">
          {data.resetIssues.map((issue) => {
            const selected = overrides.resetJudgeOverrides?.[issue.parentRoundId];
            const options = (data.resetJudgeOptions?.[issue.parentRoundId] || []) as Judge[];
            const selectedJudge = options.find((judge) => judge.id === selected?.judgeId);
            return <div key={issue.parentRoundId} className="rounded border border-amber-300 bg-amber-50 p-4">
              <p className="font-semibold">{issue.className} — Round {issue.parentRoundNumber}</p>
              <p className="text-sm">Primary Judge: {issue.primaryJudgeName}<br />Expected Reset Round: {issue.expectedResetRoundNumber}</p>
              <Label className="mt-3 block">Required Reset Judge</Label>
              <JudgeAutocomplete judges={options} className={issue.classNameForCertification} selectedJudge={selectedJudge} onSelect={(judge) => setValue('resetJudgeOverrides', { ...(overrides.resetJudgeOverrides || {}), [issue.parentRoundId]: { judgeId: judge.id, judgeName: judge.name } })} onClear={() => { const next = { ...(overrides.resetJudgeOverrides || {}) }; delete next[issue.parentRoundId]; setValue('resetJudgeOverrides', next); }} />
              <p className="mt-2 text-xs text-amber-800">Application only. The actual trial setup remains incomplete until separately repaired and saved.</p>
            </div>;
          })}
        </CardContent></Card>}

        <Card><CardHeader><CardTitle>Generation</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
          <Button disabled={generating || requiredMissing.length > 0} onClick={() => void download(false)}><Download className="mr-2 h-4 w-4" />Download Completed PDF</Button>
          <Button variant="outline" onClick={() => { sessionStorage.setItem(`trial-application-overrides:${trialId}`, JSON.stringify(overrides)); setDraftSaved(true); }}><FileText className="mr-2 h-4 w-4" />Save Application Draft</Button>
          {requiredMissing.length > 0 && <Button variant="outline" disabled={generating} onClick={() => void download(true)}><FileText className="mr-2 h-4 w-4" />Generate Incomplete Draft</Button>}
          <p className="w-full text-xs text-gray-600">Values entered here are application-only and do not modify Supabase. {draftSaved ? 'Draft saved for this browser session.' : ''}</p>
        </CardContent></Card>
      </div>
    </MainLayout>
  );
}

function Source({ value }: { value: string }) { return <p className="mt-1 text-xs text-blue-700">{value}</p>; }
function Field({ label, value, source, onChange, type = 'text' }: { label: string; value: string; source: string; onChange: (value: string) => void; type?: string }) {
  return <div><Label>{label}</Label><Input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} /><Source value={source} /></div>;
}
