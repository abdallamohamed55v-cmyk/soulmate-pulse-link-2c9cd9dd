import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { checkHallucinations } from "../_shared/hallucination.ts";

Deno.test("no citations -> not suspicious", () => {
  const r = checkHallucinations("Plain answer with no links.");
  assertEquals(r.totalCitations, 0);
  assertEquals(r.suspicious, false);
});

Deno.test("valid citation -> not suspicious", () => {
  const r = checkHallucinations("See [docs](https://docs.example.org/api) for more.");
  // example.org is allowed (only example.<tld> short patterns blocked)
  assertEquals(r.totalCitations, 1);
});

Deno.test("example.com flagged as suspicious", () => {
  const r = checkHallucinations("Source: [link](https://example.com/page)");
  assertEquals(r.totalCitations, 1);
  assertEquals(r.suspicious, true);
  assert(r.invalidCitations.includes("https://example.com/page"));
});

Deno.test("test.com flagged", () => {
  const r = checkHallucinations("[ref](https://test.com/x)");
  assertEquals(r.suspicious, true);
});

Deno.test("malformed URL flagged", () => {
  const r = checkHallucinations("[bad](https://nodot)");
  assertEquals(r.suspicious, true);
});

Deno.test("multiple citations, mixed validity", () => {
  const r = checkHallucinations(
    "Sources: [a](https://wikipedia.org/x) and [b](https://example.com/y)"
  );
  assertEquals(r.totalCitations, 2);
  assertEquals(r.invalidCitations.length, 1);
  assertEquals(r.suspicious, true);
});

Deno.test("real-world domain not flagged", () => {
  const r = checkHallucinations("[mdn](https://developer.mozilla.org/en-US/docs/Web)");
  assertEquals(r.suspicious, false);
});
