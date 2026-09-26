import { getClassOrder } from './cwagsClassNames';
import {
  isAbsentSelection,
  isActiveSelection,
  isScorableSelection,
} from './selectionStatus';
import {
  hasRecordedResult,
  isAbsentResult,
  isFailingResult,
  isPassingResult,
} from './resultMetrics';
import { resolveFinancialOwnerKeys } from './financialOwnerIdentity';

export interface PostTrialTrial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string | null;
  start_date: string;
  end_date: string;
}

export interface PostTrialDay {
  id: string;
  trial_date: string;
  day_number: number;
}

export interface PostTrialClass {
  id: string;
  trial_day_id: string;
  class_name: string;
  class_type: string;
  class_order: number | null;
  games_subclass?: string | null;
}

export interface PostTrialRound {
  id: string;
  trial_class_id: string;
  round_number: number;
  judge_name: string | null;
  is_reset?: boolean | null;
}

export interface PostTrialEntry {
  id: string;
  handler_name: string;
  dog_call_name: string;
  cwags_number: string | null;
  handler_email?: string | null;
  handler_phone?: string | null;
  registration_pending?: boolean | null;
  entry_status: string | null;
  amount_owed?: number | null;
  amount_paid?: number | null;
  fees_waived?: boolean | null;
}

export interface PostTrialSelection {
  id: string;
  entry_id: string;
  trial_round_id: string;
  entry_type: string | null;
  entry_status: string | null;
  division?: string | null;
  games_subclass?: string | null;
}

export interface PostTrialScore {
  id: string;
  entry_selection_id: string;
  trial_round_id: string;
  pass_fail: string | null;
  entry_status: string | null;
  numerical_score?: number | null;
  time_seconds?: number | null;
  scent1?: string | null;
  scent2?: string | null;
  scent3?: string | null;
  scent4?: string | null;
  fault1?: string | null;
  fault2?: string | null;
}

export interface PostTrialSource {
  trial: PostTrialTrial;
  days: PostTrialDay[];
  classes: PostTrialClass[];
  rounds: PostTrialRound[];
  entries: PostTrialEntry[];
  selections: PostTrialSelection[];
  scores: PostTrialScore[];
  cwagsFeePerRun?: number | null;
}

export interface ClassResultRow {
  selectionId: string;
  runningNumber: number;
  handlerName: string;
  dogName: string;
  cwagsNumber: string;
  entryType: 'REGULAR' | 'FEO';
  division: string | null;
  result: string;
  numericalScore: number | null;
  timeSeconds: number | null;
}

export interface ClassResultsReport {
  key: string;
  trialDate: string;
  dayNumber: number;
  className: string;
  classType: string;
  classOrder: number;
  roundNumber: number;
  judgeName: string;
  rows: ClassResultRow[];
  totals: {
    selections: number;
    regularRuns: number;
    feoRuns: number;
    passes: number;
    fails: number;
    absences: number;
    missingResults: number;
  };
}

export interface PostTrialReadinessIssues {
  awaitingAcceptance: number;
  pendingRegistration: number;
  placeholderJudges: number;
  missingScores: number;
  outstandingBalances: number;
}

export interface PostTrialPackageModel {
  trial: PostTrialTrial;
  ready: boolean;
  issues: PostTrialReadinessIssues;
  classResults: ClassResultsReport[];
  recap: {
    acceptedEntries: number;
    regularSelections: number;
    feoSelections: number;
    scoredRegularRuns: number;
    passes: number;
    fails: number;
    absences: number;
    cwagsFeePerRun: number;
    cwagsAmountDue: number;
  };
  judges: Array<{
    name: string;
    assignedRounds: number;
    assignments: Array<{
      trialDate: string;
      className: string;
      roundNumber: number;
    }>;
  }>;
}

const inactiveEntryStatuses = new Set(['withdrawn', 'waitlisted']);

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const isPlaceholderJudge = (name: unknown): boolean => {
  const normalized = String(name ?? '').trim().toUpperCase();
  return !normalized || ['TBA', 'TBD', 'NO JUDGE ASSIGNED'].includes(normalized);
};

