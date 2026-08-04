import { isActiveSelection, type SelectionStatus } from './selectionStatus';

export interface ResultLike {
  pass_fail?: string | null;
  numerical_score?: number | null;
  entry_status?: string | null;
}

const PASS_RESULTS = new Set(['pass', 'gb', 'bj', 't', 'p', 'c']);
const FAIL_RESULTS = new Set(['fail', 'nq', 'f']);

export const normalizeResult = (result: unknown) => String(result ?? '').trim().toLowerCase();

export const isAbsentResult = (score: ResultLike | null | undefined): boolean => {
  const result = normalizeResult(score?.pass_fail);
  const status = normalizeResult(score?.entry_status);
  return result === 'abs' || status === 'abs' || status === 'absent' || status === 'no_show';
};

export const hasRecordedResult = (score: ResultLike | null | undefined): boolean =>
  Boolean(normalizeResult(score?.pass_fail)) || score?.numerical_score != null;

export const isPassingResult = (score: ResultLike | null | undefined): boolean =>
  PASS_RESULTS.has(normalizeResult(score?.pass_fail));

export const isFailingResult = (score: ResultLike | null | undefined): boolean =>
  FAIL_RESULTS.has(normalizeResult(score?.pass_fail));

export const isCompletedRegularResult = (
  selectionStatus: SelectionStatus,
  entryType: string | null | undefined,
  score: ResultLike | null | undefined
): boolean =>
  isActiveSelection(selectionStatus) &&
  normalizeResult(entryType) === 'regular' &&
  hasRecordedResult(score) &&
  !isAbsentResult(score);

export const calculatePassRate = (passes: number, fails: number): number => {
  const qualifyingAttempts = passes + fails;
  return qualifyingAttempts > 0 ? (passes / qualifyingAttempts) * 100 : 0;
};
