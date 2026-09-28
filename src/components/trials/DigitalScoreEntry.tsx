'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Save, Check, ClipboardList, Rows3, UserPlus } from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { isAbsentSelection, isScorableSelection } from '@/lib/selectionStatus';
import { calculatePlacements, validateManualPlacements } from '@/lib/placementUtils';

interface ScoreEntryPageProps {
  selectedClass: any;
  trial: any;
  availableRounds?: any[];
  onAddDayOfEntry?: (roundNumber: number) => void;
}

interface EntryScore {
  id: string;
  roundId: string;
  roundNumber: number;
  runningOrder: number;
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  division?: string | null;
  entry_type: 'regular' | 'feo';
  entry_status: string;
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
  manual_placement: string;
  // Common
  pass_fail: string;
}

// Converts seconds (83.45) to display string "1:23.45"
function secondsToDisplay(seconds: string): string {
  const num = parseFloat(seconds);
  if (isNaN(num)) return seconds; // pass through if already a string like "1:23"
  const mins = Math.floor(num / 60);
  const secs = (num % 60).toFixed(2);
  const secsFormatted = parseFloat(secs) < 10 ? `0${secs}` : secs;
  return mins > 0 ? `${mins}:${secsFormatted}` : `${secsFormatted}`;
}

// Converts display string "1:23.45" back to seconds (83.45)
function displayToSeconds(display: string): string {
  if (!display) return '';
  // If it already looks like a plain number, return as-is
  if (!display.includes(':')) return display;
  const parts = display.split(':');
  const mins = parseFloat(parts[0]) || 0;
  const secs = parseFloat(parts[1]) || 0;
  return String((mins * 60) + secs);
}

