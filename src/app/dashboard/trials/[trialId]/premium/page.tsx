'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertTriangle, ArrowLeft, CheckCircle, Download, Image as ImageIcon, Save, Upload } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { EMPTY_PREMIUM_CONTENT, type PremiumColorScheme, type PremiumStatus, type TrialPremiumContent, type TrialPremiumModel } from '@/types/trialPremium';

const fields: Array<{ key: keyof TrialPremiumContent; label: string; help: string; required?: boolean }> = [
  { key: 'trialChairContact', label: 'Trial chair or day-of contact', help: 'Give the name, phone number and email for the person competitors should contact on trial day.' },
  { key: 'pricingDeadlineNotes', label: 'Pricing and deadline notes', help: 'Explain early or late pricing, FEO rates, payment deadlines and any conditions not shown in the class grid.' },
  { key: 'paperEntryInstructions', label: 'Paper entry instructions', help: 'Explain where competitors can obtain and return a printable entry form. The secretary can enter received paper forms through Live Event.' },
  { key: 'paymentInstructions', label: 'Payment instructions', help: 'Explain accepted payment methods, deadlines and where payment is sent. Leave blank when the host will provide payment details separately.' },
  { key: 'refundPolicy', label: 'Refund and cancellation policy', help: 'State withdrawals, refunds, cancellations and emergency changes.' },
  { key: 'moveUpPolicy', label: 'Move-up policy', help: 'Explain whether move-ups are allowed and how competitors request one.' },
  { key: 'volunteerInformation', label: 'Volunteer information', help: 'Describe volunteer requests, benefits and contact instructions.' },
  { key: 'awardsInformation', label: 'Awards', help: 'List awards the host plans to offer without promising unavailable ribbons.' },
  { key: 'facilityInformation', label: 'Facility information', help: 'Describe surfaces, indoor/outdoor areas and site limitations.' },
  { key: 'parkingInformation', label: 'Parking', help: 'Give parking, unloading and vehicle restrictions.' },
  { key: 'cratingInformation', label: 'Crating', help: 'Explain crating areas, shade and space restrictions.' },
  { key: 'accessibilityInformation', label: 'Accessibility', help: 'Provide accessibility details and a contact for accommodations.' },
  { key: 'veterinarianInformation', label: 'Veterinarian', help: 'Name, address and phone number for the nearest emergency veterinarian.' },
  { key: 'emergencyInformation', label: 'Emergency information', help: 'Give emergency procedures and site-specific safety directions.' },
  { key: 'directionsInformation', label: 'Directions and arrival', help: 'Explain the correct entrance, landmarks, unloading and any directions a map alone may miss.' },
  { key: 'nearbyServices', label: 'Nearby services', help: 'List secretary-reviewed hotels, restaurants, fuel, groceries or pet supplies. Include a web or map address when useful.' },
  { key: 'safetyRules', label: 'Safety and comfort rules', help: 'State leash, dog-spacing, barking, crating, cleanup and search-discussion expectations.' },
  { key: 'waitlistInformation', label: 'Waitlist information', help: 'Explain how full rounds are waitlisted and how competitors will be contacted if promoted.' },
  { key: 'rulesAcknowledgement', label: 'Rules acknowledgement', help: 'Explain that submitting an entry confirms the competitor has read the current C-WAGS and host rules.' },
  { key: 'ringSetupTime', label: 'Ring setup time', help: 'State when setup begins and whether volunteers are requested.' },
  { key: 'judgesBriefingTime', label: "Judges' briefing time", help: 'State the briefing time or explain that it follows setup.' },
  { key: 'additionalInformation', label: 'Additional information', help: 'Add trial-specific instructions not covered above.' },
];

