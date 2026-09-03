export interface ScentRound {
  id: string;
  class_id?: string;
  class_name: string;
  class_type: string;
  judge_name: string;
  trial_day_id: string;
  round_number?: number;
}

export interface ScentLine {
  entryId: string;
  selectionId: string;
  roundId: string;
  handler: string;
  dog: string;
  registration: string;
}

export interface ScentPage {
  className: string;
  judge: string;
  rounds: ScentRound[];
  dogs: Array<{ identity: string; lines: Array<ScentLine | undefined> }>;
  capacity: number;
  page: number;
  pageCount: number;
}

export const SCENT_BLUE = 'D9E8F7';
export const SCENT_ROW_HEIGHT = 50; // Previous 40 pt score rows + 25%.
export const SCENT_FAULTS = 'Faults: Dropped food. Dog stops working. Handler guiding dog. Incorrect find. Destructive behavior. Disturbing search area by dog or handler. Verbally naming item. Continue search after "alert". SR crossing line less than half.';

// Fixed Letter-page budget at the existing 50% print scale. Two-round pages
// allow eight complete dog blocks; single-round pages allow twenty dogs.
export function buildScentPages(rounds: ScentRound[], lines: ScentLine[]): ScentPage[] {
  const groups = new Map<string, ScentRound[]>();
  for (const round of rounds.filter((item) => item.class_type === 'scent')) {
    const key = JSON.stringify([round.trial_day_id, round.class_id || round.class_name, round.judge_name]);
    groups.set(key, [...(groups.get(key) || []), round]);
  }
  const pages: ScentPage[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => (a.round_number || 1) - (b.round_number || 1));
    for (let offset = 0; offset < ordered.length; offset += 2) {
      const pair = ordered.slice(offset, offset + 2);
      const dogs = new Map<string, ScentPage['dogs'][number]>();
      const seen = new Set<string>();
      for (const line of lines) {
        const index = pair.findIndex((round) => round.id === line.roundId);
        if (index < 0 || seen.has(line.selectionId)) continue;
        seen.add(line.selectionId);
        // Registration is the dog identity even if separate entry forms were
        // used for different rounds. Missing numbers fall back to entry ID.
        const identity = line.registration.trim() || line.entryId;
        const dog = dogs.get(identity) || { identity, lines: Array(pair.length).fill(undefined) };
        if (dog.lines[index]) throw new Error(`Duplicate dog entry for ${line.registration || line.dog}, round ${pair[index].round_number}.`);
        dog.lines[index] = line;
        dogs.set(identity, dog);
      }
      const sorted = [...dogs.values()].sort((a, b) => {
        const first = a.lines.find(Boolean)!;
        const second = b.lines.find(Boolean)!;
        return first.handler.localeCompare(second.handler) || first.dog.localeCompare(second.dog) || a.identity.localeCompare(b.identity);
      });
      const capacity = pair.length === 2 ? 8 : 20;
      const pageCount = Math.max(1, Math.ceil(sorted.length / capacity));
      for (let page = 0; page < pageCount; page++) pages.push({
        className: pair[0].class_name, judge: pair[0].judge_name,
        rounds: pair, dogs: sorted.slice(page * capacity, (page + 1) * capacity),
        capacity, page: page + 1, pageCount,
      });
    }
  }
  return pages;
}
