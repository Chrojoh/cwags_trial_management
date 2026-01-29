// src/app/dashboard/admin/import-trial/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Trophy,
  Target,
  Download,
  Eye
} from 'lucide-react';

interface ImportSummary {
  trialId: string;
  trialName: string;
  clubName: string;
  dateRange: string;
  stats: {
    totalDays: number;
    totalClasses: number;
    totalRounds: number;
    totalEntries: number;
    totalScores: number;
  };
  days: Array<{
    dayNumber: number;
    date: string;
    classes: Array<{
      className: string;
      rounds: number;
      entries: number;
    }>;
  }>;
  warnings: string[];
  errors: string[];
}

export default function ImportTrialPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin only
  if (user?.role !== 'administrator') {
    return (
      <MainLayout title="Access Denied">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators can import trials from Excel files.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSummary(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Get auth session for API request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import-trial/preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process file');
      }

      setSummary(result.summary);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !summary) return;

    setProcessing(true);
    setError(null);

    try {
      // Get auth session for API request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('confirmed', 'true');

      const response = await fetch('/api/admin/import-trial/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import trial');
      }

      // Success! Navigate to the trial
      router.push(`/dashboard/trials/${result.trialId}`);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import trial');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSummary(null);
    setError(null);
  };

  return (
    <MainLayout title="Import Trial from Excel">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import Trial from Excel</h1>
          <p className="text-gray-600 mt-2">
            Upload a completed trial spreadsheet to automatically create the trial, entries, and scores
          </p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Excel File Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-2">Page 1 (any tab):</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>A1:</strong> Trial name / Date range (e.g., "June 6 -- July 26, 2024")</li>
                  <li><strong>A2:</strong> Club name (optional)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Each tab (class):</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>Row 5:</strong> Judge names</li>
                  <li><strong>Row 6:</strong> Dates</li>
                  <li><strong>Row 7+:</strong> Col A: CWAGS#, Col B: Dog, Col C: Handler, Col D+: Scores</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        {!summary && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Excel File</CardTitle>
              <CardDescription>
                Choose the completed trial spreadsheet to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {file ? file.name : 'Click to select Excel file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx and .xls files
                  </p>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleUploadAndPreview}
                      disabled={uploading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Import
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Display */}
        {summary && (
          <>
            {/* Overview Stats */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Import Preview
                </CardTitle>
                <CardDescription className="text-green-700">
                  Review the data before confirming import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-green-900">{summary.trialName}</h3>
                  {summary.clubName && (
                    <p className="text-green-700">{summary.clubName}</p>
                  )}
                  <p className="text-sm text-green-600">{summary.dateRange}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{summary.stats.totalDays}</div>
                    <div className="text-xs text-gray-600">Days</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Trophy className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{summary.stats.totalClasses}</div>
                    <div className="text-xs text-gray-600">Classes</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Target className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{summary.stats.totalRounds}</div>
                    <div className="text-xs text-gray-600">Rounds</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{summary.stats.totalEntries}</div>
                    <div className="text-xs text-gray-600">Entries</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-teal-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{summary.stats.totalScores}</div>
                    <div className="text-xs text-gray-600">Scores</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warnings */}
            {summary.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <p className="font-semibold mb-2">Warnings:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {summary.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {summary.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Errors found (import blocked):</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {summary.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
                <CardDescription>
                  Classes and entries organized by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {summary.days.map((day) => (
                    <div key={day.dayNumber} className="border-l-4 border-orange-500 pl-4">
                      <h3 className="font-semibold text-lg mb-2">
                        Day {day.dayNumber} - {day.date}
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {day.classes.map((cls, idx) => (
                          <div key={idx} className="bg-gray-50 rounded p-3">
                            <p className="font-medium">{cls.className}</p>
                            <div className="text-sm text-gray-600 mt-1">
                              <span>{cls.rounds} rounds</span>
                              <span className="mx-2">•</span>
                              <span>{cls.entries} entries</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={processing || summary.errors.length > 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Confirm & Import Trial
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}