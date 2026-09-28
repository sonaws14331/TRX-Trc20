import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_SESSION_MS,
  PREMIUM_MS,
  initialState,
  transition,
  readState,
} from "../src/domain.js";

test("claims only mature sessions and cannot claim twice", () => {
  const state = transition(initialState(), "start", 1000);
  assert.equal(transition(state, "claim", 1001), state);
  assert.equal(transition(state, "start", 2000), state);
  const claimed = transition(state, "claim", 1000 + DEMO_SESSION_MS);
  assert.equal(claimed.balance, 1200);
  assert.equal(claimed.session, null);
  assert.equal(claimed.history[0].amount, 1200);
  assert.equal(transition(claimed, "claim", 100000), claimed);
});
test("upgrade affects new sessions and expires after 30 days", () => {
  const running = transition(initialState(), "start", 1000);
  const elite = transition(running, "premium", 2000);
  assert.equal(elite.session.reward, 1200);
  assert.equal(transition(elite, "premium", 3000), elite);
  const claimed = transition(elite, "claim", 1000 + DEMO_SESSION_MS);
  assert.equal(
    transition(claimed, "start", 1000 + DEMO_SESSION_MS).session.reward,
    3600,
  );
  assert.equal(
    transition(claimed, "start", 2000 + PREMIUM_MS).session.reward,
    1200,
  );
});
test("restores valid progress and recovers from unavailable or malformed storage", () => {
  const state = transition(initialState(), "start", 1000);
  assert.deepEqual(readState({ getItem: () => JSON.stringify(state) }), state);
  for (const value of [
    "broken",
    "null",
    '{"balance":-1}',
    JSON.stringify({ ...state, session: { startedAt: 1, reward: 999 } }),
    JSON.stringify({ ...state, history: [null] }),
  ]) {
    assert.deepEqual(readState({ getItem: () => value }), initialState());
  }
  assert.deepEqual(
    readState({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
    initialState(),
  );
});
