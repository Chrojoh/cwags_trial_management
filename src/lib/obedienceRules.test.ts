import assert from 'node:assert/strict';
import test from 'node:test';
import { OBEDIENCE_RULES, calculateObedienceResult, defaultObediencePlan, validateObediencePlan } from './obedienceRules';

test('catalog totals and thresholds match the verified 2020 ruleset', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const rules = OBEDIENCE_RULES[level];
    assert.equal(rules.exercises.reduce((sum, item) => sum + (item.maximumPoints || 0), 0), rules.maximumPoints);
    assert.equal(rules.qualifyingPoints, level === 5 ? 120 : 70);
  }
});

test('default plans require judge choices only where the rulebook requires them', () => {
  for (const level of [1, 2, 4] as const) assert.deepEqual(validateObediencePlan(defaultObediencePlan(level, `round-${level}`, 'Judge')), []);
  assert.ok(validateObediencePlan(defaultObediencePlan(3, 'round-3', 'Judge')).some((issue) => issue.code === 'L3_HEELING_ELEMENT_REQUIRED'));
  assert.ok(validateObediencePlan(defaultObediencePlan(5, 'round-5', 'Judge')).some((issue) => issue.code === 'L5_FIGURE_8_SECTION_REQUIRED'));
});

test('two rounds at the same level keep independent judge orders and stable exercise identities', () => {
  const first = defaultObediencePlan(3, 'round-a', 'Judge One');
  const second = defaultObediencePlan(3, 'round-b', 'Judge Two');
  first.judgeOptions.level3HeelingRequiredElement = 'circle';
  second.judgeOptions.level3HeelingRequiredElement = 'figure-8';
  const originalIds = first.items.map((item) => item.exerciseId).sort();
  second.items.reverse();
  second.items.forEach((item, index) => item.performanceOrder = index + 1);

  assert.notDeepEqual(first.items.map((item) => item.exerciseId), second.items.map((item) => item.exerciseId));
  assert.deepEqual(second.items.map((item) => item.exerciseId).sort(), originalIds);
  assert.deepEqual(validateObediencePlan(first), []);
  assert.deepEqual(validateObediencePlan(second), []);
});

test('rejects missing, duplicate and wrong-level exercises', () => {
  const plan = defaultObediencePlan(1, 'round', 'Judge');
  plan.items.pop();
  plan.items.push({ exerciseId: 'l1-find-front-forward', performanceOrder: 8 });
  plan.items.push({ exerciseId: 'l3-signals', performanceOrder: 9 });
  const codes = validateObediencePlan(plan).map((issue) => issue.code);
  assert.ok(codes.includes('MISSING_EXERCISE'));
  assert.ok(codes.includes('DUPLICATE_EXERCISE'));
  assert.ok(codes.includes('WRONG_LEVEL_EXERCISE'));
});

test('permits split heeling sections without creating a second scoring category', () => {
  const plan = defaultObediencePlan(5, 'round', 'Judge');
  plan.judgeOptions.level5FigureEightSegment = '1';
  plan.items.push({
    exerciseId: 'l5-heeling-figure-8',
    performanceOrder: plan.items.length + 1,
    segment: 2,
    exerciseFinished: true,
  });
  assert.deepEqual(validateObediencePlan(plan), []);
  plan.items.at(-1)!.segment = 1;
  assert.ok(validateObediencePlan(plan).some((issue) => issue.code === 'INVALID_PERFORMANCE_SEGMENTS'));
});

test('limits Levels 1 and 3 to two Heeling locations while Level 5 permits more', () => {
  for (const level of [1, 3] as const) {
    const plan = defaultObediencePlan(level, `round-${level}`, 'Judge');
    const heeling = plan.items.find((item) => OBEDIENCE_RULES[level].exercises.find((definition) => definition.id === item.exerciseId)?.allowsPerformanceSegments)!;
    plan.items.push({ ...heeling, performanceOrder: plan.items.length + 1, segment: 2 });
    assert.equal(validateObediencePlan(plan).some((issue) => issue.code === 'TOO_MANY_PERFORMANCE_SEGMENTS'), false);
    plan.items.push({ ...heeling, performanceOrder: plan.items.length + 1, segment: 3 });
    assert.equal(validateObediencePlan(plan).some((issue) => issue.code === 'TOO_MANY_PERFORMANCE_SEGMENTS'), true);
  }

  const levelFive = defaultObediencePlan(5, 'round-5', 'Judge');
  levelFive.judgeOptions.level5FigureEightSegment = '1';
  const heeling = levelFive.items.find((item) => item.exerciseId === 'l5-heeling-figure-8')!;
  levelFive.items.push({ ...heeling, performanceOrder: levelFive.items.length + 1, segment: 2 });
  levelFive.items.push({ ...heeling, performanceOrder: levelFive.items.length + 1, segment: 3 });
  assert.equal(validateObediencePlan(levelFive).some((issue) => issue.code === 'TOO_MANY_PERFORMANCE_SEGMENTS'), false);
});

