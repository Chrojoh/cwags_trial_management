'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import type { PostTrialPackageModel } from '@/lib/postTrialPackage';
import {
  createOfficialResultsWorkbook,
  createPostTrialPackageZip,
  postTrialPackageFilename,
} from '@/lib/postTrialPackageExport';

const issueLabels: Record<keyof PostTrialPackageModel['issues'], string> = {
  awaitingAcceptance: 'Entries awaiting acceptance',
  pendingRegistration: 'Pending registration numbers',
  placeholderJudges: 'TBA or unassigned judges',
  missingScores: 'Missing scores',
  outstandingBalances: 'Outstanding balances',
};

export default function PostTrialPackagePreviewPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const router = useRouter();
  const [model, setModel] = useState<PostTrialPackageModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Please sign in again to prepare this report.');
    return token;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/trials/${trialId}/post-trial-package`, {
          headers: { Authorization: `Bearer ${await getToken()}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to prepare the package preview.');
        setModel(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to prepare the package preview.');
      } finally {
        setLoading(false);
      }
    };
    if (trialId) void load();
  }, [trialId]);

  const download = async () => {
    try {
      setDownloading(true);
      setError(null);
      if (!model) throw new Error('The closing review must finish loading first.');
      const templateResponse = await fetch('/templates/league-results-template-v3.xlsx');
      if (!templateResponse.ok) throw new Error('Could not load the official C-WAGS results template.');
      const workbook = createOfficialResultsWorkbook(
        new Uint8Array(await templateResponse.arrayBuffer()),
        model
      );
      const zip = await createPostTrialPackageZip(model, workbook);
      const zipBuffer = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([zipBuffer], { type: 'application/zip' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = postTrialPackageFilename(model);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to generate the package.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Button variant="ghost" onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trial
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Post-Trial Submission Package</h1>
            <p className="mt-1 text-muted-foreground">Read-only closing review. The official results workbook is exported from the Summary page.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/trials/${trialId}/summary`)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Open Summary Export
            </Button>
            <Button disabled={!model || downloading} onClick={download}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? 'Generating…' : 'Download Complete ZIP'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing the preview…
          </div>
        ) : model ? (
          <>
            <Alert className={model.ready ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}>
              {model.ready ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <AlertCircle className="h-4 w-4 text-amber-700" />}
              <AlertDescription>
                <strong>{model.ready ? 'Ready for secretary review.' : 'Review required before submission.'}</strong>{' '}
                Generating supporting documents does not change the trial or mark it completed.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(model.issues).map(([key, count]) => (
                <Card key={key}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{issueLabels[key as keyof typeof issueLabels]}</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{count}</div></CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Trial Recap</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Accepted entries</span><strong>{model.recap.acceptedEntries}</strong></div>
                  <div className="flex justify-between"><span>Regular selections entered</span><strong>{model.recap.regularSelections}</strong></div>
                  <div className="flex justify-between"><span>Completed regular runs</span><strong>{model.recap.scoredRegularRuns}</strong></div>
                  <div className="flex justify-between"><span>Passes</span><strong>{model.recap.passes}</strong></div>
                  <div className="flex justify-between"><span>Fails / NQ</span><strong>{model.recap.fails}</strong></div>
                  <div className="flex justify-between"><span>ABS</span><strong>{model.recap.absences}</strong></div>
                  <div className="flex justify-between border-t pt-2"><span>Estimated C-WAGS amount</span><strong>${model.recap.cwagsAmountDue.toFixed(2)}</strong></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Closing Documents</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Summary page:</strong> official C-WAGS Excel results workbook</p>
                  <p><strong>Complete ZIP:</strong> official C-WAGS Excel results workbook</p>
                  <p><strong>Complete ZIP:</strong> {model.judges.length} judge signature page{model.judges.length === 1 ? '' : 's'}</p>
                  <p><strong>Complete ZIP:</strong> readable secretary readiness PDF</p>
                  <p><strong>Complete ZIP:</strong> submission instructions</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