const premiumColorSchemes: Array<{
  value: PremiumColorScheme;
  label: string;
  swatches: [string, string, string];
}> = [
  { value: 'warm', label: 'Warm Orange', swatches: ['#9A3412', '#FDBA74', '#FFF7ED'] },
  { value: 'forest', label: 'Forest Green', swatches: ['#166534', '#86EFAC', '#F0FDF4'] },
  { value: 'blue', label: 'Classic Blue', swatches: ['#1D4ED8', '#93C5FD', '#EFF6FF'] },
  { value: 'plum', label: 'Plum', swatches: ['#7E22CE', '#D8B4FE', '#FAF5FF'] },
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
  const [uploadingMap, setUploadingMap] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState('');
  const [previousPremiumId, setPreviousPremiumId] = useState('');

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
      if (body.mapImagePath) {
        const mapResponse = await fetch(`/api/trials/${trialId}/premium/map`, { headers: await authHeaders(), cache: 'no-store' });
        if (mapResponse.ok) setMapPreviewUrl(URL.createObjectURL(await mapResponse.blob()));
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load premium'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [trialId]);
  useEffect(() => () => { if (mapPreviewUrl) URL.revokeObjectURL(mapPreviewUrl); }, [mapPreviewUrl]);

  const uploadMap = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setError('Choose a JPG or PNG map image.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('Map image must be 3 MB or smaller.'); return; }
    if (model?.setupRequired) { setError('Install the premium migration before uploading a private map image.'); return; }
    setUploadingMap(true); setError('');
    try {
      const form = new FormData(); form.append('map', file);
      const headers = await authHeaders();
      const response = await fetch(`/api/trials/${trialId}/premium/map`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to upload map');
      if (mapPreviewUrl) URL.revokeObjectURL(mapPreviewUrl);
      setMapPreviewUrl(URL.createObjectURL(file));
      setModel((current) => current ? { ...current, mapImagePath: body.path } : current);
      setMessage('Private map image uploaded. It will appear in the premium PDF.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to upload map'); }
    finally { setUploadingMap(false); }
  };

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

  const reusePreviousPremium = () => {
    const previous = model?.previousPremiums?.find((item) => item.trialId === previousPremiumId);
    if (!previous) return;
    if (!confirm(`Replace the editable premium fields with content from ${previous.trialName}?`)) return;
    setContent({ ...EMPTY_PREMIUM_CONTENT, ...previous.content });
    setMessage(`Loaded editable content from ${previous.trialName}. Review every section, then save this trial's draft.`);
    setError('');
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

  const downloadPaperEntryForm = async () => {
    try {
      setError('');
      const response = await fetch(`/api/trials/${trialId}/premium/paper-entry-form`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ content }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to generate paper entry form');
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Paper-Entry-Form.pdf';
      anchor.click(); URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate paper entry form'); }
  };

  if (loading) return <MainLayout><div className="p-8">Loading Premium Builder...</div></MainLayout>;
  if (!model || !content) return <MainLayout><div className="p-8 text-red-700">{error || 'Premium unavailable'}</div></MainLayout>;

  return <MainLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Premium List Builder</h1><p className="text-gray-600">{model.trial.trialName}</p></div><Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>
    {model.setupRequired && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>The premium database migration has not been installed. You can prepare and retain a browser draft, but server saving is intentionally disabled.</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2">Workflow Status <Badge variant={model.status === 'ready' ? 'default' : 'secondary'}>{model.status === 'ready' ? 'Ready' : 'Draft'}</Badge></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Trial:</strong> {model.trial.clubName} - {model.trial.location}</p><p><strong>Schedule:</strong> {model.schedule.length} rounds pulled from trial setup.</p><p><strong>Entry opening:</strong> {model.trial.entryOpenAt || 'Not scheduled'} {model.trial.entryTimezone || ''}</p><p><strong>Entry closing:</strong> {model.trial.entriesCloseDate || "Secretary closes entries when full"}</p>{model.missingRequired.length > 0 && <p className="text-amber-800"><strong>Still required:</strong> {model.missingRequired.join(', ')}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Reuse a Previous Club Premium</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-gray-700">Start with the editable information saved for an earlier {model.trial.clubName} trial. The current trial schedule, judges, fees, dates, waiver and uploaded map remain controlled by this trial.</p>{(model.previousPremiums || []).length > 0 ? <div className="flex flex-col gap-2 sm:flex-row"><select className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm" value={previousPremiumId} onChange={(event) => setPreviousPremiumId(event.target.value)}><option value="">Choose a previous premium</option>{(model.previousPremiums || []).map((item) => <option key={item.trialId} value={item.trialId}>{item.trialName}{item.startDate ? ` - ${item.startDate}` : ''}</option>)}</select><Button type="button" variant="outline" disabled={!previousPremiumId} onClick={reusePreviousPremium}>Use This Premium</Button></div> : <p className="text-sm text-gray-500">No earlier saved premium is available for this club yet.</p>}<p className="text-xs text-gray-600">Review contact names, veterinarian details, policies, directions, nearby services and payment instructions before saving.</p></CardContent></Card>
    <Card>
      <CardHeader><CardTitle>Premium Color Scheme</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Label id="premium-color-scheme-label">Choose the accent colors used throughout the PDF</Label>
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          role="radiogroup"
          aria-labelledby="premium-color-scheme-label"
        >
          {premiumColorSchemes.map((scheme) => {
            const selected = content.colorScheme === scheme.value;
            return (
              <button
                key={scheme.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setContent({ ...content, colorScheme: scheme.value })}
                className={`relative rounded-lg border-2 bg-white p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-gray-900 shadow-md ring-2 ring-gray-900 ring-offset-2'
                    : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                }`}
              >
                {selected && (
                  <span className="absolute right-2 top-2 rounded-full bg-gray-900 p-0.5 text-white">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <span className="block pr-7 text-sm font-semibold text-gray-900">{scheme.label}</span>
                <span className="mt-3 flex overflow-hidden rounded-md border border-gray-200" aria-hidden="true">
                  {scheme.swatches.map((color) => (
                    <span key={color} className="h-9 flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="mt-2 block text-xs font-medium text-gray-600">
                  {selected ? 'Selected' : 'Choose this scheme'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-600">All choices use light backgrounds and dark text so the premium remains readable when printed or photocopied.</p>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Trial-Day Times</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="premium-check-in-time">Check-in starts</Label><Input id="premium-check-in-time" type="time" value={content.checkInTime} onChange={(event) => setContent({ ...content, checkInTime: event.target.value })} /><p className="text-xs text-gray-600">Displayed prominently on the premium cover.</p></div><div className="space-y-2"><Label htmlFor="premium-trial-start-time">Trial starts</Label><Input id="premium-trial-start-time" type="time" value={content.trialStartTime} onChange={(event) => setContent({ ...content, trialStartTime: event.target.value })} /><p className="text-xs text-gray-600">Use the trial venue's local time.</p></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Venue Map and Local Map Image</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="premium-map-address">Street address for GPS directions</Label><Input id="premium-map-address" value={content.mapAddress} onChange={(event) => setContent({ ...content, mapAddress: event.target.value })} placeholder="123 Main Street, City, Province, Postal Code" /><p className="text-xs text-gray-600">The clickable map link uses this exact address instead of searching by venue name. Include the postal code when available. If left blank, the saved trial location is used.</p></div><p className="text-sm text-gray-700">Upload a secretary-reviewed JPG or PNG map showing the venue and useful nearby landmarks. Maximum 3 MB. The original stays private and is embedded only in the generated premium.</p>{mapPreviewUrl && <Image src={mapPreviewUrl} alt="Uploaded local venue map preview" width={900} height={600} unoptimized className="h-auto max-h-80 w-auto rounded border object-contain" />}<label className="inline-flex cursor-pointer items-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"><Upload className="mr-2 h-4 w-4" />{uploadingMap ? 'Uploading...' : model.mapImagePath ? 'Replace Map Image' : 'Upload Map Image'}<input className="sr-only" type="file" accept="image/png,image/jpeg" disabled={uploadingMap} onChange={(event) => void uploadMap(event.target.files?.[0])} /></label></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-2">{fields.map((field) => <Card key={field.key}><CardHeader><CardTitle className="text-base">{field.label}{field.required ? ' *' : ''}</CardTitle></CardHeader><CardContent><Label className="sr-only">{field.label}</Label><Textarea rows={5} value={content[field.key]} onChange={(event) => setContent({ ...content, [field.key]: event.target.value })} placeholder={field.help} /><p className="mt-2 text-xs text-gray-600">{field.help}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Review and Generate</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" disabled={saving} onClick={() => void save('draft')}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button disabled={saving} onClick={() => void save('ready')}><CheckCircle className="mr-2 h-4 w-4" />Mark Premium Ready</Button><Button variant="outline" onClick={() => void download()}><Download className="mr-2 h-4 w-4" />Download Premium PDF</Button><Button variant="outline" onClick={() => void downloadPaperEntryForm()}><Download className="mr-2 h-4 w-4" />Preview Paper Entry Form</Button>{message && <p className="w-full text-sm text-green-700">{message}</p>}{error && <p className="w-full text-sm text-red-700">{error}</p>}<p className="w-full text-xs text-gray-600">The schedule, judges and fees come from trial setup. Change them there rather than retyping them in the premium. The paper-entry preview is available while the premium is still a draft; the public link opens only after the premium is marked ready.</p></CardContent></Card>
  </div></MainLayout>;
}
