import test from "node:test";
import assert from "node:assert/strict";

import { formatAgeInYearsAndMonths } from "../src/lib/utils/age.ts";

const today = new Date(2026, 8, 23);

test("formats completed years and months before the birth day in the month", () => {
  assert.equal(formatAgeInYearsAndMonths("1984-04-07", today), "42 anos e 5 meses");
  assert.equal(formatAgeInYearsAndMonths("2000-09-24", today), "25 anos e 11 meses");
});

test("uses singular labels and handles the exact birthday", () => {
  assert.equal(formatAgeInYearsAndMonths("2025-08-23", today), "1 ano e 1 mês");
  assert.equal(formatAgeInYearsAndMonths("2000-09-23", today), "26 anos e 0 meses");
});

test("rejects empty, invalid, and future dates", () => {
  assert.equal(formatAgeInYearsAndMonths("", today), null);
  assert.equal(formatAgeInYearsAndMonths("2026-02-30", today), null);
  assert.equal(formatAgeInYearsAndMonths("2027-01-01", today), null);
});
