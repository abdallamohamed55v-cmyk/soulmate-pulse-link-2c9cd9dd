import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { cacheKey, cacheGet, cacheSet, shouldCache } from "../_shared/cache.ts";

Deno.test("cacheKey: stable hashing", async () => {
  const a = await cacheKey("u1", "free", "What is 2+2?");
  const b = await cacheKey("u1", "free", "what is 2+2?  ");
  assertEquals(a, b, "case + whitespace must normalize");
});

Deno.test("cacheKey: differs by user", async () => {
  const a = await cacheKey("u1", "free", "hello world");
  const b = await cacheKey("u2", "free", "hello world");
  assert(a !== b);
});

Deno.test("cacheKey: differs by tier", async () => {
  const a = await cacheKey("u1", "free", "hello world");
  const b = await cacheKey("u1", "pro", "hello world");
  assert(a !== b);
});

Deno.test("cacheGet returns null on miss", () => {
  assertEquals(cacheGet("nonexistent-key"), null);
});

Deno.test("cacheSet/Get roundtrip", async () => {
  const k = await cacheKey("u1", "free", "roundtrip question please");
  cacheSet(k, "value-123");
  assertEquals(cacheGet(k), "value-123");
});

Deno.test("cacheSet ignores empty values", async () => {
  const k = await cacheKey("u1", "free", "ignore empty test query");
  cacheSet(k, "");
  assertEquals(cacheGet(k), null);
});

Deno.test("cacheSet ignores oversized values", async () => {
  const k = await cacheKey("u1", "free", "ignore oversized response");
  cacheSet(k, "x".repeat(9000));
  assertEquals(cacheGet(k), null);
});

Deno.test("shouldCache: true for normal informational query", () => {
  assertEquals(shouldCache("What is the capital of France?", false, false), true);
});

Deno.test("shouldCache: false when streaming", () => {
  assertEquals(shouldCache("What is the capital of France?", false, true), false);
});

Deno.test("shouldCache: false when tools used", () => {
  assertEquals(shouldCache("What is the capital of France?", true, false), false);
});

Deno.test("shouldCache: false for time-sensitive English", () => {
  assertEquals(shouldCache("What is the latest news today?", false, false), false);
});

Deno.test("shouldCache: false for time-sensitive Arabic", () => {
  assertEquals(shouldCache("ما أخبار اليوم؟", false, false), false);
});

Deno.test("shouldCache: false for too-short", () => {
  assertEquals(shouldCache("hi", false, false), false);
});

Deno.test("shouldCache: false for too-long", () => {
  assertEquals(shouldCache("a".repeat(500), false, false), false);
});
