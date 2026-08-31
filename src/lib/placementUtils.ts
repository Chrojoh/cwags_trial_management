export interface PlacementCandidate {
  id: string;
  division?: string | null;
  entryType: string;
  entryStatus: string;
  passFail: string;
  numericalScore: string | number | null;
  tieBreakValue: string | number | null;
}

export interface PlacementResult {
  placement: number | null;
  tieUnresolved: boolean;
}

const eligibleDivision = (division?: string | null) =>
  division === 'A' || division === 'B' || division === 'JR';

const numeric = (value: string | number | null): number | null => {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function calculatePlacements(
  candidates: PlacementCandidate[],
): Map<string, PlacementResult> {
  const results = new Map<string, PlacementResult>();
  candidates.forEach((candidate) =>
    results.set(candidate.id, { placement: null, tieUnresolved: false }),
  );

  for (const division of ['A', 'B', 'JR']) {
    const ranked = candidates
      .filter((candidate) => {
        const score = numeric(candidate.numericalScore);
        const status = candidate.entryStatus.toLowerCase();
        const excludedStatus = ['absent', 'no_show', 'withdrawn', 'scratched'].includes(status);
        const result = candidate.passFail.toLowerCase();
        const resultEligible = division === 'JR' || result === 'pass';
        return (
          candidate.division === division &&
          eligibleDivision(candidate.division) &&
          candidate.entryType !== 'feo' &&
          !excludedStatus &&
          score !== null &&
          resultEligible
        );
      })
      .sort((left, right) => {
        const scoreDifference = numeric(right.numericalScore)! - numeric(left.numericalScore)!;
        if (scoreDifference) return scoreDifference;
        const leftTieBreak = numeric(left.tieBreakValue);
        const rightTieBreak = numeric(right.tieBreakValue);
        if (leftTieBreak === null && rightTieBreak === null) return 0;
        if (leftTieBreak === null) return 1;
        if (rightTieBreak === null) return -1;
        return leftTieBreak - rightTieBreak;
      });

    for (let index = 0; index < ranked.length && index < 4; ) {
      const score = numeric(ranked[index].numericalScore);
      let groupEnd = index + 1;
      while (
        groupEnd < ranked.length &&
        numeric(ranked[groupEnd].numericalScore) === score
      ) {
        groupEnd += 1;
      }

      const tiedGroup = ranked.slice(index, groupEnd);
      const tieBreakValues = tiedGroup.map((candidate) => numeric(candidate.tieBreakValue));
      const tieResolved =
        tiedGroup.length === 1 ||
        (tieBreakValues.every((value) => value !== null) &&
          new Set(tieBreakValues).size === tieBreakValues.length);

      tiedGroup.forEach((candidate, offset) => {
        if (tieResolved && index + offset >= 4) return;
        results.set(candidate.id, {
          placement: tieResolved ? index + offset + 1 : null,
          tieUnresolved: !tieResolved,
        });
      });
      index = groupEnd;
    }
  }

  return results;
}

export function validateManualPlacements(
  candidates: Array<{ id: string; placement: string; entryType: string; division?: string | null }>,
): string | null {
  const used = new Set<number>();
  for (const candidate of candidates) {
    if (!candidate.placement) continue;
    const placement = Number(candidate.placement);
    if (!Number.isInteger(placement) || placement < 1 || placement > 4) {
      return 'Games placements must be between 1 and 4.';
    }
    if (candidate.entryType === 'feo' || candidate.division === 'TO') {
      return 'FEO and TO entries cannot receive placements.';
    }
    if (used.has(placement)) {
      return `Games placement ${placement} has been assigned more than once.`;
    }
    used.add(placement);
  }
  return null;
}
