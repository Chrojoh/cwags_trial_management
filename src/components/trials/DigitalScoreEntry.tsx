'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  scent1: string;      // "", "✓", "✗"
  scent2: string;
  scent3: string;
  scent4: string;
  fault1: string;
  fault2: string;
  time_seconds: string; // always string in UI, may be "" if none
  pass_fail: string;    // "Pass", "Fail" or ""
}

export default function DigitalScoreEntry({ selectedClass, trial }: ScoreEntryPageProps) {
  const [entries, setEntries] = useState<EntryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [selectedClass?.id]);

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
          if (
            selection.trial_round_id === selectedClass.id &&
            selection.entry_status !== 'withdrawn'
          ) {
            const score = (selection.scores && selection.scores[0]) || {};

            roundEntries.push({
              id: selection.id,
              cwagsNumber: entry.cwags_number || '',
              dogName: entry.dog_call_name || '',
              handlerName: entry.handler_name || '',
              // Normalize null/undefined to "" for UI
              scent1: score.scent1 ?? '',
              scent2: score.scent2 ?? '',
              scent3: score.scent3 ?? '',
              scent4: score.scent4 ?? '',
              fault1: score.fault1 ?? '',
              fault2: score.fault2 ?? '',
              time_seconds:
                score.time_seconds !== null && score.time_seconds !== undefined
                  ? String(score.time_seconds)
                  : '',
              pass_fail: score.pass_fail ?? '',
            });
          }
        });
      });

      // Safe sort by cwagsNumber even if some are missing
      roundEntries.sort((a, b) => (a.cwagsNumber || '').localeCompare(b.cwagsNumber || ''));

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
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  const saveAllScores = async () => {
    try {
      setSaving(true);

      for (const entry of entries) {
        const scoreData = {
          // Save optional fields as null when blank
          scent1: entry.scent1 ? entry.scent1 : null,
          scent2: entry.scent2 ? entry.scent2 : null,
          scent3: entry.scent3 ? entry.scent3 : null,
          scent4: entry.scent4 ? entry.scent4 : null,
          fault1: entry.fault1 ? entry.fault1 : null,
          fault2: entry.fault2 ? entry.fault2 : null,
          time_seconds: entry.time_seconds
            ? parseFloat(entry.time_seconds)
            : null,
          // Only mandatory from your perspective
          pass_fail: entry.pass_fail ? entry.pass_fail : null,
        };

        const result = await simpleTrialOperations.upsertScore({
          entry_selection_id: entry.id,
          trial_round_id: selectedClass.id,
          ...scoreData,
        });

        if (!result.success) {
          throw new Error(`Failed to save score for ${entry.dogName}`);
        }
      }

      setSaved(true);
      alert('All scores saved successfully!');
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('Failed to save scores. Please check required fields (Pass/Fail) and try again.');
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
          {/* Saved indicator */}
          {saved && (
            <div className="mb-4 text-green-600 flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>Scores saved</span>
            </div>
          )}

          {/* Context heading */}
          <h2 className="text-xl font-bold mb-6">
            {selectedClass?.class_name} — Round {selectedClass?.round_number} — Judge:{' '}
            {selectedClass?.judge_name}
          </h2>

          <div className="border border-gray-300 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-300">
                <tr>
                  <th className="border p-2 text-sm">Designation Number</th>
                  <th className="border p-2 text-sm">Dog / Handler</th>
                  <th className="border p-2 text-sm w-20">Scent 1</th>
                  <th className="border p-2 text-sm w-20">Scent 2</th>
                  <th className="border p-2 text-sm w-20">Scent 3</th>
                  <th className="border p-2 text-sm w-20">Scent 4</th>
                  <th className="border p-2 text-sm w-40">Fault 1</th>
                  <th className="border p-2 text-sm w-40">Fault 2</th>
                  <th className="border p-2 text-sm w-24">Time</th>
                  <th className="border p-2 text-sm w-24">Pass / Fail</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'}
                  >
                    {/* C-WAGS number */}
                    <td className="border p-2 font-mono text-sm">
                      {entry.cwagsNumber}
                    </td>

                    {/* Dog / Handler */}
                    <td className="border p-2 text-sm">
                      <div className="font-semibold">{entry.dogName}</div>
                      <div className="text-gray-600">{entry.handlerName}</div>
                    </td>

                    {/* Scent Inputs: ✓ / ✗ / – (reset) */}
                    {(['scent1', 'scent2', 'scent3', 'scent4'] as const).map(field => (
                      <td className="border p-1 w-20" key={field}>
                        <Select
                          value={entry[field] || '-'}
                          onValueChange={value =>
                            updateEntry(idx, field, value === '-' ? '' : value)
                          }
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

                    {/* Faults: wider text boxes */}
                    {(['fault1', 'fault2'] as const).map(field => (
                      <td className="border p-1 w-40" key={field}>
                        <Input
                          value={entry[field]}
                          onChange={e =>
                            updateEntry(idx, field, e.target.value)
                          }
                          className="w-full h-8 text-center text-sm"
                        />
                      </td>
                    ))}

                    {/* Time (optional) */}
                    <td className="border p-1 w-24">
                      <Input
                        value={entry.time_seconds}
                        onChange={e =>
                          updateEntry(idx, 'time_seconds', e.target.value)
                        }
                        type="number"
                        step="0.01"
                        className="w-full h-8 text-center text-sm"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Pass / Fail (only truly required one) */}
                    <td className="border p-1 w-24">
                      <Select
                        value={entry.pass_fail || ''}
                        onValueChange={value =>
                          updateEntry(idx, 'pass_fail', value)
                        }
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
          </div>

          {/* Save Button */}
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