export default function DigitalScoreEntry({
  selectedClass,
  trial,
  availableRounds = [],
  onAddDayOfEntry,
}: ScoreEntryPageProps) {
  const [entries, setEntries] = useState<EntryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryMode, setEntryMode] = useState<'round' | 'score_sheet'>('round');
  const [sheetLayout, setSheetLayout] = useState<'paired' | 'single'>('paired');
  const [scoreSheetType, setScoreSheetType] = useState<'scent' | 'rally_obedience' | 'games'>(
    'scent'
  );

  const pairedRounds = useMemo(() => {
    if (!selectedClass) return [];
    if (scoreSheetType !== 'scent' || sheetLayout === 'single') return [selectedClass];

    const matchingRounds = availableRounds
      .filter(
        (round) =>
          round.class_id === selectedClass.class_id &&
          round.trial_day_id === selectedClass.trial_day_id &&
          round.class_name === selectedClass.class_name &&
          round.judge_name === selectedClass.judge_name
      )
      .sort((left, right) => Number(left.round_number || 1) - Number(right.round_number || 1));

    const selectedIndex = matchingRounds.findIndex((round) => round.id === selectedClass.id);
    if (selectedIndex < 0) return [selectedClass];
    const pairStart = Math.floor(selectedIndex / 2) * 2;
    return matchingRounds.slice(pairStart, pairStart + 2);
  }, [availableRounds, scoreSheetType, selectedClass, sheetLayout]);

  const displayedEntries = useMemo(
    () =>
      entryMode === 'score_sheet'
        ? entries
        : entries.filter((entry) => entry.roundId === selectedClass?.id),
    [entries, entryMode, selectedClass?.id]
  );

  const scentSheetRows = useMemo(() => {
    if (entryMode !== 'score_sheet' || scoreSheetType !== 'scent') {
      return displayedEntries.map((entry) => ({
        key: entry.id,
        roundNumber: entry.roundNumber,
        entry,
        identityEntry: entry,
      }));
    }

    const teams = new Map<string, EntryScore[]>();
    for (const entry of displayedEntries) {
      const identity = entry.cwagsNumber.trim() || `${entry.handlerName}|${entry.dogName}`;
      teams.set(identity, [...(teams.get(identity) || []), entry]);
    }

    return [...teams.entries()]
      .sort(([, left], [, right]) => {
        const leftPosition = Math.min(...left.map((entry) => entry.runningOrder || Number.MAX_SAFE_INTEGER));
        const rightPosition = Math.min(...right.map((entry) => entry.runningOrder || Number.MAX_SAFE_INTEGER));
        return leftPosition - rightPosition || left[0].dogName.localeCompare(right[0].dogName);
      })
      .flatMap(([identity, teamEntries]) =>
        pairedRounds.map((round) => ({
          key: `${identity}-${round.id}`,
          roundNumber: Number(round.round_number || 1),
          entry: teamEntries.find((entry) => entry.roundNumber === Number(round.round_number || 1)),
          identityEntry: teamEntries[0],
        }))
      );
  }, [displayedEntries, entryMode, pairedRounds, scoreSheetType]);

  useEffect(() => {
    const key = `score-sheet-layout:${trial?.id || 'trial'}:${selectedClass?.trial_day_id || 'day'}`;
    const remembered = window.localStorage.getItem(key);
    if (remembered === 'paired' || remembered === 'single') setSheetLayout(remembered);
  }, [selectedClass?.trial_day_id, trial?.id]);

  const chooseSheetLayout = (layout: 'paired' | 'single') => {
    setSheetLayout(layout);
    const key = `score-sheet-layout:${trial?.id || 'trial'}:${selectedClass?.trial_day_id || 'day'}`;
    window.localStorage.setItem(key, layout);
  };

  const placementDiscipline = useMemo<'rally' | 'obedience'>(() => {
    const className = selectedClass?.class_name?.toLowerCase() || '';
    const classType = selectedClass?.class_type?.toLowerCase() || '';
    return classType === 'rally' || (!className.includes('obedience') && classType !== 'obedience')
      ? 'rally'
      : 'obedience';
  }, [selectedClass]);

  const placements = useMemo(
    () =>
      calculatePlacements(
        displayedEntries.map((entry) => ({
          id: entry.id,
          division: entry.division,
          entryType: entry.entry_type,
          entryStatus: entry.entry_status,
          passFail: entry.pass_fail,
          numericalScore: entry.numerical_score,
          tieBreakValue: entry.time_seconds ? displayToSeconds(entry.time_seconds) : null,
        })),
      ),
    [displayedEntries],
  );

  useEffect(() => {
    loadEntries();
  }, [selectedClass?.id, pairedRounds.map((round) => round.id).join('|')]);

  useEffect(() => {
    const handleDayOfEntryAdded = () => void loadEntries(true);
    window.addEventListener('dayOfEntryAdded', handleDayOfEntryAdded);
    return () => window.removeEventListener('dayOfEntryAdded', handleDayOfEntryAdded);
  }, [selectedClass?.id, pairedRounds.map((round) => round.id).join('|')]);

  useEffect(() => {
    // Determine score sheet type based on class type
    if (!selectedClass) return;

    const className = selectedClass.class_name?.toLowerCase() || '';
    const classType = selectedClass.class_type?.toLowerCase() || '';

    if (
      classType === 'scent' ||
      className.includes('patrol') ||
      className.includes('detective') ||
      className.includes('investigator') ||
      className.includes('sleuth') ||
      className.includes('private')
    ) {
      setScoreSheetType('scent');
    } else if (
      classType === 'rally' ||
      className.includes('rally') ||
      className.includes('obedience')
    ) {
      setScoreSheetType('rally_obedience');
    } else if (classType === 'games' || className.includes('games')) {
      setScoreSheetType('games');
    }
  }, [selectedClass]);

  const loadEntries = async (preserveTypedScores = false) => {
    if (!trial?.id || !selectedClass?.id) return;

    try {
      setLoading(true);

      const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trial.id);
      if (!entriesResult.success) {
        throw new Error('Failed to load entries');
      }

      const roundEntries: EntryScore[] = [];
      const roundsToLoad = pairedRounds.length > 0 ? pairedRounds : [selectedClass];

      (entriesResult.data || []).forEach((entry: any) => {
        const selections = entry.entry_selections || [];
        selections.forEach((selection: any) => {
          const matchingRound = roundsToLoad.find((round) => {
            let baseRoundId = round.id;
            let targetSubclass = round.games_subclass;
            if (round.class_type === 'games' && round.id.includes('-')) {
              const parts = round.id.split('-');
              const lastPart = parts[parts.length - 1];
              if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
                baseRoundId = parts.slice(0, -1).join('-');
                targetSubclass = lastPart;
              }
            }
            const roundMatches =
              selection.trial_round_id === round.id || selection.trial_round_id === baseRoundId;
            const subclassMatches =
              round.class_type !== 'games' || !targetSubclass || selection.games_subclass === targetSubclass;
            return roundMatches && subclassMatches;
          });

          if (matchingRound && isScorableSelection(selection.entry_status)) {
            const scoresArray = Array.isArray(selection.scores)
              ? selection.scores
              : selection.scores
                ? [selection.scores]
                : [];

            const score = scoresArray[0] || {};

            const entryStatus = selection.entry_status || '';
            const isAbsent = entryStatus === 'no_show' || entryStatus === 'absent';

            // Auto-fill pass_fail for FEO and absent entries
            let passFail = score.pass_fail ?? '';
            if (selection.entry_type === 'feo' && !passFail) {
              passFail = 'FEO';
            } else if (isAbsent && !passFail) {
              passFail = 'Abs';
            }

            // ✅ USE SUBSTITUTE DOG INFO IF EXISTS
            const cwagsNumber = entry.cwags_number || '';
            const dogName = selection.substitute_dog_name || entry.dog_call_name || '';
            const handlerName = selection.substitute_handler_name || entry.handler_name || '';

            roundEntries.push({
              id: selection.id,
              roundId: selection.trial_round_id,
              roundNumber: Number(matchingRound.round_number || 1),
              runningOrder: selection.running_position || 0,
              cwagsNumber,
              dogName,
              handlerName,
              division: selection.division || null,
              entry_type: selection.entry_type || 'regular',
              entry_status: entryStatus,
              scent1: score.scent1 ?? '',
              scent2: score.scent2 ?? '',
              scent3: score.scent3 ?? '',
              scent4: score.scent4 ?? '',
              fault1: score.fault1 ?? '',
              fault2: score.fault2 ?? '',
              time_seconds:
                score.time_seconds !== null && score.time_seconds !== undefined
                  ? secondsToDisplay(String(score.time_seconds))
                  : '',
              numerical_score:
                score.numerical_score !== null && score.numerical_score !== undefined
                  ? String(score.numerical_score)
                  : '',
              manual_placement:
                (selectedClass.class_type?.toLowerCase() === 'games' ||
                  selectedClass.class_name?.toLowerCase().includes('games')) &&
                score.numerical_score
                  ? String(score.numerical_score)
                  : '',
              pass_fail: passFail,
            });
          }
        });
      });

      roundEntries.sort(
        (a, b) =>
          a.runningOrder - b.runningOrder ||
          a.cwagsNumber.localeCompare(b.cwagsNumber) ||
          a.roundNumber - b.roundNumber
      );
      setEntries((previous) => {
        if (!preserveTypedScores) return roundEntries;
        const previousBySelection = new Map(previous.map((entry) => [entry.id, entry]));
        return roundEntries.map((freshEntry) => {
          const typedEntry = previousBySelection.get(freshEntry.id);
          if (!typedEntry) return freshEntry;
          return {
            ...freshEntry,
            scent1: typedEntry.scent1,
            scent2: typedEntry.scent2,
            scent3: typedEntry.scent3,
            scent4: typedEntry.scent4,
            fault1: typedEntry.fault1,
            fault2: typedEntry.fault2,
            time_seconds: typedEntry.time_seconds,
            numerical_score: typedEntry.numerical_score,
            manual_placement: typedEntry.manual_placement,
            pass_fail: typedEntry.pass_fail,
          };
        });
      });
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (entryId: string, field: keyof EntryScore, value: string) => {
    setEntries((prev) => {
      const index = prev.findIndex((entry) => entry.id === entryId);
      if (index < 0) return prev;
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
        const passingScore = selectedClass.class_name?.toLowerCase().includes('obedience 5')
          ? 120
          : 70;

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

      const entriesToSave = displayedEntries.filter((entry) => {
        if (entry.entry_type === 'feo' || isAbsentSelection(entry.entry_status)) return true;
        if (scoreSheetType === 'scent') {
          return Boolean(
            entry.scent1 || entry.scent2 || entry.scent3 || entry.scent4 ||
            entry.fault1 || entry.fault2 || entry.time_seconds || entry.pass_fail
          );
        }
        if (scoreSheetType === 'rally_obedience') {
          return Boolean(entry.numerical_score || entry.time_seconds || entry.pass_fail);
        }
        return Boolean(entry.pass_fail || entry.manual_placement);
      });

      if (entriesToSave.length === 0) {
        alert('Enter at least one result before saving this score sheet.');
        return;
      }

      if (scoreSheetType === 'games') {
        const placementError = validateManualPlacements(
          entriesToSave.map((entry) => ({
            id: entry.id,
            placement: entry.manual_placement,
            entryType: entry.entry_type,
            division: entry.division,
          })),
        );
        if (placementError) {
          alert(placementError);
          return;
        }
      }

      for (const entry of entriesToSave) {
        let scoreData: any = {};

        if (scoreSheetType === 'scent') {
          scoreData = {
            scent1: entry.scent1 || null,
            scent2: entry.scent2 || null,
            scent3: entry.scent3 || null,
            scent4: entry.scent4 || null,
            fault1: entry.fault1 || null,
            fault2: entry.fault2 || null,
            time_seconds: (() => {
              const raw = displayToSeconds(entry.time_seconds);
              return raw && !isNaN(parseFloat(raw)) ? parseFloat(raw) : null;
            })(),
            pass_fail: entry.pass_fail || null,
          };
        } else if (scoreSheetType === 'rally_obedience') {
          const numScore =
            entry.numerical_score && !isNaN(parseFloat(entry.numerical_score))
              ? parseFloat(entry.numerical_score)
              : null;
          scoreData = {
            numerical_score: numScore,
            time_seconds: (() => {
              const raw = displayToSeconds(entry.time_seconds);
              return raw && !isNaN(parseFloat(raw)) ? parseFloat(raw) : null;
            })(),
            pass_fail: entry.pass_fail || null,
          };
        } else if (scoreSheetType === 'games') {
          let passFail = entry.pass_fail || null;
          if (passFail === 'Pass' && selectedClass?.games_subclass) {
            passFail = selectedClass.games_subclass;
          }
          scoreData = {
            pass_fail: passFail,
            numerical_score: entry.manual_placement
              ? Number(entry.manual_placement)
              : null,
          };
        }

        // Extract base round ID for Games classes with compound IDs
        let roundIdForScore = entry.roundId;

        if (selectedClass.class_type === 'games' && roundIdForScore.includes('-')) {
          const parts = roundIdForScore.split('-');
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
      alert(
        `${entriesToSave.length} ${entriesToSave.length === 1 ? 'score' : 'scores'} saved to ` +
          `${selectedClass.class_name}, Round ${selectedClass.round_number}.`
      );

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

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {selectedClass?.class_name} — Round {selectedClass?.round_number} — Judge:{' '}
                {selectedClass?.judge_name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Both views save to this selected round. Dogs remain in the saved running order.
              </p>
            </div>
            <div
              className="inline-flex w-full rounded-lg border border-orange-300 bg-orange-50 p-1 lg:w-auto"
              role="group"
              aria-label="Score entry view"
            >
              <Button
                type="button"
                variant={entryMode === 'round' ? 'default' : 'ghost'}
                className="flex-1 lg:flex-none"
                onClick={() => setEntryMode('round')}
              >
                <Rows3 className="mr-2 h-4 w-4" />
                Round Grid
              </Button>
              <Button
                type="button"
                variant={entryMode === 'score_sheet' ? 'default' : 'ghost'}
                className="flex-1 lg:flex-none"
                onClick={() => setEntryMode('score_sheet')}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Score Sheet View
              </Button>
            </div>
          </div>

          {entryMode === 'score_sheet' && (
            <div className="mb-5 space-y-4">
              {scoreSheetType === 'scent' && (
                <div className="rounded-lg border border-orange-300 bg-orange-50 p-3">
                  <div className="mb-2 text-sm font-semibold text-gray-900">Entering from:</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={sheetLayout === 'paired' ? 'default' : 'outline'}
                      onClick={() => chooseSheetLayout('paired')}
                    >
                      2 Rounds per Sheet
                    </Button>
                    <Button
                      type="button"
                      variant={sheetLayout === 'single' ? 'default' : 'outline'}
                      onClick={() => chooseSheetLayout('single')}
                    >
                      1 Round per Sheet
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Choose the same layout that was printed. Switching layouts does not change saved scores.
                  </p>
                </div>
              )}
              <div className="border-2 border-gray-900 bg-white p-4 text-gray-950 shadow-sm print:shadow-none">
              <div className="grid gap-3 border-b-2 border-gray-900 pb-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="text-2xl font-black uppercase tracking-wide">
                    {scoreSheetType === 'scent'
                      ? 'Scent Detection Master Score Sheet'
                      : `${selectedClass?.class_name} Score Sheet`}
                  </div>
                  <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                    <div><strong>Trial:</strong> {trial?.trial_name || '—'}</div>
                    <div><strong>Date:</strong> {selectedClass?.trial_date || '—'}</div>
                    <div><strong>Class:</strong> {selectedClass?.class_name || '—'}</div>
                    <div>
                      <strong>Rounds:</strong>{' '}
                      {pairedRounds.map((round) => round.round_number).join(' and ') || '—'}
                    </div>
                    <div className="sm:col-span-2"><strong>Judge:</strong> {selectedClass?.judge_name || '—'}</div>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-gray-900 bg-white text-gray-900">
                  {new Set(entries.map((entry) => entry.cwagsNumber || entry.id)).size}{' '}
                  {new Set(entries.map((entry) => entry.cwagsNumber || entry.id)).size === 1
                    ? 'team'
                    : 'teams'}
                </Badge>
              </div>
              {scoreSheetType === 'scent' && (
                <p className="pt-3 text-xs leading-relaxed">
                  <strong>Faults:</strong> Dropped food; dog stops working; handler guiding dog;
                  incorrect find; destructive behavior; disturbing the search area; verbally naming
                  the item; continuing the search after “alert”; or crossing the line where prohibited.
                </p>
              )}
              </div>
            </div>
          )}

          {scoreSheetType === 'scent' && (
            <p className="text-sm text-black-600 mb-5 italic">
              The boxes for Scents, faults and time are provided for those who like to record
              everything — the only field we <strong>need</strong> filled in is{' '}
              <strong>Pass/Fail</strong>.
            </p>
          )}
          {scoreSheetType === 'rally_obedience' && (
            <p className="text-sm text-gray-700 mb-5">
              Placements are calculated separately for A, B, and Junior divisions. TO and FEO
              entries are excluded.{' '}
              {placementDiscipline === 'rally'
                ? 'Enter course time to resolve equal scores; the fastest time places first.'
                : 'When scores tie, run the level-specific tie-break exercise and enter 1 for the winner, 2 for the next team, and so on in Tie-break order.'}
            </p>
          )}
          {scoreSheetType === 'games' && (
            <p className="text-sm text-gray-700 mb-5">
              Games are reported as Pass/Fail. If the premium offered placements, assign the
              optional 1st–4th places using the host&apos;s published criteria.
            </p>
          )}

          <div
            className={`${
              entryMode === 'score_sheet'
                ? 'border-2 border-t-0 border-gray-900 bg-white'
                : 'border border-gray-300'
            } overflow-x-auto`}
          >
            {scoreSheetType === 'scent' && (
              <table className="w-full">
                <thead className={entryMode === 'score_sheet' ? 'bg-gray-200' : 'bg-orange-300'}>
                  <tr>
                    {entryMode === 'score_sheet' && (
                      <th className="border border-gray-900 p-2 text-sm w-20">Round</th>
                    )}
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
                  {scentSheetRows.map((sheetRow, idx) => {
                    const entry = sheetRow.entry;
                    const identityEntry = sheetRow.entry || sheetRow.identityEntry;
                    if (!entry && identityEntry) {
                      return (
                        <tr key={sheetRow.key} className="bg-gray-100 text-gray-500">
                          {entryMode === 'score_sheet' && (
                            <td className="border border-gray-900 p-2 text-center text-sm font-bold">
                              {sheetRow.roundNumber}
                            </td>
                          )}
                          <td className="border p-2 font-mono text-sm">{identityEntry.cwagsNumber}</td>
                          <td className="border p-2 text-sm">
                            <div className="font-semibold">{identityEntry.dogName}</div>
                            <div>{identityEntry.handlerName}</div>
                          </td>
                          <td className="border p-2 text-center text-sm font-semibold" colSpan={8}>
                            Not entered in Round {sheetRow.roundNumber}
                          </td>
                        </tr>
                      );
                    }
                    if (!entry) return null;
                    const isAbsent =
                      isAbsentSelection(entry.entry_status);
                    const isDisabled = entry.entry_type === 'feo' || isAbsent;
                    return (
                      <tr
                        key={entry.id}
                        className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                          entry.entry_type === 'feo' || isAbsent ? 'opacity-75' : ''
                        }`}
                      >
                        {entryMode === 'score_sheet' && (
                          <td className="border border-gray-900 p-2 text-center text-sm font-bold">
                            {entry.roundNumber}
                          </td>
                        )}
                        <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                        <td className="border p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold flex items-center gap-2">
                                {entry.dogName}
                                {entry.division && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      entry.division === 'A'
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                        : entry.division === 'B'
                                          ? 'bg-green-100 text-green-700 border border-green-300'
                                          : entry.division === 'TO'
                                            ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                            : entry.division === 'JR'
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {entry.division}
                                  </span>
                                )}
                                {entry.entry_type === 'feo' && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                    FEO
                                  </span>
                                )}
                                {isAbsent && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                    Absent
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-600">{entry.handlerName}</div>
                            </div>
                          </div>
                        </td>
                        {(['scent1', 'scent2', 'scent3', 'scent4'] as const).map((field) => (
                          <td className="border p-1 w-20" key={field}>
                            <Select
                              value={entry[field] || '-'}
                              onValueChange={(value) =>
                                updateEntry(entry.id, field, value === '-' ? '' : value)
                              }
                              disabled={isDisabled}
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
                        {(['fault1', 'fault2'] as const).map((field) => (
                          <td className="border p-1 w-40" key={field}>
                            <Input
                              value={entry[field]}
                              onChange={(e) => updateEntry(entry.id, field, e.target.value)}
                              className="w-full h-8 text-center text-sm"
                              disabled={isDisabled}
                            />
                          </td>
                        ))}
                        <td className="border p-1 w-24">
                          <Input
                            value={entry.time_seconds}
                            onChange={(e) => updateEntry(entry.id, 'time_seconds', e.target.value)}
                            type="text"
                            className="w-full h-8 text-center text-sm"
                            placeholder="m:ss.cc"
                            disabled={isDisabled}
                          />
                        </td>
                        <td className="border p-1 w-24">
                          {isAbsent ? (
                            <div className="h-8 flex items-center justify-center font-semibold text-gray-500">
                              Abs
                            </div>
                          ) : (
                            <Select
                              value={entry.pass_fail || ''}
                              onValueChange={(value) => updateEntry(entry.id, 'pass_fail', value)}
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
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {scoreSheetType === 'rally_obedience' && (
              <table className="w-full">
                <thead className={entryMode === 'score_sheet' ? 'bg-gray-200' : 'bg-orange-300'}>
                  <tr>
                    {entryMode === 'score_sheet' && (
                      <th className="border border-gray-900 p-2 text-sm w-20">Round</th>
                    )}
                    <th className="border p-2 text-sm">C-WAGS #</th>
                    <th className="border p-2 text-sm">Dog / Handler</th>
                    <th className="border p-2 text-sm w-32">Score</th>
                    <th className="border p-2 text-sm w-28">
                      {placementDiscipline === 'rally' ? 'Time' : 'Tie-break order'}
                    </th>
                    <th className="border p-2 text-sm w-24">Result</th>
                    <th className="border p-2 text-sm w-24">Placement</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((entry, idx) => {
                    const isAbsent =
                      isAbsentSelection(entry.entry_status);
                    return (
                      <tr
                        key={entry.id}
                        className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                          entry.entry_type === 'feo' || isAbsent ? 'opacity-75' : ''
                        }`}
                      >
                        {entryMode === 'score_sheet' && (
                          <td className="border border-gray-900 p-2 text-center text-sm font-bold">
                            {entry.roundNumber}
                          </td>
                        )}
                        <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                        <td className="border p-2 text-sm">
                          <div className="font-semibold flex items-center gap-2">
                            {entry.dogName}
                            {entry.division && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.division === 'A'
                                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                    : entry.division === 'B'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : entry.division === 'TO'
                                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                        : entry.division === 'JR'
                                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {entry.division}
                              </span>
                            )}
                            {entry.entry_type === 'feo' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                FEO
                              </span>
                            )}
                            {isAbsent && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                Absent
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600">{entry.handlerName}</div>
                        </td>
                        <td className="border p-1 w-32">
                          <Input
                            value={entry.numerical_score}
                            onChange={(e) => updateEntry(entry.id, 'numerical_score', e.target.value)}
                            type="number"
                            min={
                              selectedClass.class_name?.toLowerCase().includes('obedience 5')
                                ? 120
                                : 70
                            }
                            max={
                              selectedClass.class_name?.toLowerCase().includes('obedience 5')
                                ? 150
                                : 100
                            }
                            className="w-full h-8 text-center text-sm"
                            placeholder={
                              selectedClass.class_name?.toLowerCase().includes('obedience 5')
                                ? '120-150'
                                : '70-100'
                            }
                            disabled={entry.entry_type === 'feo' || isAbsent}
                          />
                        </td>
                        <td className="border p-1 w-28">
                          <Input
                            value={entry.time_seconds}
                            onChange={(e) => updateEntry(entry.id, 'time_seconds', e.target.value)}
                            type={placementDiscipline === 'rally' ? 'text' : 'number'}
                            min={placementDiscipline === 'obedience' ? 1 : undefined}
                            className="w-full h-8 text-center text-sm"
                            placeholder={placementDiscipline === 'rally' ? 'm:ss.cc' : 'Only for ties'}
                            disabled={entry.entry_type === 'feo' || isAbsent}
                          />
                        </td>
                        <td className="border p-1 w-24">
                          <div className="h-8 flex items-center justify-center font-semibold">
                            {entry.pass_fail || '-'}
                          </div>
                        </td>
                        <td className="border p-1 w-24 text-center font-semibold">
                          {placements.get(entry.id)?.tieUnresolved
                            ? 'Tie'
                            : placements.get(entry.id)?.placement
                              ? `${placements.get(entry.id)?.placement}`
                              : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {scoreSheetType === 'games' && (
              <table className="w-full">
                <thead className={entryMode === 'score_sheet' ? 'bg-gray-200' : 'bg-orange-300'}>
                  <tr>
                    {entryMode === 'score_sheet' && (
                      <th className="border border-gray-900 p-2 text-sm w-20">Round</th>
                    )}
                    <th className="border p-2 text-sm">C-WAGS #</th>
                    <th className="border p-2 text-sm">Dog / Handler</th>
                    <th className="border p-2 text-sm w-32">Result</th>
                    <th className="border p-2 text-sm w-28">Placement</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((entry, idx) => {
                    const isAbsent =
                      isAbsentSelection(entry.entry_status);
                    return (
                      <tr
                        key={entry.id}
                        className={`${idx % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'} ${
                          entry.entry_type === 'feo' || isAbsent ? 'opacity-75' : ''
                        }`}
                      >
                        {entryMode === 'score_sheet' && (
                          <td className="border border-gray-900 p-2 text-center text-sm font-bold">
                            {entry.roundNumber}
                          </td>
                        )}
                        <td className="border p-2 font-mono text-sm">{entry.cwagsNumber}</td>
                        <td className="border p-2 text-sm">
                          <div className="font-semibold flex items-center gap-2">
                            {entry.dogName}
                            {entry.division && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.division === 'A'
                                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                    : entry.division === 'B'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : entry.division === 'TO'
                                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                        : entry.division === 'JR'
                                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {entry.division}
                              </span>
                            )}
                            {entry.entry_type === 'feo' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                FEO
                              </span>
                            )}
                            {isAbsent && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                Absent
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600">{entry.handlerName}</div>
                        </td>
                        <td className="border p-1 w-32">
                          {isAbsent ? (
                            <div className="h-8 flex items-center justify-center font-semibold text-gray-500">
                              Abs
                            </div>
                          ) : (
                            <Select
                              value={entry.pass_fail || 'none'}
                              onValueChange={(value) =>
                                updateEntry(entry.id, 'pass_fail', value === 'none' ? '' : value)
                              }
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
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="border p-1 w-28">
                          <Select
                            value={entry.manual_placement || 'none'}
                            onValueChange={(value) =>
                              updateEntry(entry.id, 'manual_placement', value === 'none' ? '' : value)
                            }
                            disabled={entry.entry_type === 'feo' || entry.division === 'TO' || isAbsent}
                          >
                            <SelectTrigger className="h-8 bg-white">
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="1">1st</SelectItem>
                              <SelectItem value="2">2nd</SelectItem>
                              <SelectItem value="3">3rd</SelectItem>
                              <SelectItem value="4">4th</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Save writes every completed row to its displayed round. Blank rows are left unchanged.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {entryMode === 'score_sheet' && onAddDayOfEntry && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onAddDayOfEntry(Number(pairedRounds[0]?.round_number || 1))}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Day-of Entry
                </Button>
              )}
              <Button onClick={saveAllScores} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save Displayed Scores'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
