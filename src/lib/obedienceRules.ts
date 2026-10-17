export const OBEDIENCE_RULESET_ID = 'cwags-obedience-2020-09-01' as const;
export const OBEDIENCE_RULEBOOK_URL =
  'https://c-wags.org/wp-content/uploads/2020/07/2020_Obedience_Final_7-1-2020.pdf';
export const OBEDIENCE_VERIFIED_ON = '2026-10-16';

export const OBEDIENCE_GENERAL_NON_QUALIFYING = [
  'Anticipation, except during finish, heeling, or Figure 8',
  'Continuous barking',
  'Food out of the handler\'s pocket at the wrong time',
  'Handler constantly adapts pace to the dog',
  'No change of pace by both dog and handler',
  'Constant tight leash',
] as const;

export type ObedienceLevel = 1 | 2 | 3 | 4 | 5;
export type ObediencePlanStatus = 'draft' | 'submitted' | 'finalized';

export interface ObedienceExerciseDefinition {
  id: string;
  name: string;
  maximumPoints: number | null;
  passFail?: boolean;
  sourcePages: number[];
  requiredParts?: string[];
  fixedPosition?: 'first' | 'last-off-leash' | 'last';
  linkedTo?: string;
  allowsPerformanceSegments?: boolean;
  maximumPerformanceSegments?: number;
  description: string;
  deductions: {
    nonQualifying?: string[];
    major?: string[];
    minor?: string[];
    slight?: string[];
  };
}

export interface ObedienceLevelRules {
  level: ObedienceLevel;
  maximumPoints: number;
  qualifyingPoints: number;
  minimumExercisePercent: number;
  exercises: ObedienceExerciseDefinition[];
  sourcePages: number[];
  tieBreaker: string;
  notes: string[];
}

export interface ObedienceClassPlanItem {
  exerciseId: string;
  performanceOrder: number;
  segment?: number;
  combinedWithPrevious?: boolean;
  exerciseFinished?: boolean;
}

export type Level3HeelingRequiredElement = 'circle' | 'figure-8' | '270-turn';

export interface ObedienceClassPlan {
  rulesetId: typeof OBEDIENCE_RULESET_ID;
  trialRoundId: string;
  level: ObedienceLevel;
  judgeName: string;
  status: ObediencePlanStatus;
  revision: number;
  items: ObedienceClassPlanItem[];
  judgeOptions: Record<string, string>;
}

const exercise = (
  id: string,
  name: string,
  maximumPoints: number | null,
  sourcePages: number[],
  description: string,
  deductions: ObedienceExerciseDefinition['deductions'],
  extra: Partial<ObedienceExerciseDefinition> = {},
): ObedienceExerciseDefinition => ({ id, name, maximumPoints, sourcePages, description, deductions, ...extra });

