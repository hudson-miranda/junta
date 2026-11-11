import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordStrength } from '../src/index';

test('feedback distinguishes minimum length, predictable patterns and long passphrases', () => {
  assert.equal(passwordStrength('').score, 0);
  assert.equal(passwordStrength('Abc!234567').meetsMinimum, false);
  assert.ok(passwordStrength('Abc!234567').score <= 1);
  assert.equal(passwordStrength('aaaaaaaaaaaaaaaaaaaa').score, 1);
  assert.equal(passwordStrength('1234567890123456').score, 1);
  assert.ok(passwordStrength('Junta12345678!').score <= 2);
  const phrase = passwordStrength('janela violeta brisa café');
  assert.equal(phrase.meetsMinimum, true);
  assert.equal(phrase.score, 4);
  assert.equal(phrase.label, 'Forte');
  assert.ok(passwordStrength('Sol!nuvem72Praia').score >= 3);
});
