'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDivisionColor } from '@/lib/divisionUtils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Check } from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface ScoreEntryPageProps {
  selectedClass: any;
  trial: any;
}

interface EntryScore {
  id: string;
  runningOrder: number;
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  division?: string | null;
  entry_type: 'regular' | 'feo';  // ✅ ADDED
  // Scent fields
  scent1: string;
  scent2: string;
  scent3: string;
  scent4: string;
  fault1: string;
  fault2: string;
  time_seconds: string;
  // Rally/Obedience fields
  numerical_score: string;
  // Common
  pass_fail: string;
}

export default function DigitalScoreEntry({ selectedClass, trial }: ScoreEntryPageProps) {
  const [entries, setEntries] = useState<EntryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scoreSheetType, setScoreSheetType] = useState<'scent' | 'rally_obedience' | 'games'>('scent');

  useEffect(() => {
    loadEntries();
  }, [selectedClass?.id]);

  useEffect(() => {
    // Determine score sheet type based on class type
    if (!selectedClass) return;
    
    const className = selectedClass.class_name?.toLowerCase() || '';
    const classType = selectedClass.class_type?.toLowerCase() || '';
    
    if (classType === 'scent' || className.includes('patrol') || className.includes('detective') || 
        className.includes('investigator') || className.includes('sleuth') || className.includes('private')) {
      setScoreSheetType('scent');
    } else if (classType === 'rally' || className.includes('rally') || className.includes('obedience')) {
      setScoreSheetType('rally_obedience');
    } else if (classType === 'games' || className.includes('games')) {
      setScoreSheetType('games');
    }
  }, [selectedClass]);

  const loadEntries = async () => {
    if (!trial?.id || !selectedClass?.id) return;

    try {
      setLoading(true);

      const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trial.id);
      if (!entriesResult.success) {
        throw new Error('Failed to load entries');
      }

      const roundEntries: EntryScore[] = [];

      (entriesResult.data || []).forEach((entry: any) => {
        const selections = entry.entry_selections || [];
        selections.forEach((selection: any) => {
          // ✅ Handle compound IDs for Games classes
          let baseRoundId = selectedClass.id;
          let targetSubclass = selectedClass.games_subclass;
          
          if (selectedClass.class_type === 'games' && selectedClass.id.includes('-')) {
            const parts = selectedClass.id.split('-');
            const lastPart = parts[parts.length - 1];
            
            if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
              baseRoundId = parts.slice(0, -1).join('-');
              targetSubclass = lastPart;
            }
          }
          
          // Check if round ID matches
          const roundMatches = selection.trial_round_id === selectedClass.id || 
                              selection.trial_round_id === baseRoundId;
          
          // For Games classes, also check subclass matches
          let subclassMatches = true;
          if (selectedClass.class_type === 'games' && targetSubclass) {
            subclassMatches = selection.games_subclass === targetSubclass;
          }
          
          if (roundMatches && subclassMatches && selection.entry_status !== 'withdrawn') {
            const scoresArray = Array.isArray(selection.scores) 
              ? selection.scores 
              : selection.scores 
                ? [selection.scores] 
                : [];

            const score = scoresArray[0] || {};

            // ✅ AUTO-FILL FEO ENTRIES
            let passFail = score.pass_fail ?? '';
            if (selection.entry_type === 'feo' && !passFail) {
              passFail = 'FEO';
            }

            // ✅ USE SUBSTITUTE DOG INFO IF EXISTS
            const cwagsNumber = selection.substitute_cwags_number || entry.cwags_number || '';
            const dogName = selection.substitute_dog_name || entry.dog_call_name || '';
            const handlerName = selection.substitute_handler_name || entry.handler_name || '';

            roundEntries.push({
              id: selection.id,
              runningOrder: selection.running_position || 0,
              cwagsNumber,
              dogName,
              handlerName,
              division: selection.division || null,
              entry_type: selection.entry_type || 'regular',  // ✅ ADDED
              scent1: score.scent1 ?? '',
              scent2: score.scent2 ?? '',
              scent3: score.scent3 ?? '',
              scent4: score.scent4 ?? '',
              fault1: score.fault1 ?? '',
              fault2: score.fault2 ?? '',
              time_seconds: score.time_seconds !== null && score.time_seconds !== undefined
                ? String(score.time_seconds)
                : '',
              numerical_score: score.numerical_score !== null && score.numerical_score !== undefined
                ? String(score.numerical_score)
                : '',
              pass_fail: passFail,  // ✅ AUTO-FILLED FOR FEO
            });
          }
        });
      });

      roundEntries.sort((a, b) => a.runningOrder - b.runningOrder);
      setEntries(roundEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof EntryScore, value: string) => {
    setEntries(prev => {
      const updated = [...prev];
      const entry = updated[index];
      
      // ✅ PREVENT EDITING FEO PASS/FAIL
      if (entry.entry_type === 'feo' && field === 'pass_fail') {
        return prev; // Don't allow changes to FEO pass_fail
      }
      
      updated[index] = { ...entry, [field]: value };
      
      // Auto-calculate pass/fail for rally/obedience
      if (scoreSheetType === 'rally_obedience' && field === 'numerical_score') {
        const numScore = parseFloat(value);
        const passingScore = selectedClass.class_name?.toLowerCase().includes('obedience 5') ? 120 : 70;
        
        if (!isNaN(numScore)) {
          // ✅ FEO ENTRIES ALWAYS GET "FEO"
          if (entry.entry_type === 'feo') {
            updated[index].pass_fail = 'FEO';
          } else {
            updated[index].pass_fail = numScore >= passingScore ? 'Pass' : 'Fail';
          }
        }
      }
      
      return updated;
    });
    setSaved(false);
  };

  const saveAllScores = async () => {
    try {
      setSaving(true);

      for (const entry of entries) {
        let scoreData: any = {};

        if (scoreSheetType === 'scent') {
          scoreData = {
            scent1: entry.scent1 || null,
            scent2: entry.scent2 || null,
            scent3: entry.scent3 || null,
            scent4: entry.scent4 || null,
            fault1: entry.fault1 || null,
            fault2: entry.fault2 || null,
            time_seconds: entry.time_seconds && !isNaN(parseFloat(entry.time_seconds)) 
              ? parseFloat(entry.time_seconds) 
              : null,
            pass_fail: entry.pass_fail || null,
          };
        } else if (scoreSheetType === 'rally_obedience') {
          const numScore = entry.numerical_score && !isNaN(parseFloat(entry.numerical_score))
            ? parseFloat(entry.numerical_score)
            : null;
          scoreData = {
            numerical_score: numScore,
            pass_fail: entry.pass_fail || null,
          };
        } else if (scoreSheetType === 'games') {
          let passFail = entry.pass_fail || null;
          if (passFail === 'Pass' && selectedClass?.games_subclass) {
            passFail = selectedClass.games_subclass;
          }
          scoreData = {
            pass_fail: passFail,
          };
        }

        // Extract base round ID for Games classes with compound IDs
        let roundIdForScore = selectedClass.id;
        
        if (selectedClass.class_type === 'games' && selectedClass.id.includes('-')) {
          const parts = selectedClass.id.split('-');
          const lastPart = parts[parts.length - 1];
          
          if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
            roundIdForScore = parts.slice(0, -1).join('-');
          }
        }

        const result = await simpleTrialOperations.upsertScore({
          entry_selection_id: entry.id,
          trial_round_id: roundIdForScore,
          ...scoreData,
        });

        if (!result.success) {
          console.error('❌ Failed to save score for', entry.dogName);
        }
      }

      setSaved(true);
      alert('All scores saved successfully!');
      
      await loadEntries();

      // Trigger reload of parent component
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('scoresUpdated'));
      }
      
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('Failed to save scores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading scores...</div>;
  }

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-8">
          {saved && (
            <div className="mb-4 text-green-600 flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>Scores saved</span>
            </div>
          )}

          <h2 className="text-xl font-bold mb-6">
            {selectedClass?.class_name} — Round {selectedClass?.round_number} — Judge: {selectedClass?.judge_name}
          </h2>

          <div className="border border-gray-300 overflow-x-auto">
            {scoreSheetType === 'scent' && (
              <table className="w-full">
                <thead className="bg-orange-300">
                  <tr>
                    <th className="border p-2 text-sm">C-WAGS #</th>
                    <th className="border p-2 text-sm">Dog / Handler</th>
                    <th className="border p-2 text-sm w-20">Scent 1</th>
                    <th className="border p-2 text-sm w-20">Scent 2</th>
                    <th className="border p-2 text-sm w-20">Scent 3</th>
                    <th className="border p-2 text-sm w-20">Scent 4</th>
                    <th className="border p-2 text-sm w-40">Fault 1</th>
                    <th className="border p-2 text-sm w-40">Fault 2</th>
                    <th className="border p-2 text-sm w-24">Time</th>
                    <th className="border p-2 text-sm w-24">Pass/Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr 
                      key={entry.id} 
                      className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                        entry.entry_type === 'feo' ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                      <td className="border p-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {entry.dogName}
                              {entry.division && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.division === 'A' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                                  entry.division === 'B' ? 'bg-green-100 text-green-700 border border-green-300' :
                                  entry.division === 'TO' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                                  entry.division === 'JR' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {entry.division}
                                </span>
                              )}
                              {/* ✅ FEO BADGE */}
                              {entry.entry_type === 'feo' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                  FEO
                                </span>
                              )}
                            </div>
                            <div className="text-gray-600">{entry.handlerName}</div>
                          </div>
                        </div>
                      </td>
                      {(['scent1', 'scent2', 'scent3', 'scent4'] as const).map(field => (
                        <td className="border p-1 w-20" key={field}>
                          <Select
                            value={entry[field] || '-'}
                            onValueChange={value => updateEntry(idx, field, value === '-' ? '' : value)}
                            disabled={entry.entry_type === 'feo'}
                          >
                            <SelectTrigger className="h-8 bg-white">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="-">–</SelectItem>
                              <SelectItem value="✓">✓</SelectItem>
                              <SelectItem value="✗">✗</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                      {(['fault1', 'fault2'] as const).map(field => (
                        <td className="border p-1 w-40" key={field}>
                          <Input
                            value={entry[field]}
                            onChange={e => updateEntry(idx, field, e.target.value)}
                            className="w-full h-8 text-center text-sm"
                            disabled={entry.entry_type === 'feo'}
                          />
                        </td>
                      ))}
                      <td className="border p-1 w-24">
                        <Input
                          value={entry.time_seconds}
                          onChange={e => updateEntry(idx, 'time_seconds', e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full h-8 text-center text-sm"
                          placeholder="0.00"
                          disabled={entry.entry_type === 'feo'}
                        />
                      </td>
                      <td className="border p-1 w-24">
                        <Select
                          value={entry.pass_fail || ''}
                          onValueChange={value => updateEntry(idx, 'pass_fail', value)}
                          disabled={entry.entry_type === 'feo'}
                        >
                          <SelectTrigger className="h-8 bg-white">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Pass">Pass</SelectItem>
                            <SelectItem value="Fail">Fail</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {scoreSheetType === 'rally_obedience' && (
              <table className="w-full">
                <thead className="bg-orange-300">
                  <tr>
                    <th className="border p-2 text-sm">C-WAGS #</th>
                    <th className="border p-2 text-sm">Dog / Handler</th>
                    <th className="border p-2 text-sm w-32">Score</th>
                    <th className="border p-2 text-sm w-24">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr 
                      key={entry.id} 
                      className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                        entry.entry_type === 'feo' ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                      <td className="border p-2 text-sm">
                        <div className="font-semibold flex items-center gap-2">
                          {entry.dogName}
                          {entry.division && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              entry.division === 'A' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                              entry.division === 'B' ? 'bg-green-100 text-green-700 border border-green-300' :
                              entry.division === 'TO' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              entry.division === 'JR' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.division}
                            </span>
                          )}
                          {/* ✅ FEO BADGE */}
                          {entry.entry_type === 'feo' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              FEO
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600">{entry.handlerName}</div>
                      </td>
                      <td className="border p-1 w-32">
                        <Input
                          value={entry.numerical_score}
                          onChange={e => updateEntry(idx, 'numerical_score', e.target.value)}
                          type="number"
                          min={selectedClass.class_name?.toLowerCase().includes('obedience 5') ? 120 : 70}
                          max={selectedClass.class_name?.toLowerCase().includes('obedience 5') ? 150 : 100}
                          className="w-full h-8 text-center text-sm"
                          placeholder={selectedClass.class_name?.toLowerCase().includes('obedience 5') ? '120-150' : '70-100'}
                          disabled={entry.entry_type === 'feo'}
                        />
                      </td>
                      <td className="border p-1 w-24">
                        <div className="h-8 flex items-center justify-center font-semibold">
                          {entry.pass_fail || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {scoreSheetType === 'games' && (
              <table className="w-full">
                <thead className="bg-orange-300">
                  <tr>
                    <th className="border p-2 text-sm">C-WAGS #</th>
                    <th className="border p-2 text-sm">Dog / Handler</th>
                    <th className="border p-2 text-sm w-32">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr 
                      key={entry.id} 
                      className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                        entry.entry_type === 'feo' ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                      <td className="border p-2 text-sm">
                        <div className="font-semibold flex items-center gap-2">
                          {entry.dogName}
                          {entry.division && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              entry.division === 'A' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                              entry.division === 'B' ? 'bg-green-100 text-green-700 border border-green-300' :
                              entry.division === 'TO' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              entry.division === 'JR' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.division}
                            </span>
                          )}
                          {/* ✅ FEO BADGE */}
                          {entry.entry_type === 'feo' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              FEO
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600">{entry.handlerName}</div>
                      </td>
                      <td className="border p-1 w-32">
                        <Select
                          value={entry.pass_fail || 'none'}
                          onValueChange={value => updateEntry(idx, 'pass_fail', value === 'none' ? '' : value)}
                          disabled={entry.entry_type === 'feo'}
                        >
                          <SelectTrigger className="h-8 bg-white">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="GB">GB</SelectItem>
                            <SelectItem value="BJ">BJ</SelectItem>
                            <SelectItem value="T">T</SelectItem>
                            <SelectItem value="P">P</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="Fail">Fail</SelectItem>
                            <SelectItem value="ABS">Abs</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={saveAllScores} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save All Scores'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}