export const OBEDIENCE_RULES: Record<ObedienceLevel, ObedienceLevelRules> = {
  1: {
    level: 1, maximumPoints: 100, qualifyingPoints: 70, minimumExercisePercent: 50,
    sourcePages: [9, 10], tieBreaker: 'Find Front - Forward ending in a halt/sit.',
    notes: ['Greeting is always last.', 'The first five exercises may be arranged by the judge.', 'Heeling may be split into two performance segments without duplicating its 40 points.'],
    exercises: [
      exercise('l1-heeling', 'Heeling', 40, [9], 'One 40-point on-leash Heeling exercise. The judge may perform it in one continuous section or divide it between two course locations; both sections are judged together as one score.', { major: ['Wrong turn (5 points)'], minor: ['Extra cue (3 points)', 'No sit at halt (3 points)'] }, { allowsPerformanceSegments: true, maximumPerformanceSegments: 2 }),
      exercise('l1-find-front-forward', 'Find Front - Forward', 20, [9, 10], 'From a sit, leave approximately 4 feet; dog finds front, then heels forward approximately 8 feet to a halt.', { major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit or sits on forward (3 points)'] }),
      exercise('l1-walk-around', 'Sit or Down Walk-Around', 10, [10], 'After approximately 8 feet of heeling, leave the dog sitting or down and walk around the dog.', { nonQualifying: ['Changes position', 'Turns 90° or more during walk-around'], minor: ['Extra cue (3 points)'] }),
      exercise('l1-position-change', 'Position Change', 10, [10], 'Beginning in a sit, signal the dog down and back to a sit.', { minor: ['Extra cue (3 points)'] }),
      exercise('l1-call-to-heel', 'Call to Heel', 10, [10], 'Beginning in a sit with handler approximately 4 feet away: leave dog, call dog to heel.', { major: ['Failure to heel (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l1-greeting', 'Greeting', 10, [10], 'After approximately 8 feet of heeling, leave the dog sitting or down for the greeting.', { nonQualifying: ['Changes position'], minor: ['Extra cue (3 points)'] }, { fixedPosition: 'last' }),
    ],
  },
  2: {
    level: 2, maximumPoints: 100, qualifyingPoints: 70, minimumExercisePercent: 50,
    sourcePages: [11, 12, 13, 14], tieBreaker: 'Figure 8.',
    notes: ['On-leash Heeling and Figure 8 are first.', 'Call to Heel leads directly into Position Change.', 'Leave Dog for Leash is the last off-leash exercise.', 'Honor is pass/fail and must be passed to qualify.'],
    exercises: [
      exercise('l2-on-leash-heeling', 'On-Leash Heeling', 25, [11, 12], 'On-leash heeling is the first part of the opening heeling block.', { major: ['Wrong turn (5 points)'], minor: ['Extra cue (3 points)', 'No sit at halt (3 points)'] }, { fixedPosition: 'first', linkedTo: 'l2-figure-8' }),
      exercise('l2-figure-8', 'On-Leash Figure 8', 15, [11, 12], 'On-leash Figure 8 immediately follows heeling and is the tie-breaker.', { minor: ['Extra cue (3 points)', 'No sit (3 points)'] }, { fixedPosition: 'first', linkedTo: 'l2-on-leash-heeling' }),
      exercise('l2-recall-over-jump', 'Recall Over Jump', 15, [11, 12], 'From at least 8 feet: leave dog, recall over jump, front, and finish.', { nonQualifying: ['Fails to come on first cue', 'Fails to jump'], major: ['Failure to front (5 points)'], minor: ['Extra cue for front or finish (3 points)', 'No sit (3 points)', 'No finish (3 points)'] }),
      exercise('l2-call-to-heel', 'Call to Heel', 10, [11, 12], 'Handler approximately 8 feet away: leave dog and call to heel; flows directly into Position Change.', { major: ['Failure to heel (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }, { linkedTo: 'l2-position-change' }),
      exercise('l2-position-change', 'Position Change', 10, [11, 12], 'Handler approximately 4 feet away: stand, leave with ready, then stand-down-sit-return.', { nonQualifying: ['Turns more than 90°'], minor: ['Extra cue (3 points)'] }, { linkedTo: 'l2-call-to-heel' }),
      exercise('l2-handler-exam', 'Stand Stay Handler Exam', 15, [11, 13], 'Heel approximately 8 feet, stand, leave approximately 8 feet; judge uses two-hand pet and examines paw and teeth.', { nonQualifying: ['Changes position', 'Moves away during exam'], major: ['Sits on stand cue'], minor: ['Extra cue (3 points)'] }),
      exercise('l2-leave-for-leash', 'Leave Dog for Leash', 10, [11, 13], 'After approximately 8 feet of heeling, leave dog sitting or down while handler retrieves leash.', { nonQualifying: ['Changes position', 'Turns more than 90°'] }, { fixedPosition: 'last-off-leash' }),
      exercise('l2-honor', 'Honor', null, [11, 13, 14], 'Dog honors another working team in the required sit or down position.', { nonQualifying: ['Changes position', 'Turns more than 90°'] }, { passFail: true, fixedPosition: 'last' }),
    ],
  },
  3: {
    level: 3, maximumPoints: 100, qualifyingPoints: 70, minimumExercisePercent: 50,
    sourcePages: [14, 15, 16, 17], tieBreaker: 'Go Out - Sit; closest to the center of the target area.',
    notes: ['The judge selects the exercise order.', 'Heeling may be split into two segments; its points remain one scoring category.', 'At least one Heeling section must include a circle, Figure 8, or 270-degree turn.'],
    exercises: [
      exercise('l3-heeling', 'Heeling', 25, [14, 15], 'One 25-point off-leash Heeling exercise. The judge may perform it in one continuous section or divide it between two course locations; both sections are judged together as one score.', { major: ['Wrong turn (5 points)'], minor: ['Extra cue (3 points)', 'No sit at halt (3 points)'] }, { allowsPerformanceSegments: true, maximumPerformanceSegments: 2 }),
      exercise('l3-drop-on-recall', 'Drop on Recall', 10, [14, 15], 'Leave dog, recall, down on cue, recall to front; no finish.', { nonQualifying: ['Fails come-down-come on first cue'], major: ['Failure to front (5 points)'], minor: ['Extra cue for front (3 points)', 'No sit (3 points)'] }),
      exercise('l3-directed-jump', 'Directed Jump', 15, [14, 15], 'From at least 15 feet and 6 feet from jump: leave dog, direct over designated jump, front, and finish.', { nonQualifying: ['Jump not taken'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l3-go-out-sit', 'Go Out - Sit', 15, [14, 15], 'Send dog approximately 20 feet to the target area, sit, then handler returns.', { major: ['Outside target box', 'Within 2 feet of handler'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l3-find-front', 'Find Front', 10, [14, 16], 'From stand or sit with handler approximately 6 feet away: find front, no finish, then heel approximately 8 feet.', { nonQualifying: ['Fails to come on first cue', 'No front', 'Turns 90° or more'], minor: ['Extra cue for front (3 points)', 'No sit (3 points)'] }),
      exercise('l3-retrieve-broad-jump', 'Retrieve Over Broad Jump', 15, [14, 16], 'Leave dog; retrieve over broad jump, return within reach to front, and finish.', { nonQualifying: ['Fails to jump', 'Fails to retrieve within reach'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l3-signals', 'Signal Exercise', 10, [14, 16], 'Handler approximately 8 feet away: signal down, sit, and come to front; no finish.', { nonQualifying: ['Fails down-sit-come on first cue'], major: ['Failure to front (5 points)'], minor: ['Extra cue for stand/stay/front (3 points)', 'No sit (3 points)'] }),
    ],
  },
  4: {
    level: 4, maximumPoints: 100, qualifyingPoints: 70, minimumExercisePercent: 50,
    sourcePages: [17, 18, 19, 20], tieBreaker: 'Go Out - Sit portion; closest to the center of the target area.',
    notes: ['The judge selects the exercise order.', 'Heeling occurs within Signal, Moving Down, and Moving Stand and is scored within those exercises.', 'Glove number is entrant-specific and must not be forced class-wide.'],
    exercises: [
      exercise('l4-signals', 'Signal Exercise', 15, [17, 18], 'From 15–20 feet: heel, stand-stay, signal down-sit-come to front; no finish.', { nonQualifying: ['Fails down-sit-come on first cue', 'Verbal cues after judge says stand'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'], slight: ['Moves one step during stand/down/sit'] }),
      exercise('l4-moving-down', 'Moving Down - Call to Heel', 10, [17, 18], 'While moving: forward, down dog; handler takes six steps, calls dog to heel, then continues forward.', { nonQualifying: ['Fails to down on first cue'], minor: ['Extra come cue'] }),
      exercise('l4-moving-stand', 'Moving Stand for Exam', 15, [17, 18], 'While moving: stand dog, handler goes approximately 10 feet, judge examines, then dog is called to heel.', { nonQualifying: ['Sits, downs, or moves away during exam'], major: ['Fails to come to heel (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l4-double-recall', 'Double Recall', 15, [17, 18, 19], 'Two-part recall: front and finish in part 1; front with no finish in part 2; no exercise finishes between parts.', { nonQualifying: ['Fails come-down-come on first cue'], major: ['Failure to front (5 points)', 'Position change'], minor: ['Extra cue for front/sit (3 points)', 'No sit (3 points)', 'Failure to finish (3 points)'] }),
      exercise('l4-directed-glove', 'Directed Glove Retrieve', 15, [17, 19], 'Pivot to the assigned glove, retrieve it within reach, front; no finish.', { nonQualifying: ['Fails to retrieve within reach'], minor: ['Extra cue (3 points)', 'No sit (3 points)', 'Non-pivot'] }),
      exercise('l4-go-out-jump-tunnel', 'Go Out - Directed Jump / Tunnel', 30, [17, 19, 20], 'Go out at least 20 feet past jump, sit near center, then perform directed jump and tunnel; finish only after jump.', { nonQualifying: ['Wrong jump/tunnel', 'No jump or tunnel', 'Go-out not at least 10 feet past obstacle'], major: ['No sit on go-out', 'Takes jump/tunnel on way out'], minor: ['Extra cue (3 points)', 'No sit (3 points)', 'Sits more than 4 feet from center'] }),
    ],
  },
  5: {
    level: 5, maximumPoints: 150, qualifyingPoints: 120, minimumExercisePercent: 50,
    sourcePages: [20, 21, 22, 23], tieBreaker: 'Use the applicable Level 3/4 procedure for the selected tie exercise; unresolved ties require judge review.',
    notes: ['Level 5 combines Level 3 and Level 4 exercises with the stated modifications.', 'Figure 8 is required within a heeling segment.', 'Heeling may be split into multiple performance segments without duplicating its 25 points.', 'The Scent Articles send method is the handler choice.'],
    exercises: [
      exercise('l5-heeling-figure-8', 'Heeling with Figure 8', 25, [20, 21], 'One 25-point off-leash Heeling exercise that includes the Figure 8. It may be divided among multiple course locations; all sections are judged together as one score.', { minor: ['Extra cue (3 points)', 'No sit (3 points)'] }, { allowsPerformanceSegments: true }),
      exercise('l5-find-front', 'Find Front', 10, [20, 21], 'From approximately 6 feet: dog finds front; handler returns to dog.', { nonQualifying: ['Fails to come on first cue', 'No front', 'Turns 90° or more'], minor: ['Extra cue for sit/front (3 points)', 'No sit (3 points)'] }),
      exercise('l5-retrieve-broad-jump', 'Retrieve Over Broad Jump', 15, [20], 'Leave dog; retrieve over broad jump, return within reach to front, and finish.', { nonQualifying: ['Fails to retrieve within reach'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)', 'Failure to finish (3 points)'] }),
      exercise('l5-seek-dropped-item', 'Seek Dropped Item', 10, [20, 21], 'Handler drops item while moving; at approximately 25 feet, dog is sent to take and return item.', { nonQualifying: ['Fails to retrieve within reach', 'Refuses to release item'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'], slight: ['Plays with or tugs item'] }),
      exercise('l5-signals', 'Signal Exercise', 15, [20, 21], 'From 20–25 feet: heel, stand-stay, signal down-sit-come to front; no finish.', { nonQualifying: ['Fails down-sit-come on first cue', 'Verbal cue after stand'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'], slight: ['Moves one step during stand/down/sit'] }),
      exercise('l5-moving-down', 'Moving Down - Call to Heel', 10, [20], 'While moving: down dog; handler takes six steps, calls dog to heel, then continues forward.', { nonQualifying: ['Fails to down on first cue'] }),
      exercise('l5-moving-stand', 'Moving Stand for Exam', 15, [20], 'While moving: stand dog, handler goes approximately 10 feet, judge examines, then dog is called to heel.', { nonQualifying: ['Sits, downs, or moves away during exam'], major: ['Fails to come to heel (5 points)'], minor: ['Extra cue (3 points)', 'No sit (3 points)'] }),
      exercise('l5-double-recall', 'Double Recall', 15, [20], 'Two-part recall: front and finish in part 1; front with no finish in part 2; no exercise finishes between parts.', { nonQualifying: ['Fails come-down-come on first cue'], major: ['Failure to front (5 points)', 'Position change'], minor: ['Extra cue for front/sit (3 points)', 'No sit (3 points)', 'Failure to finish (3 points)'] }),
      exercise('l5-go-out-jump-tunnel', 'Go Out - Directed Jump / Tunnel', 20, [20], 'Go out at least 20 feet past obstacle, sit near center, then directed jump and tunnel; finish after jump only.', { nonQualifying: ['Wrong/no jump or tunnel', 'Go-out not at least 10 feet past obstacle'], major: ['No sit on go-out', 'Takes jump/tunnel on way out'], minor: ['Extra cue (3 points)', 'No sit (3 points)', 'Sits more than 4 feet from center'] }),
      exercise('l5-scent-articles', 'Scent Articles', 15, [20, 21, 22], 'Five-article scent discrimination using handler-selected send method and standard article start.', { nonQualifying: ['Cue after dog reaches pile', 'Wrong article'], major: ['Failure to front (5 points)'], minor: ['Extra cue (3 points)', 'Pivot/send/sit error', 'No sit (3 points)'], slight: ['Drops or tugs article'] }),
    ],
  },
};

export interface PlanValidationIssue {
  code: string;
  message: string;
  exerciseId?: string;
}

export function defaultObediencePlan(level: ObedienceLevel, trialRoundId = '', judgeName = ''): ObedienceClassPlan {
  return {
    rulesetId: OBEDIENCE_RULESET_ID,
    trialRoundId,
    level,
    judgeName,
    status: 'draft',
    revision: 1,
    items: OBEDIENCE_RULES[level].exercises.map((item, index) => ({
      exerciseId: item.id,
      performanceOrder: index + 1,
      segment: item.allowsPerformanceSegments ? 1 : undefined,
      exerciseFinished: true,
    })),
    judgeOptions: {},
  };
}

export function validateObediencePlan(plan: ObedienceClassPlan): PlanValidationIssue[] {
  const issues: PlanValidationIssue[] = [];
  const rules = OBEDIENCE_RULES[plan.level];
  if (plan.rulesetId !== OBEDIENCE_RULESET_ID) issues.push({ code: 'RULESET_MISMATCH', message: 'The plan does not use the verified September 1, 2020 ruleset.' });
  if (!plan.trialRoundId) issues.push({ code: 'ROUND_REQUIRED', message: 'Select the actual trial round before finalizing.' });
  if (!plan.judgeName.trim()) issues.push({ code: 'JUDGE_REQUIRED', message: 'A judge is required before finalizing.' });

  const ordered = [...plan.items].sort((a, b) => a.performanceOrder - b.performanceOrder);
  const ids = ordered.map((item) => item.exerciseId);
  const allowed = new Set(rules.exercises.map((item) => item.id));
  for (const definition of rules.exercises) {
    const matching = ordered.filter((item) => item.exerciseId === definition.id);
    const count = matching.length;
    if (count === 0) issues.push({ code: 'MISSING_EXERCISE', exerciseId: definition.id, message: `${definition.name} is required.` });
    if (count > 1 && !definition.allowsPerformanceSegments) issues.push({ code: 'DUPLICATE_EXERCISE', exerciseId: definition.id, message: `${definition.name} may be scored only once.` });
    if (definition.allowsPerformanceSegments && count > 0) {
      const segments = matching.map((item) => item.segment || 1);
      if (new Set(segments).size !== segments.length || !segments.includes(1)) {
        issues.push({ code: 'INVALID_PERFORMANCE_SEGMENTS', exerciseId: definition.id, message: `${definition.name} sections must have unique segment numbers beginning with Section 1.` });
      }
      if (definition.maximumPerformanceSegments && count > definition.maximumPerformanceSegments) {
        issues.push({ code: 'TOO_MANY_PERFORMANCE_SEGMENTS', exerciseId: definition.id, message: `${definition.name} may be divided into no more than ${definition.maximumPerformanceSegments} performance sections at this level.` });
      }
    }
  }
  for (const id of ids) if (!allowed.has(id)) issues.push({ code: 'WRONG_LEVEL_EXERCISE', exerciseId: id, message: `${id} does not belong to Obedience ${plan.level}.` });
  const total = rules.exercises.reduce((sum, item) => sum + (item.maximumPoints || 0), 0);
  if (total !== rules.maximumPoints) issues.push({ code: 'CATALOG_TOTAL', message: `The verified exercise total is ${total}, not ${rules.maximumPoints}.` });

  if (plan.level === 1 && ids.at(-1) !== 'l1-greeting') issues.push({ code: 'GREETING_LAST', exerciseId: 'l1-greeting', message: 'Level 1 Greeting must be last (rulebook page 9).' });
  if (plan.level === 2) {
    const heeling = ids.indexOf('l2-on-leash-heeling');
    const figure = ids.indexOf('l2-figure-8');
    if (heeling < 0 || figure < 0 || Math.max(heeling, figure) > 1) issues.push({ code: 'L2_HEELING_FIRST', message: 'Level 2 On-Leash Heeling and Figure 8 must be the first scoring block.' });
    const call = ids.indexOf('l2-call-to-heel');
    if (ids[call + 1] !== 'l2-position-change') issues.push({ code: 'L2_CALL_POSITION_LINK', message: 'Level 2 Call to Heel must lead directly into Position Change.' });
    if (ids.at(-2) !== 'l2-leave-for-leash' || ids.at(-1) !== 'l2-honor') issues.push({ code: 'L2_END_ORDER', message: 'Level 2 Leave Dog for Leash must be the last off-leash exercise, followed by Honor.' });
  }
  if (plan.level === 3 && !['circle', 'figure-8', '270-turn'].includes(plan.judgeOptions.level3HeelingRequiredElement || '')) {
    issues.push({ code: 'L3_HEELING_ELEMENT_REQUIRED', exerciseId: 'l3-heeling', message: 'Choose the required Level 3 Heeling element: a circle, Figure 8, or 270-degree turn.' });
  }
  if (plan.level === 5) {
    const heelingSections = ordered.filter((item) => item.exerciseId === 'l5-heeling-figure-8');
    const figureEightSegment = Number(plan.judgeOptions.level5FigureEightSegment);
    if (!Number.isInteger(figureEightSegment) || !heelingSections.some((item) => (item.segment || 1) === figureEightSegment)) {
      issues.push({ code: 'L5_FIGURE_8_SECTION_REQUIRED', exerciseId: 'l5-heeling-figure-8', message: 'Choose which Level 5 Heeling section contains the required Figure 8.' });
    }
    for (const [index, item] of ordered.entries()) {
      if (item.exerciseId !== 'l5-heeling-figure-8' || item.exerciseFinished !== false) continue;
      const next = ordered[index + 1];
      if (!next || next.exerciseId === 'l5-heeling-figure-8') {
        issues.push({ code: 'L5_HEELING_COMBINATION_INVALID', exerciseId: item.exerciseId, message: `Heeling Section ${item.segment || 1} must be followed by one non-Heeling exercise when marked as combined.` });
      }
    }
  }
  return issues;
}

export function calculateObedienceResult(
  level: ObedienceLevel,
  earned: Record<string, number | null>,
  exerciseNq: Record<string, boolean> = {},
  honor: 'pass' | 'fail' | 'unjudged' = 'unjudged',
) {
  const rules = OBEDIENCE_RULES[level];
  const numeric = rules.exercises.filter((item) => item.maximumPoints !== null);
  const blank = numeric.some((item) => earned[item.id] === null || earned[item.id] === undefined);
  const invalid = numeric.some((item) => {
    const value = earned[item.id];
    return value !== null && value !== undefined && (value < 0 || value > item.maximumPoints! || Math.round(value * 2) !== value * 2);
  });
  const total = numeric.reduce((sum, item) => sum + (earned[item.id] ?? 0), 0);
  const belowMinimum = numeric.some((item) => (earned[item.id] ?? -1) < item.maximumPoints! * rules.minimumExercisePercent / 100);
  const nq = Object.values(exerciseNq).some(Boolean) || belowMinimum || total < rules.qualifyingPoints || (level === 2 && honor !== 'pass');
  return { total, result: invalid ? 'invalid' : blank || (level === 2 && honor === 'unjudged') ? 'unjudged' : nq ? 'NQ' : 'Q' } as const;
}
