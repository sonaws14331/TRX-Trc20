export const DEMO_SESSION_MS = 30_000;
export const PREMIUM_MS = 30 * 24 * 60 * 60 * 1000;
export const STORAGE_KEY = "eagle-i-demo-v1";
export const initialState = () => ({
  balance: 0,
  premiumUntil: 0,
  session: null,
  history: [],
});
export function readState(storage) {
  try {
    const state = JSON.parse(storage.getItem(STORAGE_KEY));
    if (
      !state ||
      !Number.isSafeInteger(state.balance) ||
      state.balance < 0 ||
      !Number.isSafeInteger(state.premiumUntil) ||
      state.premiumUntil < 0 ||
      !Array.isArray(state.history)
    )
      return initialState();
    if (
      state.session &&
      (!Number.isSafeInteger(state.session.startedAt) ||
        ![1200, 3600].includes(state.session.reward))
    )
      return initialState();
    if (
      state.history.some(
        (item) =>
          !item ||
          !["reward", "premium"].includes(item.type) ||
          !Number.isSafeInteger(item.at) ||
          !Number.isSafeInteger(item.amount),
      )
    )
      return initialState();
    return {
      balance: state.balance,
      premiumUntil: state.premiumUntil,
      session: state.session,
      history: state.history.slice(0, 50),
    };
  } catch {
    return initialState();
  }
}
export function transition(state, action, now = Date.now()) {
  if (action === "start" && !state.session)
    return {
      ...state,
      session: {
        startedAt: now,
        reward: state.premiumUntil > now ? 3600 : 1200,
      },
    };
  if (
    action === "claim" &&
    state.session &&
    now >= state.session.startedAt + DEMO_SESSION_MS
  )
    return {
      ...state,
      balance: state.balance + state.session.reward,
      session: null,
      history: [
        { type: "reward", amount: state.session.reward, at: now },
        ...state.history,
      ].slice(0, 50),
    };
  if (action === "premium" && state.premiumUntil <= now)
    return {
      ...state,
      premiumUntil: now + PREMIUM_MS,
      history: [
        { type: "premium", amount: 0, at: now },
        ...state.history,
      ].slice(0, 50),
    };
  return state;
}
