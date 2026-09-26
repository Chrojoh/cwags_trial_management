import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostTrialPackageModel, type PostTrialSource } from './postTrialPackage';

const fixture = (): PostTrialSource => ({
  trial: {
    id: 'trial-1',
    trial_name: 'Package Test',
    club_name: 'Test Club',
    location: 'Test Hall',
    start_date: '2026-09-20',
    end_date: '2026-09-20',
  },
  days: [{ id: 'day-1', trial_date: '2026-09-20', day_number: 1 }],
  classes: [
    {
      id: 'class-1',
      trial_day_id: 'day-1',
      class_name: 'Patrol 1',
      class_type: 'scent',
      class_order: 1,
    },
  ],
  rounds: [
    { id: 'round-1', trial_class_id: 'class-1', round_number: 1, judge_name: 'Judge One' },
  ],
  entries: [
    {
      id: 'entry-pass',
      handler_name: 'Alex Example',
      dog_call_name: 'Comet',
      cwags_number: '12-3456-78',
      entry_status: 'confirmed',
      amount_owed: 23,
      amount_paid: 23,
    },
    {
      id: 'entry-abs',
      handler_name: 'Taylor Training',
      dog_call_name: 'Maple',
      cwags_number: '87-6543-21',
      entry_status: 'confirmed',
      amount_owed: 23,
      amount_paid: 23,
    },
    {
      id: 'entry-waitlist',
      handler_name: 'Wait Listed',
      dog_call_name: 'Later',
      cwags_number: '11-1111-11',
      entry_status: 'waitlisted',
      amount_owed: 0,
      amount_paid: 0,
    },
  ],
  selections: [
    {
      id: 'selection-pass',
      entry_id: 'entry-pass',
      trial_round_id: 'round-1',
      entry_type: 'regular',
      entry_status: 'entered',
    },
    {
      id: 'selection-abs',
      entry_id: 'entry-abs',
      trial_round_id: 'round-1',
      entry_type: 'regular',
      entry_status: 'no_show',
    },
    {
      id: 'selection-waitlist',
      entry_id: 'entry-waitlist',
      trial_round_id: 'round-1',
      entry_type: 'regular',
      entry_status: 'waitlisted',
    },
  ],
  scores: [
    {
      id: 'score-pass',
      entry_selection_id: 'selection-pass',
      trial_round_id: 'round-1',
      pass_fail: 'Pass',
      entry_status: 'present',
    },
  ],
  cwagsFeePerRun: 1.75,
});

test('builds class reports without counting waitlisted selections or ABS as completed runs', () => {
  const model = buildPostTrialPackageModel(fixture());
  assert.equal(model.classResults.length, 1);
  assert.equal(model.classResults[0].rows.length, 2);
  assert.deepEqual(model.classResults[0].totals, {
    selections: 2,
    regularRuns: 1,
    feoRuns: 0,
    passes: 1,
    fails: 0,
    absences: 1,
    missingResults: 0,
  });
  assert.equal(model.recap.regularSelections, 2);
  assert.equal(model.recap.scoredRegularRuns, 1);
  assert.equal(model.recap.cwagsAmountDue, 3.5);
});

test('readiness identifies missing results, placeholder judges, registrations, and balances', () => {
  const source = fixture();
  source.rounds[0].judge_name = 'TBD';
  source.entries[0].registration_pending = true;
  source.entries[0].amount_paid = 0;
  source.scores = [];

  const model = buildPostTrialPackageModel(source);
  assert.equal(model.ready, false);
  assert.deepEqual(model.issues, {
    awaitingAcceptance: 0,
    pendingRegistration: 1,
    placeholderJudges: 1,
    missingScores: 1,
    outstandingBalances: 1,
  });
});

test('keeps submitted quotes out of accepted post-trial totals', () => {
  const source = fixture();
  source.entries[0].entry_status = 'submitted';

  const model = buildPostTrialPackageModel(source);
  assert.equal(model.issues.awaitingAcceptance, 1);
  assert.equal(model.recap.acceptedEntries, 1);
  assert.equal(model.recap.regularSelections, 1);
});

test('assesses outstanding balances once per handler across multiple dogs', () => {
  const source = fixture();
  source.entries = [
    {
      id: 'dog-one',
      handler_name: 'Michelle Example',
      dog_call_name: 'Flash',
      cwags_number: '26-5828-01',
      entry_status: 'confirmed',
      amount_owed: 40,
      amount_paid: 80,
    },
    {
      id: 'dog-two',
      handler_name: 'Michelle Example',
      dog_call_name: 'Lumi',
      cwags_number: '26-5828-02',
      entry_status: 'confirmed',
      amount_owed: 40,
      amount_paid: 0,
    },
  ];
  source.selections = [];
  source.scores = [];

  const model = buildPostTrialPackageModel(source);
  assert.equal(model.issues.outstandingBalances, 0);
});

test('preserves Games result codes in the report', () => {
  const source = fixture();
  source.classes[0].class_name = 'Games 1';
  source.classes[0].class_type = 'games';
  source.scores[0].pass_fail = 'BJ';

  const model = buildPostTrialPackageModel(source);
  assert.equal(model.classResults[0].rows[0].result, 'BJ');
  assert.equal(model.classResults[0].totals.passes, 1);
});
