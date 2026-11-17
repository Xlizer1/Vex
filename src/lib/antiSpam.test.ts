import { beforeEach, expect, test } from "bun:test";
import { resetAntiSpam, track, type SpamEntry } from "./antiSpam";

let id = 0;
const msg = (channelId: string, at: number, fingerprint = "free nitro https://x.co", hasMedia = true): SpamEntry =>
  ({ at, channelId, messageId: String(++id), fingerprint, hasMedia });

beforeEach(resetAntiSpam);

test("same message in 3 channels within the window triggers", () => {
  expect(track("u", msg("a", 0))).toBeNull();
  expect(track("u", msg("b", 1_000))).toBeNull();
  expect(track("u", msg("c", 2_000))?.length).toBe(3);
});

test("same message repeated in one channel does not trigger the cross-channel rule", () => {
  for (let i = 0; i < 4; i++) expect(track("u", msg("a", i * 3_000, "gg"))).toBeNull();
});

test("spread out beyond the window does not trigger", () => {
  track("u", msg("a", 0));
  track("u", msg("b", 20_000));
  expect(track("u", msg("c", 40_000))).toBeNull();
});

test("burst of 5 different links in 10s triggers", () => {
  for (let i = 0; i < 4; i++) expect(track("u", msg("a", i * 1_000, `link ${i}`))).toBeNull();
  expect(track("u", msg("a", 4_000, "link 4"))?.length).toBe(5);
});

test("normal chat without media never triggers the burst rule", () => {
  for (let i = 0; i < 10; i++) expect(track("u", msg("a", i * 500, `msg ${i}`, false))).toBeNull();
});

test("users are tracked separately and state resets after a hit", () => {
  track("u", msg("a", 0));
  track("v", msg("b", 0));
  expect(track("u", msg("c", 0))).toBeNull(); // v's message in "b" doesn't count for u
  expect(track("u", msg("b", 0))).not.toBeNull();
  expect(track("u", msg("e", 1))).toBeNull(); // fresh start after the hit
});
