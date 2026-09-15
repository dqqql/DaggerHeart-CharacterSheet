import { describe, expect, it } from "vitest";

import type { StandardCard } from "@/card/card-types";
import {
  addRhodesIslandCounter,
  canAddRhodesIslandCounter,
  changeRhodesIslandCounter,
  RHODES_ISLAND_COUNTER_COLORS,
  toggleRhodesIslandCardFace,
} from "@/lib/rulesets/rhodes-island/card-play-state";

const createCard = (): StandardCard => ({
  standarized: true,
  ruleset: "rhodes-island",
  id: "rhodes-card-1",
  name: "战术卡牌",
  type: "domain",
  class: "先锋",
  cardSelectDisplay: {},
});

describe("Rhodes Island card play state", () => {
  it("toggles the face state without mutating the source card", () => {
    const card = createCard();
    const flipped = toggleRhodesIslandCardFace(card);
    const restored = toggleRhodesIslandCardFace(flipped);

    expect(card.rhodesIslandState).toBeUndefined();
    expect(flipped.rhodesIslandState?.flipped).toBe(true);
    expect(restored.rhodesIslandState?.flipped).toBe(false);
  });

  it("adds counters with distinct colors and an initial value of one", () => {
    const first = addRhodesIslandCounter(createCard());
    const second = addRhodesIslandCounter(first);

    expect(first.rhodesIslandState?.counters).toEqual([
      { id: "counter-1", color: "red", value: 1 },
    ]);
    expect(second.rhodesIslandState?.counters).toEqual([
      { id: "counter-1", color: "red", value: 1 },
      { id: "counter-2", color: "amber", value: 1 },
    ]);
  });

  it("increments on left-click semantics and removes a value-one counter on decrement", () => {
    const card = addRhodesIslandCounter(createCard());
    const increased = changeRhodesIslandCounter(card, "counter-1", 1);
    const decreased = changeRhodesIslandCounter(increased, "counter-1", -1);
    const removed = changeRhodesIslandCounter(decreased, "counter-1", -1);

    expect(increased.rhodesIslandState?.counters?.[0].value).toBe(2);
    expect(decreased.rhodesIslandState?.counters?.[0].value).toBe(1);
    expect(removed.rhodesIslandState?.counters).toEqual([]);
  });

  it("stops adding after every distinct palette color is in use", () => {
    let card = createCard();
    RHODES_ISLAND_COUNTER_COLORS.forEach(() => {
      card = addRhodesIslandCounter(card);
    });

    expect(canAddRhodesIslandCounter(card)).toBe(false);
    expect(addRhodesIslandCounter(card)).toBe(card);
  });

  it("discards invalid imported counters before applying an update", () => {
    const card: StandardCard = {
      ...createCard(),
      rhodesIslandState: {
        counters: [
          { id: "valid", color: "sky", value: 2 },
          { id: "invalid", color: "red", value: 0 },
        ],
      },
    };

    const updated = changeRhodesIslandCounter(card, "valid", -1);
    expect(updated.rhodesIslandState?.counters).toEqual([
      { id: "valid", color: "sky", value: 1 },
    ]);
  });
});
