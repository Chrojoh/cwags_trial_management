export interface SequencedTrialRound {
  round_number: number;
  is_reset?: boolean | null;
}

export interface RoundSequenceValidation {
  valid: boolean;
  message?: string;
}

const sameNumber = (left: number, right: number) => Math.abs(left - right) < 0.0001;

export function validateTrialRoundSequence(
  rounds: SequencedTrialRound[]
): RoundSequenceValidation {
  const ordinary = rounds
    .filter((round) => !round.is_reset)
    .map((round) => Number(round.round_number))
    .sort((left, right) => left - right);

  if (ordinary.length === 0 && rounds.length > 0) {
    return { valid: false, message: 'A reset round cannot exist without an ordinary round.' };
  }

  for (let index = 0; index < ordinary.length; index += 1) {
    const expected = index + 1;
    if (!sameNumber(ordinary[index], expected)) {
      return {
        valid: false,
        message: `Ordinary rounds must begin at Round 1 and continue without gaps. Expected Round ${expected}, but found Round ${ordinary[index]}.`,
      };
    }
  }

  const ordinarySet = new Set(ordinary.map(String));
  const resetNumbers = new Set<string>();
  for (const round of rounds.filter((item) => item.is_reset)) {
    const number = Number(round.round_number);
    const parent = Math.floor(number);
    if (!sameNumber(number, parent + 0.5) || !ordinarySet.has(String(parent))) {
      return {
        valid: false,
        message: `Reset Round ${number} must be numbered one-half after an existing ordinary round.`,
      };
    }
    if (resetNumbers.has(String(number))) {
      return { valid: false, message: `Reset Round ${number} appears more than once.` };
    }
    resetNumbers.add(String(number));
  }

  return { valid: true };
}

export function renumberTrialRounds<T extends SequencedTrialRound>(rounds: T[]): T[] {
  const oldToNew = new Map<number, number>();
  let next = 0;
  const ordinaryRenumbered = rounds.map((round) => {
    if (round.is_reset) return { ...round };
    next += 1;
    oldToNew.set(Math.floor(Number(round.round_number)), next);
    return { ...round, round_number: next };
  });

  return ordinaryRenumbered.map((round) => {
    if (!round.is_reset) return round;
    const parent = oldToNew.get(Math.floor(Number(round.round_number)));
    return parent === undefined ? round : { ...round, round_number: parent + 0.5 };
  });
}