const displayResult = (
  selection: PostTrialSelection,
  score: PostTrialScore | undefined
): string => {
  if (isAbsentSelection(selection.entry_status) || isAbsentResult(score)) return 'ABS';
  if (!score || !hasRecordedResult(score)) return '';
  const result = String(score.pass_fail ?? '').trim();
  if (['GB', 'BJ', 'T', 'P', 'C'].includes(result.toUpperCase())) return result.toUpperCase();
  if (isPassingResult(score)) return score.numerical_score != null ? String(score.numerical_score) : 'P';
  if (isFailingResult(score)) return result.toUpperCase() === 'FAIL' ? 'F' : result.toUpperCase();
  return result.toUpperCase();
};

export function buildPostTrialPackageModel(source: PostTrialSource): PostTrialPackageModel {
  const daysById = new Map(source.days.map((day) => [day.id, day]));
  const classesById = new Map(source.classes.map((trialClass) => [trialClass.id, trialClass]));
  const roundsById = new Map(source.rounds.map((round) => [round.id, round]));
  const entriesById = new Map(source.entries.map((entry) => [entry.id, entry]));
  const scoresBySelection = new Map<string, PostTrialScore>();
  source.scores.forEach((score) => scoresBySelection.set(score.entry_selection_id, score));

  const activeEntries = source.entries.filter(
    (entry) => !inactiveEntryStatuses.has(normalize(entry.entry_status))
  );
  const acceptedEntries = activeEntries.filter((entry) => normalize(entry.entry_status) !== 'submitted');
  const activeEntryIds = new Set(acceptedEntries.map((entry) => entry.id));
  const reportableSelections = source.selections.filter(
    (selection) => activeEntryIds.has(selection.entry_id) && isActiveSelection(selection.entry_status)
  );

  const rowsByRound = new Map<string, ClassResultRow[]>();
  reportableSelections.forEach((selection) => {
    const entry = entriesById.get(selection.entry_id);
    if (!entry || !roundsById.has(selection.trial_round_id)) return;
    const rows = rowsByRound.get(selection.trial_round_id) || [];
    const score = scoresBySelection.get(selection.id);
    rows.push({
      selectionId: selection.id,
      runningNumber: rows.length + 1,
      handlerName: entry.handler_name,
      dogName: entry.dog_call_name,
      cwagsNumber: entry.cwags_number || 'PENDING',
      entryType: normalize(selection.entry_type) === 'feo' ? 'FEO' : 'REGULAR',
      division: selection.division || null,
      result: displayResult(selection, score),
      numericalScore: score?.numerical_score ?? null,
      timeSeconds: score?.time_seconds ?? null,
    });
    rowsByRound.set(selection.trial_round_id, rows);
  });

  const classResults = source.rounds
    .filter((round) => !round.is_reset)
    .map<ClassResultsReport>((round) => {
      const trialClass = classesById.get(round.trial_class_id);
      const day = trialClass ? daysById.get(trialClass.trial_day_id) : undefined;
      const rows = rowsByRound.get(round.id) || [];
      const regularRows = rows.filter((row) => row.entryType === 'REGULAR');
      const selectionsForRound = reportableSelections.filter(
        (selection) => selection.trial_round_id === round.id
      );
      const missingResults = selectionsForRound.filter((selection) => {
        if (!isScorableSelection(selection.entry_status)) return false;
        return !hasRecordedResult(scoresBySelection.get(selection.id));
      }).length;
      return {
        key: `${day?.trial_date || ''}:${trialClass?.class_name || ''}:${round.round_number}`,
        trialDate: day?.trial_date || '',
        dayNumber: day?.day_number || 0,
        className: trialClass?.class_name || 'Unknown class',
        classType: trialClass?.class_type || 'unknown',
        classOrder: trialClass?.class_order ?? getClassOrder(trialClass?.class_name || ''),
        roundNumber: round.round_number,
        judgeName: String(round.judge_name || '').trim(),
        rows,
        totals: {
          selections: rows.length,
          regularRuns: regularRows.filter((row) => row.result !== 'ABS').length,
          feoRuns: rows.filter((row) => row.entryType === 'FEO' && row.result !== 'ABS').length,
          passes: regularRows.filter((row) => {
            const score = scoresBySelection.get(row.selectionId);
            return isPassingResult(score);
          }).length,
          fails: regularRows.filter((row) => {
            const score = scoresBySelection.get(row.selectionId);
            return isFailingResult(score);
          }).length,
          absences: rows.filter((row) => row.result === 'ABS').length,
          missingResults,
        },
      };
    })
    .filter((report) => report.rows.length > 0)
    .sort(
      (a, b) =>
        a.trialDate.localeCompare(b.trialDate) ||
        a.classOrder - b.classOrder ||
        a.roundNumber - b.roundNumber
    );

  const financialOwnerKeys = resolveFinancialOwnerKeys(acceptedEntries);
  const handlerBalances = new Map<string, { owed: number; paid: number }>();
  acceptedEntries.forEach((entry) => {
    const ownerKey = financialOwnerKeys.get(entry.id) || entry.id;
    const balance = handlerBalances.get(ownerKey) || { owed: 0, paid: 0 };
    if (!entry.fees_waived) balance.owed += Number(entry.amount_owed || 0);
    balance.paid += Number(entry.amount_paid || 0);
    handlerBalances.set(ownerKey, balance);
  });

  const issues: PostTrialReadinessIssues = {
    awaitingAcceptance: activeEntries.filter((entry) => normalize(entry.entry_status) === 'submitted').length,
    pendingRegistration: acceptedEntries.filter(
      (entry) => entry.registration_pending || !String(entry.cwags_number || '').trim()
    ).length,
    placeholderJudges: source.rounds.filter(
      (round) => !round.is_reset && isPlaceholderJudge(round.judge_name)
    ).length,
    missingScores: classResults.reduce((sum, report) => sum + report.totals.missingResults, 0),
    outstandingBalances: [...handlerBalances.values()].filter(
      (balance) => balance.owed - balance.paid > 0.005
    ).length,
  };

  const judges = new Map<
    string,
    Array<{ trialDate: string; className: string; roundNumber: number }>
  >();
  source.rounds.forEach((round) => {
    if (round.is_reset || isPlaceholderJudge(round.judge_name)) return;
    const name = String(round.judge_name).trim();
    const trialClass = classesById.get(round.trial_class_id);
    const day = trialClass ? daysById.get(trialClass.trial_day_id) : undefined;
    const assignments = judges.get(name) || [];
    assignments.push({
      trialDate: day?.trial_date || '',
      className: trialClass?.class_name || 'Unknown class',
      roundNumber: round.round_number,
    });
    judges.set(name, assignments);
  });

  const regularSelections = reportableSelections.filter(
    (selection) => normalize(selection.entry_type) !== 'feo'
  );
  const feoSelections = reportableSelections.filter(
    (selection) => normalize(selection.entry_type) === 'feo'
  );
  const scoredRegularRuns = regularSelections.filter((selection) => {
    const score = scoresBySelection.get(selection.id);
    return hasRecordedResult(score) && !isAbsentResult(score);
  });
  const cwagsFeePerRun = Number(source.cwagsFeePerRun || 0);

  return {
    trial: source.trial,
    ready: Object.values(issues).every((count) => count === 0),
    issues,
    classResults,
    recap: {
      acceptedEntries: acceptedEntries.length,
      regularSelections: regularSelections.length,
      feoSelections: feoSelections.length,
      scoredRegularRuns: scoredRegularRuns.length,
      passes: scoredRegularRuns.filter((selection) =>
        isPassingResult(scoresBySelection.get(selection.id))
      ).length,
      fails: scoredRegularRuns.filter((selection) =>
        isFailingResult(scoresBySelection.get(selection.id))
      ).length,
      absences: regularSelections.filter((selection) =>
        isAbsentResult(scoresBySelection.get(selection.id)) || isAbsentSelection(selection.entry_status)
      ).length,
      cwagsFeePerRun,
      cwagsAmountDue: Number((regularSelections.length * cwagsFeePerRun).toFixed(2)),
    },
    judges: [...judges.entries()]
      .map(([name, assignments]) => ({
        name,
        assignedRounds: assignments.length,
        assignments: assignments.sort(
          (a, b) =>
            a.trialDate.localeCompare(b.trialDate) ||
            getClassOrder(a.className) - getClassOrder(b.className) ||
            a.roundNumber - b.roundNumber
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