test('validates mandatory Level 3 and Level 5 Heeling setup choices', () => {
  const levelThree = defaultObediencePlan(3, 'round-3', 'Judge');
  levelThree.judgeOptions.level3HeelingRequiredElement = '270-turn';
  assert.equal(validateObediencePlan(levelThree).some((issue) => issue.code === 'L3_HEELING_ELEMENT_REQUIRED'), false);

  const levelFive = defaultObediencePlan(5, 'round-5', 'Judge');
  levelFive.judgeOptions.level5FigureEightSegment = '1';
  levelFive.items[0].exerciseFinished = false;
  assert.equal(validateObediencePlan(levelFive).some((issue) => issue.code.startsWith('L5_')), false);
  levelFive.items[1] = { ...levelFive.items[0], performanceOrder: 2, segment: 2, exerciseFinished: true };
  assert.ok(validateObediencePlan(levelFive).some((issue) => issue.code === 'L5_HEELING_COMBINATION_INVALID'));
});

test('enforces Level 1 Greeting last and Level 2 linked/fixed order', () => {
  const levelOne = defaultObediencePlan(1, 'round', 'Judge');
  [levelOne.items[0], levelOne.items[5]] = [levelOne.items[5], levelOne.items[0]];
  levelOne.items.forEach((item, index) => item.performanceOrder = index + 1);
  assert.ok(validateObediencePlan(levelOne).some((issue) => issue.code === 'GREETING_LAST'));

  const levelTwo = defaultObediencePlan(2, 'round', 'Judge');
  [levelTwo.items[2], levelTwo.items[3]] = [levelTwo.items[3], levelTwo.items[2]];
  levelTwo.items.forEach((item, index) => item.performanceOrder = index + 1);
  assert.ok(validateObediencePlan(levelTwo).some((issue) => issue.code === 'L2_CALL_POSITION_LINK'));
});

test('keeps blank, zero, half points, NQ and Honor outcomes distinct', () => {
  const levelTwo = OBEDIENCE_RULES[2];
  const perfect = Object.fromEntries(levelTwo.exercises.filter((item) => item.maximumPoints !== null).map((item) => [item.id, item.maximumPoints]));
  assert.equal(calculateObedienceResult(2, { ...perfect, 'l2-recall-over-jump': null }, {}, 'pass').result, 'unjudged');
  assert.equal(calculateObedienceResult(2, { ...perfect, 'l2-recall-over-jump': 0 }, {}, 'pass').result, 'NQ');
  assert.equal(calculateObedienceResult(2, { ...perfect, 'l2-recall-over-jump': 14.5 }, {}, 'pass').result, 'Q');
  assert.equal(calculateObedienceResult(2, perfect, {}, 'unjudged').result, 'unjudged');
  assert.equal(calculateObedienceResult(2, perfect, {}, 'fail').result, 'NQ');
  assert.equal(calculateObedienceResult(2, perfect, { 'l2-figure-8': true }, 'pass').result, 'NQ');
});

test('Level 5 qualifies at exactly 120 only when every exercise remains at or above 50%', () => {
  const rules = OBEDIENCE_RULES[5];
  const earned = Object.fromEntries(rules.exercises.map((item) => [item.id, item.maximumPoints! * 0.8]));
  assert.equal(calculateObedienceResult(5, earned).total, 120);
  assert.equal(calculateObedienceResult(5, earned).result, 'Q');
  earned['l5-find-front'] = 4.5;
  earned['l5-heeling-figure-8'] = 23.5;
  assert.equal(calculateObedienceResult(5, earned).total, 120);
  assert.equal(calculateObedienceResult(5, earned).result, 'NQ');
});
