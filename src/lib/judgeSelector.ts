import type { Judge } from '@/types/judge';

export type JudgeAssignmentStatus = 'valid' | 'inactive' | 'not_certified' | 'missing';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export function getJudgeCertifications(judge: Judge): string[] {
  return [
    ...(judge.obedience_levels || []),
    ...(judge.rally_levels || []),
    ...(judge.games_levels || []),
    ...(judge.scent_levels || []),
  ];
}

export function getMatchingCertification(judge: Judge, className: string): string | undefined {
  const target = normalize(className);
  return getJudgeCertifications(judge).find((certification) => normalize(certification) === target);
}

export function isJudgeCertifiedForClass(judge: Judge, className: string): boolean {
  return Boolean(getMatchingCertification(judge, className));
}

function nameParts(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts.slice(0, -1).join(' '), last: parts.at(-1) || '' };
}

export function sortJudgesAlphabetically(judges: Judge[]): Judge[] {
  return [...judges].sort((a, b) => {
    const aName = nameParts(a.name);
    const bName = nameParts(b.name);
    return (
      aName.last.localeCompare(bName.last, undefined, { sensitivity: 'base' }) ||
      aName.first.localeCompare(bName.first, undefined, { sensitivity: 'base' })
    );
  });
}

export function getQualifiedJudges(judges: Judge[], className: string): Judge[] {
  return sortJudgesAlphabetically(
    judges.filter((judge) => judge.is_active && isJudgeCertifiedForClass(judge, className))
  );
}

export function getJudgeAssignmentStatus(
  judge: Judge | undefined,
  className: string
): JudgeAssignmentStatus {
  if (!judge) return 'missing';
  if (!judge.is_active) return 'inactive';
  if (!isJudgeCertifiedForClass(judge, className)) return 'not_certified';
  return 'valid';
}

export function searchJudges(judges: Judge[], searchTerm: string, className: string): Judge[] {
  const term = normalize(searchTerm);
  if (!term) return judges;

  return judges.filter((judge) =>
    [
      judge.name,
      judge.city || '',
      judge.province_state || '',
      getMatchingCertification(judge, className) || '',
    ].some((value) => normalize(value).includes(term))
  );
}

export function nextComboboxIndex(
  key: 'ArrowDown' | 'ArrowUp',
  currentIndex: number,
  resultCount: number
): number {
  if (resultCount === 0) return -1;
  if (key === 'ArrowDown') return currentIndex >= resultCount - 1 ? 0 : currentIndex + 1;
  return currentIndex <= 0 ? resultCount - 1 : currentIndex - 1;
}
