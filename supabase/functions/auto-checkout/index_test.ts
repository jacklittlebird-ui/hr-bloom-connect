import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAutoCloseUpdate } from "./index.ts";

const HOUR = 60 * 60 * 1000;

Deno.test("auto-close caps work hours at 5 even after 18h elapsed", () => {
  const checkIn = new Date(Date.now() - 19 * HOUR).toISOString();
  const plan = computeAutoCloseUpdate(checkIn);
  assert(plan.eligible, "should be eligible after 18h");
  assertEquals(plan.workHours, 5);
  assertEquals(plan.workMinutes, 300);
  assertEquals(plan.status, "auto-closed");
});

Deno.test("auto-close caps work hours at 5 even after 48h cron outage", () => {
  const checkIn = new Date(Date.now() - 48 * HOUR).toISOString();
  const plan = computeAutoCloseUpdate(checkIn);
  assert(plan.eligible);
  assertEquals(plan.workHours, 5, "must NEVER exceed 5h even after 48h outage");
});

Deno.test("auto-close caps work hours at 5 even after 7 days cron outage", () => {
  const checkIn = new Date(Date.now() - 7 * 24 * HOUR).toISOString();
  const plan = computeAutoCloseUpdate(checkIn);
  assertEquals(plan.workHours, 5, "must NEVER exceed 5h regardless of how long cron was down");
});

Deno.test("auto-close NOT eligible before 18h", () => {
  const checkIn = new Date(Date.now() - 12 * HOUR).toISOString();
  const plan = computeAutoCloseUpdate(checkIn);
  assertEquals(plan.eligible, false);
});

Deno.test("computed check_out equals check_in + 5h exactly", () => {
  const checkInMs = Date.now() - 20 * HOUR;
  const checkIn = new Date(checkInMs).toISOString();
  const plan = computeAutoCloseUpdate(checkIn);
  const expectedCheckOutMs = checkInMs + 5 * HOUR;
  assertEquals(new Date(plan.checkOutIso).getTime(), expectedCheckOutMs);
});
