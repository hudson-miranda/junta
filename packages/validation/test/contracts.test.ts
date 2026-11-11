import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intentSchema, offerSchema, signupSchema, normalizeSlug } from '../src';
test('intent accepts exact cents and rejects fractional or negative money', () => {
  assert.equal(intentSchema.parse({variantId:'ps5', targetCents:299900, horizon:'WEEK'}).targetCents,299900);
  for (const targetCents of [-1, 0, 1.5, 1e13]) assert.equal(intentSchema.safeParse({variantId:'ps5',targetCents,horizon:'WEEK'}).success,false);
});
test('offer rejects unsafe links and reversed validity', () => {
  const base={variantId:'ps5',priceCents:299900,url:'https://example.com/ps5',startsAt:'2026-11-10T00:00:00Z',endsAt:'2026-11-12T00:00:00Z'};
  assert.equal(offerSchema.safeParse(base).success,true);
  assert.equal(offerSchema.safeParse({...base,url:'javascript:alert(1)'}).success,false);
  assert.equal(offerSchema.safeParse({...base,endsAt:base.startsAt}).success,false);
});
test('signup normalizes email and rejects weak passwords', () => {
  assert.equal(signupSchema.parse({name:'Ana',email:' ANA@EXAMPLE.COM ',password:'Strong!Password9'}).email,'ana@example.com');
  assert.equal(signupSchema.safeParse({name:'Ana',email:'ana@example.com',password:'123'}).success,false);
});
test('catalogue slugs normalize case, whitespace and accents', () => {
  assert.equal(normalizeSlug('  PlayStation  5 SLIM '),'playstation-5-slim');
  assert.equal(normalizeSlug('Televisão OLED'),'televisao-oled');
});
