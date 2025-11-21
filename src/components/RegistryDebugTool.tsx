'use client';

import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function RegistryDebugTool() {
  const [regNumber, setRegNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testRegistration = async () => {
    if (!regNumber.trim()) {
      alert('Please enter a registration number');
      return;
    }

    setTesting(true);
    const debugInfo: any = {
      regNumber: regNumber.trim(),
      excelData: null,
      supabaseData: null,
      matchingRecords: [],
      titleProgress: [],
      errors: []
    };

    try {
      // Test 1: Load Excel file
      console.log('🔍 Testing Excel file...');
      const response = await fetch('https://raw.githubusercontent.com/cwagtracker/Tracker/main/Data%20for%20Tracker%20web.xlsx');
      
      if (!response.ok) {
        debugInfo.errors.push(`Excel file not found: HTTP ${response.status}`);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        debugInfo.excelData = {
          totalRows: data.length,
          headers: data[0],
          sampleRows: data.slice(0, 3)
        };

        console.log('✅ Excel loaded:', data.length, 'rows');

        // Test 2: Find matching records
        const startRow = data[0][0] && String(data[0][0]).toLowerCase().includes('reg') ? 1 : 0;
        const matchingRecords = [];

        for (let i = startRow; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0]) continue;

          const rowRegNumber = String(row[0] || '').trim();
          
          if (rowRegNumber === regNumber.trim()) {
            // Parse date
            let trialDate = row[2];
            if (typeof trialDate === 'number') {
              const excelEpoch = new Date(1899, 11, 30);
              trialDate = new Date(excelEpoch.getTime() + trialDate * 86400000);
            }

            matchingRecords.push({
              row: i,
              regNumber: rowRegNumber,
              callName: String(row[1] || '').trim(),
              date: trialDate,
              level: String(row[3] || '').trim(),
              judge: String(row[4] || '').trim(),
              qs: parseInt(row[5]) || 0,
              trialName: String(row[6] || '').trim(),
              game: String(row[7] || '').trim()
            });
          }
        }

        debugInfo.matchingRecords = matchingRecords;
        console.log(`✅ Found ${matchingRecords.length} matching records for ${regNumber}`);

        // Test 3: Calculate title progress
        if (matchingRecords.length > 0) {
          const recordsWithQs = matchingRecords.filter(r => r.qs > 0);
          
          // Group by level
          const levelGroups = new Map<string, any[]>();
          recordsWithQs.forEach(record => {
            const level = record.level;
            if (!levelGroups.has(level)) {
              levelGroups.set(level, []);
            }
            levelGroups.get(level)!.push(record);
          });

          const progress: any[] = [];
          levelGroups.forEach((levelRecords, level) => {
            const uniqueJudges = new Set(levelRecords.map(r => r.judge)).size;
            const totalQs = levelRecords.reduce((sum, r) => sum + r.qs, 0);
            const hasTitle = totalQs >= 4 && uniqueJudges >= 2;

            progress.push({
              level,
              totalQs,
              uniqueJudges,
              hasTitle,
              qsToTitle: hasTitle ? 0 : Math.max(0, 4 - totalQs),
              judgesNeeded: hasTitle ? 0 : Math.max(0, 2 - uniqueJudges),
              recordCount: levelRecords.length
            });
          });

          debugInfo.titleProgress = progress;
          console.log('✅ Title progress calculated:', progress);
        } else {
          debugInfo.errors.push('No records found with Q\'s > 0');
        }
      }

    } catch (error: any) {
      debugInfo.errors.push(`Error: ${error.message}`);
      console.error('❌ Debug error:', error);
    }

    setResults(debugInfo);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Registry Debug Tool
            </h1>
            <p className="text-slate-600 mt-2">Test if trial data is loading for a specific dog</p>
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && testRegistration()}
              placeholder="Enter registration number (e.g., 17-1734-06)"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={testRegistration}
              disabled={testing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2 font-medium"
            >
              <Search className="h-5 w-5" />
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                    <AlertCircle className="h-5 w-5" />
                    Errors Found
                  </div>
                  <ul className="space-y-1">
                    {results.errors.map((error: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-700 ml-6">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Excel Data Info */}
              {results.excelData && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 font-semibold mb-3">
                    <CheckCircle className="h-5 w-5" />
                    Excel File Loaded
                  </div>
                  <div className="text-sm text-green-900 space-y-1">
                    <p>Total rows: <strong>{results.excelData.totalRows}</strong></p>
                    <p>Headers: {results.excelData.headers.join(', ')}</p>
                  </div>
                </div>
              )}

              {/* Matching Records */}
              {results.matchingRecords.length > 0 ? (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
                    <CheckCircle className="h-5 w-5" />
                    Found {results.matchingRecords.length} Trial Records
                  </div>
                  <div className="bg-white rounded p-3 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Level</th>
                          <th className="p-2 text-left">Judge</th>
                          <th className="p-2 text-left">Q's</th>
                          <th className="p-2 text-left">Trial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.matchingRecords.map((record: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-2">
                              {record.date instanceof Date 
                                ? record.date.toLocaleDateString() 
                                : String(record.date)}
                            </td>
                            <td className="p-2">{record.level}</td>
                            <td className="p-2">{record.judge}</td>
                            <td className="p-2 font-semibold">{record.qs}</td>
                            <td className="p-2">{record.trialName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800 font-semibold mb-2">
                    <AlertCircle className="h-5 w-5" />
                    No Matching Records
                  </div>
                  <p className="text-sm text-yellow-700">
                    No trial records found for registration number: <strong>{results.regNumber}</strong>
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    Check that:
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Registration number is correct</li>
                      <li>• Registration number matches exactly in Excel (case-sensitive)</li>
                      <li>• Dog has trial entries in Data for Tracker web.xlsx</li>
                    </ul>
                  </p>
                </div>
              )}

              {/* Title Progress */}
              {results.titleProgress.length > 0 && (
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-800 font-semibold mb-3">
                    <CheckCircle className="h-5 w-5" />
                    Title Progress Calculated
                  </div>
                  <div className="space-y-3">
                    {results.titleProgress.map((progress: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900">{progress.level}</h4>
                            <div className="text-sm text-slate-600 mt-1 space-y-1">
                              <p>Total Q's: <strong>{progress.totalQs}</strong></p>
                              <p>Unique Judges: <strong>{progress.uniqueJudges}/2</strong></p>
                              <p>Trial Records: <strong>{progress.recordCount}</strong></p>
                            </div>
                          </div>
                          <div className="text-right">
                            {progress.hasTitle ? (
                              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm">
                                ✓ Title Earned
                              </span>
                            ) : (
                              <div className="text-sm text-slate-600">
                                <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold mb-2">
                                  In Progress
                                </div>
                                {progress.qsToTitle > 0 && (
                                  <p>Need {progress.qsToTitle} more Q's</p>
                                )}
                                {progress.judgesNeeded > 0 && (
                                  <p>Need {progress.judgesNeeded} more judge{progress.judgesNeeded > 1 ? 's' : ''}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <details className="border border-slate-200 rounded-lg">
                <summary className="p-4 cursor-pointer hover:bg-slate-50 font-semibold">
                  View Raw Debug Data
                </summary>
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-4">
              <li>1. Enter a registration number from your Supabase database</li>
              <li>2. Click "Test" to check if trial data exists</li>
              <li>3. Review results to see if Q's and title progress are calculating</li>
              <li>4. If no records found, check the registration number in Excel file</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}