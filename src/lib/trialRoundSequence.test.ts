import assert from 'node:assert/strict';
import test from 'node:test';
import { renumberTrialRounds, validateTrialRoundSequence } from './trialRoundSequence';

test('accepts consecutive ordinary rounds beginning at one', () => {
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 2 }, { round_number: 3 },
  ]).valid, true);
});

test('rejects a sequence that begins at round two', () => {
  const result = validateTrialRoundSequence([
    { round_number: 2 }, { round_number: 3 }, { round_number: 4 },
  ]);
  assert.equal(result.valid, false);
  assert.match(result.message || '', /Expected Round 1/);
});

test('rejects gaps and duplicate ordinary round numbers', () => {
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 3 },
  ]).valid, false);
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 1 },
  ]).valid, false);
});

test('accepts reset rounds attached to an ordinary round', () => {
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 1.5, is_reset: true }, { round_number: 2 },
  ]).valid, true);
});

test('rejects orphaned or incorrectly numbered reset rounds', () => {
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 2.5, is_reset: true },
  ]).valid, false);
  assert.equal(validateTrialRoundSequence([
    { round_number: 1 }, { round_number: 1.25, is_reset: true },
  ]).valid, false);
});

test('renumbers ordinary and reset rounds together after deletion', () => {
  const original = [
    { id: 'old-two', round_number: 2 },
    { id: 'old-two-reset', round_number: 2.5, is_reset: true },
    { id: 'old-three', round_number: 3 },
  ];
  const rounds = renumberTrialRounds(original);
  assert.deepEqual(rounds.map((round) => round.round_number), [1, 1.5, 2]);
  assert.deepEqual(rounds.map((round) => round.id), [
    'old-two',
    'old-two-reset',
    'old-three',
  ]);
  assert.deepEqual(original.map((round) => round.round_number), [2, 2.5, 3]);
});
