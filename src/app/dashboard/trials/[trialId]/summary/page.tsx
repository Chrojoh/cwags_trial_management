// File: src/app/dashboard/trials/[trialId]/summary/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileSpreadsheet,
  Download,
  Users,
  Trophy,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface TrialClass {
  id: string;
  class_name: string;
  class_type: string;
  games_subclass?: string | null;
  judge_name: string;
  trial_date: string;
  trial_day_id: string;
  total_rounds: number;
  participant_count: number;
  pass_count: number;
  fail_count: number;
  completed_runs: number;
  entries: ClassEntry[];
}

interface ClassEntry {
  id: string;
  entry_id: string;
  running_position: number;
  entry_type: string;
  entry_status: string;
  entries: {
    handler_name: string;
    dog_call_name: string;
    cwags_number: string;
  };
  scores?: Array<{
    scent1?: string | null;
    scent2?: string | null;
    scent3?: string | null;
    scent4?: string | null;
    fault1?: string | null;
    fault2?: string | null;
    time_seconds?: number | null;
    numerical_score?: number | null;
    pass_fail?: string | null;
    entry_status?: string | null;
    judge_notes?: string | null;
  }>;
}

export default function ClassSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const trialId = params.trialId as string;

  const [summaryData, setSummaryData] = useState<{
    trial: Trial;
    classes: TrialClass[];
    statistics: any;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trialId) {
      loadSummaryData();
    }
  }, [trialId]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading trial summary data for:', trialId);

      const result = await simpleTrialOperations.getTrialSummaryWithScores(trialId);
      if (!result.success) {
        throw new Error(result.error as string);
      }

      setSummaryData(result.data);
      console.log('Trial summary data loaded successfully');

    } catch (err) {
      console.error('Error loading trial summary data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

const generateExcelReport = async () => {
  if (!summaryData) {
    alert('No data available to export');
    return;
  }

  try {
    setExporting(true);
    console.log('Generating Excel report...');

    // Get complete trial structure including rounds without entries
    const allRoundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
    if (!allRoundsResult.success) {
      throw new Error('Failed to load complete trial structure');
    }
    const allTrialRounds = allRoundsResult.data || [];

    // Step 1: Normalize class names for display and define blueprint order
    const normalizeClassName = (className: string): string => {
      const corrections: Record<string, string> = {
        'Patrol': 'Patrol 1',
        'Detective': 'Detective 2',
        'Investigator': 'Investigator 3',
        'Private Inv': 'Private Investigator',
        'Det Diversions': 'Detective Diversions'
      };
      return corrections[className] || className;
    };

    // Blueprint class ordering
    const blueprintOrder = [
      'Patrol 1', 'Detective 2', 'Investigator 3', 'Super Sleuth', 
      'Private Investigator', 'Detective Diversions',
      'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
      'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6',
      'Obedience 1', 'Obedience 2', 'Obedience 3', 'Obedience 4', 'Obedience 5',
      'Starter', 'Advanced', 'Pro', 'ARF',
      'Zoom 1', 'Zoom 1.5', 'Zoom 2',
      'Games 1', 'Games 2', 'Games 3', 'Games 4'
    ];

    const getClassOrder = (className: string): number => {
      const index = blueprintOrder.indexOf(className);
      return index === -1 ? 999 : index;
    };

    // Step 2: Build complete class structure with all rounds
    const classesByName = new Map<string, {
      className: string;
      allParticipants: Map<string, {
        cwagsNumber: string;
        dogName: string;
        handlerName: string;
      }>;
      allRounds: Array<{
        roundId: string;
        judgeInfo: string;
        trialDate: string;
        roundNumber: number;
        sortOrder: number;
        results: Map<string, string>; // cwagsNumber -> result
      }>;
      totalPasses: number;
      totalRuns: number;
      classOrder: number;
    }>();

    // Step 3: Process all trial rounds to create complete structure
    allTrialRounds.forEach((round: any) => {
      const className = round.trial_classes?.class_name;
      if (!className) return;

      const normalizedName = normalizeClassName(className);
      const trialDate = round.trial_classes?.trial_days?.trial_date;
      if (!trialDate) return;

      if (!classesByName.has(normalizedName)) {
        classesByName.set(normalizedName, {
          className: normalizedName,
          allParticipants: new Map(),
          allRounds: [],
          totalPasses: 0,
          totalRuns: 0,
          classOrder: getClassOrder(normalizedName)
        });
      }

      const classData = classesByName.get(normalizedName)!;
      
      // Create sort order: date first, then round number
      const dateSort = new Date(trialDate).getTime();
      const sortOrder = dateSort + round.round_number;

      // Add round to class structure
      classData.allRounds.push({
        roundId: round.id,
        judgeInfo: round.judge_name || 'TBD',
        trialDate: trialDate,
        roundNumber: round.round_number,
        sortOrder: sortOrder,
        results: new Map()
      });
    });

    // Step 4: Sort rounds chronologically within each class
    classesByName.forEach(classData => {
      classData.allRounds.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    // Step 5: Process actual entries and scores
    summaryData.classes.forEach(cls => {
      const normalizedName = normalizeClassName(cls.class_name);
      const classData = classesByName.get(normalizedName);
      if (!classData) return;

      cls.entries.forEach(entry => {
        const cwagsNumber = entry.entries.cwags_number;
        
        // Add participant to class
        if (!classData.allParticipants.has(cwagsNumber)) {
          classData.allParticipants.set(cwagsNumber, {
            cwagsNumber: entry.entries.cwags_number,
            dogName: entry.entries.dog_call_name,
            handlerName: entry.entries.handler_name
          });
        }

        // Process scores for each round
        if (entry.scores && entry.scores.length > 0) {
          entry.scores.forEach((score, roundIndex) => {
            // Find the matching round by date and round number
            const targetRound = classData.allRounds.find(r => 
              r.trialDate === cls.trial_date && 
              r.roundNumber === (roundIndex + 1)
            );

            if (targetRound) {
              // Determine result based on score
              let result = '-';
              if (score.entry_status === 'entered' && !score.pass_fail) {
                result = '*'; // Entered but not scored yet
              } else if (score.pass_fail === 'Pass') {
                result = cls.class_type === 'games' && cls.games_subclass ? cls.games_subclass : 'P';
                classData.totalPasses++;
              } else if (score.pass_fail === 'Fail') {
                result = 'F';
              }

              if (result !== '-') {
                classData.totalRuns++;
              }

              targetRound.results.set(cwagsNumber, result);
            }
          });
        }
      });
    });

    // Step 6: Create Excel workbook
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Step 7: Create summary overview sheet with actual statistics
    const summarySheetData = [
      ['Trial Summary'],
      ['Trial Name:', summaryData.trial.trial_name],
      ['Club:', summaryData.trial.club_name],
      ['Location:', summaryData.trial.location],
      [],
      ['Class Name', 'Total Participants', 'Total Rounds', 'Completion Rate', 'Pass Rate']
    ];

    // Sort classes by blueprint order for summary
    const sortedClasses = Array.from(classesByName.values()).sort((a, b) => a.classOrder - b.classOrder);

    sortedClasses.forEach((classData) => {
      const passRate = classData.totalRuns > 0 
        ? `${Math.round((classData.totalPasses / classData.totalRuns) * 100)}%`
        : '0%';
      
      const completionRate = classData.allParticipants.size > 0 && classData.allRounds.length > 0
        ? `${Math.round((classData.totalRuns / (classData.allParticipants.size * classData.allRounds.length)) * 100)}%`
        : '0%';

      summarySheetData.push([
        classData.className,
        classData.allParticipants.size.toString(),
        classData.allRounds.length.toString(),
        completionRate,
        passRate
      ]);
    });

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Step 8: Create individual class matrix sheets in blueprint order
    sortedClasses.forEach((classData) => {
      const sheetData = [];
      
      // Initialize empty rows for proper positioning
      for (let i = 0; i < 6; i++) {
        sheetData.push([]);
      }
      
      // Row 1: Trial name
      sheetData[0] = [summaryData.trial.trial_name];
      
      // Row 3: Class name in column F (index 5)
      sheetData[2] = ['', '', '', '', '', classData.className];
      
      // Row 4: Class (Round #) headers starting from column D
      const row4Headers = ['', '', '']; // A, B, C, D columns
      classData.allRounds.forEach(round => {
        row4Headers.push(`Round ${round.roundNumber}`);
      });
      sheetData[3] = row4Headers;
      
      // Row 5: Judge names starting from column D
      const row5Headers = ['', '', ''];
      classData.allRounds.forEach(round => {
        row5Headers.push(round.judgeInfo);
      });
      sheetData[4] = row5Headers;
      
      // Row 6: Dates and participant headers
      const row6Headers = ['C-WAGS Number', 'Dog Name', 'Handler Name'];
      classData.allRounds.forEach(round => {
        const date = new Date(round.trialDate);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        row6Headers.push(formattedDate);
      });
      sheetData[5] = row6Headers;

      // Row 7+: Create participant rows
      const participantEntries = Array.from(classData.allParticipants.values());
      
      participantEntries.forEach(participant => {
        const row = [
          participant.cwagsNumber,
          participant.dogName,
          participant.handlerName          
        ];
        
        // Add results for ALL rounds chronologically
        classData.allRounds.forEach(round => {
          const result = round.results.get(participant.cwagsNumber) || '-';
          row.push(result);
        });
        
        sheetData.push(row);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Create clean sheet name
      let sheetName = classData.className.replace(/[:\\/?*[\]]/g, '');
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Step 9: Download the file
    const fileName = `${summaryData.trial.trial_name.replace(/[^a-zA-Z0-9]/g, '_')}_ClassSummary.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log('Excel report generated successfully');

  } catch (error) {
    console.error('Error generating Excel report:', error);
    setError('Failed to generate Excel report: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setExporting(false);
  }
};
  const getDisplayClassName = (cls: TrialClass): string => {
    if (cls.class_type === 'games' && cls.games_subclass) {
      return `${cls.class_name} - ${cls.games_subclass}`;
    }
    return cls.class_name;
  };

  const getResultDisplay = (entry: ClassEntry, classInfo: TrialClass): { result: string; color: string } => {
    const score = entry.scores?.[0];
    if (!score || !score.pass_fail) {
      return { result: '-', color: 'text-gray-500' };
    }

    // Handle Games subclass results
    if (classInfo.class_type === 'games' && score.pass_fail === 'Pass' && classInfo.games_subclass) {
      return { result: classInfo.games_subclass, color: 'text-purple-600 font-semibold' };
    }

    // Handle other class types
    if (score.pass_fail === 'Pass') {
      return { result: 'P', color: 'text-green-600 font-semibold' };
    } else if (score.pass_fail === 'Fail') {
      return { result: 'F', color: 'text-red-600 font-semibold' };
    }

    return { result: '-', color: 'text-gray-500' };
  };

  const selectedClassData = selectedClassId === 'all' 
    ? null 
    : summaryData?.classes.find(cls => cls.id === selectedClassId);

  if (!user) {
    return (
      <MainLayout title="Class Summary Sheet">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You must be logged in to access this page.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Class Summary Sheet">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading trial summary data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !summaryData) {
    return (
      <MainLayout title="Class Summary Sheet">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Trial not found. Please check the trial ID and try again.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: summaryData.trial.trial_name, href: `/dashboard/trials/${trialId}` },
    { label: 'Class Summary' }
  ];

  return (
    <MainLayout 
      title="Class Summary Sheet"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span>Class Summary Sheet</span>
            </h1>
            <p className="text-gray-600 mt-1">Track competitor progress across all rounds of a class</p>
          </div>
          <Button onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>

        {/* Trial and Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{summaryData.trial.trial_name}</CardTitle>
            <CardDescription>{summaryData.trial.club_name} • {summaryData.trial.location}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Class:
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📊 Select All Classes</SelectItem>
                    {summaryData.classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {getDisplayClassName(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={generateExcelReport} 
                  disabled={exporting}
                  className="w-full md:w-auto"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {summaryData.classes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No classes with entries found for this trial</p>
            </CardContent>
          </Card>
        ) : selectedClassId === 'all' ? (
         // All Classes Summary View
<>
 <Card>
   <CardHeader>
     <CardTitle>All Classes Summary</CardTitle>
     <CardDescription>
       {summaryData.trial.trial_name} • {(() => {
         const normalizeClassName = (className: string): string => {
           const corrections: Record<string, string> = {
             'Patrol': 'Patrol 1',
             'Detective': 'Detective 2',
             'Investigator': 'Investigator 3',
             'Private Inv': 'Private Investigator',
             'Det Diversions': 'Detective Diversions'
           };
           return corrections[className] || className;
         };
         
         const uniqueClasses = new Set(summaryData.classes.map(cls => normalizeClassName(cls.class_name)));
         return uniqueClasses.size;
       })()} Classes
     </CardDescription>
   </CardHeader>
   <CardContent>
     <div className="overflow-x-auto">
       <table className="w-full border-collapse">
         <thead>
           <tr className="bg-gray-50">
             <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Class Name</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Participants</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Rounds</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Completion Rate</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Pass Rate</th>
           </tr>
         </thead>
         <tbody>

{(() => {
  // Since the backend now provides consolidated classes with total_rounds already calculated,
  // we can directly use the data without additional consolidation
  
  return summaryData.classes.map((cls, index) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="border border-gray-300 px-4 py-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{cls.class_name}</span>
          {cls.class_type === 'games' && cls.games_subclass && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              <Trophy className="h-3 w-3 mr-1" />
              {cls.games_subclass}
            </Badge>
          )}
        </div>
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center font-mono">
        {cls.participant_count}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center font-mono">
        {cls.total_rounds || 1}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        <span className="text-green-600 font-medium">
          {cls.participant_count > 0 ? Math.round((cls.completed_runs / cls.participant_count) * 100) : 0}%
        </span>
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        <span className="font-medium">
          {cls.completed_runs > 0 ? Math.round((cls.pass_count / cls.completed_runs) * 100) : 0}%
        </span>
      </td>
    </tr>
  ));
})()}
         </tbody>
       </table>
     </div>
   </CardContent>
 </Card>

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-600">{summaryData.statistics.total_classes}</div>
                  <div className="text-sm text-gray-600">Total Classes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">{summaryData.statistics.total_participants}</div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">{summaryData.statistics.total_completed}</div>
                  <div className="text-sm text-gray-600">Completed Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-teal-600">{summaryData.statistics.total_passes}</div>
                  <div className="text-sm text-gray-600">Total Passes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(summaryData.statistics.overall_pass_rate)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Pass Rate</div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // Individual Class Detail View
          selectedClassData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <span>Class Summary: {getDisplayClassName(selectedClassData)}</span>
                    {selectedClassData.class_type === 'games' && selectedClassData.games_subclass && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Trophy className="h-3 w-3 mr-1" />
                        Games: {selectedClassData.games_subclass}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {summaryData.trial.trial_name} • {selectedClassData.judge_name} • {selectedClassData.entries.length} Participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">C-WAGS Number</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Dog Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Handler Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {selectedClassData.judge_name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClassData.entries
                          .sort((a, b) => a.running_position - b.running_position)
                          .map(entry => {
                            const { result, color } = getResultDisplay(entry, selectedClassData);
                            
                            return (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                                  {entry.entries.cwags_number}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 font-medium">
                                  {entry.entries.dog_call_name}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {entry.entries.handler_name}
                                </td>
                                <td className={`border border-gray-300 px-3 py-2 text-center ${color}`}>
                                  {result}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Class Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-blue-600">{selectedClassData.entries.length}</div>
                    <div className="text-sm text-gray-600">Total Participants</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-purple-600">1</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center space-x-1">
                      <CheckCircle className="h-5 w-5" />
                      <span>{selectedClassData.pass_count}</span>
                    </div>
                    <div className="text-sm text-gray-600">Passes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center space-x-1">
                      <XCircle className="h-5 w-5" />
                      <span>{selectedClassData.fail_count}</span>
                    </div>
                    <div className="text-sm text-gray-600">Fails</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}