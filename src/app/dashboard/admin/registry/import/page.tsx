'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegistryImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    totalRows?: number;
    processed?: number;
    added?: number;
    updated?: number;
    skipped?: number;
    errors?: string[];
  } | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/registry/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(data.message || data.error || 'Import failed');
      }

      setResult(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setResult({
        success: false,
        message,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Import Registry Data</h1>
        <p className="text-gray-600">
          Upload an Excel file with cwags_number (Col A), dog_call_name (Col B), and handler_name
          (Col D)
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Excel File (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            disabled={importing}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>

          <button
            onClick={() => router.back()}
            disabled={importing}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {result && (
          <div
            className={`mt-6 p-4 rounded-md ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}
            >
              {result.success ? 'Import Complete' : 'Import Failed'}
            </h3>
            <p className={result.success ? 'text-green-700' : 'text-red-700'}>{result.message}</p>

            {result.success && (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-gray-500">Valid rows</dt>
                  <dd className="font-semibold text-gray-900">{result.totalRows ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Added</dt>
                  <dd className="font-semibold text-green-800">{result.added ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="font-semibold text-blue-800">{result.updated ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Skipped</dt>
                  <dd className="font-semibold text-gray-900">{result.skipped ?? 0}</dd>
                </div>
              </dl>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-800 mb-1">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-700 max-h-40 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">File Format:</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Column A: CWAGS Number</li>
          <li>Column B: Dog Call Name</li>
          <li>Column D: Handler Name</li>
          <li>Header rows are detected automatically; files without headers are also supported</li>
          <li>Existing CWAGS numbers will be overwritten with corrected dog and handler names</li>
          <li>Corrected CWAGS numbers are matched by a unique dog and handler name</li>
          <li>New CWAGS numbers will be added</li>
          <li>Unchanged, duplicate, or incomplete rows will be skipped and reported</li>
        </ul>
      </div>
    </div>
  );
}
