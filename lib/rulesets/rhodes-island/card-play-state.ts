import type {
  RhodesIslandCardState,
  RhodesIslandCounter,
  RhodesIslandCounterColor,
  StandardCard,
} from "@/card/card-types";

export const RHODES_ISLAND_COUNTER_COLORS: readonly RhodesIslandCounterColor[] =
  ["red", "amber", "emerald", "sky", "violet", "pink", "orange", "slate"];

const normalizeCounters = (
  state?: RhodesIslandCardState,
): RhodesIslandCounter[] =>
  (state?.counters ?? []).filter(
    (counter) =>
      counter &&
      typeof counter.id === "string" &&
      RHODES_ISLAND_COUNTER_COLORS.includes(counter.color) &&
      Number.isInteger(counter.value) &&
      counter.value > 0,
  );

const withState = (
  card: StandardCard,
  state: RhodesIslandCardState,
): StandardCard => ({
  ...card,
  rhodesIslandState: state,
});

export const toggleRhodesIslandCardFace = (card: StandardCard): StandardCard =>
  withState(card, {
    ...card.rhodesIslandState,
    flipped: !card.rhodesIslandState?.flipped,
    counters: normalizeCounters(card.rhodesIslandState),
  });

export const canAddRhodesIslandCounter = (card: StandardCard): boolean =>
  normalizeCounters(card.rhodesIslandState).length <
  RHODES_ISLAND_COUNTER_COLORS.length;

export const addRhodesIslandCounter = (card: StandardCard): StandardCard => {
  const counters = normalizeCounters(card.rhodesIslandState);
  const usedColors = new Set(counters.map((counter) => counter.color));
  const color = RHODES_ISLAND_COUNTER_COLORS.find(
    (candidate) => !usedColors.has(candidate),
  );

  if (!color) return card;

  const usedIds = new Set(counters.map((counter) => counter.id));
  let sequence = counters.length + 1;
  while (usedIds.has(`counter-${sequence}`)) sequence += 1;

  return withState(card, {
    ...card.rhodesIslandState,
    counters: [...counters, { id: `counter-${sequence}`, color, value: 1 }],
  });
};

export const changeRhodesIslandCounter = (
  card: StandardCard,
  counterId: string,
  delta: 1 | -1,
): StandardCard => {
  const counters = normalizeCounters(card.rhodesIslandState)
    .map((counter) =>
      counter.id === counterId
        ? { ...counter, value: counter.value + delta }
        : counter,
    )
    .filter((counter) => counter.value > 0);

  return withState(card, {
    ...card.rhodesIslandState,
    counters,
  });
};
