import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ExtendedStandardCard, ImportData } from "@/card/card-types"
import { CardType } from "@/card/card-types"
import {
  createRuleSetTypeKey,
  BUILTIN_BATCH_ID,
  STORAGE_KEYS,
  type BatchData,
  type BatchInfo,
} from "@/card/stores/store-types"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"

function card(
  id: string,
  ruleset?: "daggerheart" | "rhodes-island",
  batchId?: string,
): ExtendedStandardCard {
  return {
    standarized: true,
    id,
    name: id,
    type: CardType.Domain,
    class: "test",
    cardSelectDisplay: {},
    ruleset,
    batchId,
  } as ExtendedStandardCard
}

function batch(id: string, cardIds: string[], disabled = false): BatchInfo {
  return {
    id,
    name: id,
    fileName: `${id}.json`,
    importTime: "2026-08-30T00:00:00.000Z",
    cardCount: cardIds.length,
    cardTypes: [CardType.Domain],
    size: 1,
    disabled,
    cardIds,
  }
}

function setCards(cards: ExtendedStandardCard[], batches: BatchInfo[] = []) {
  useUnifiedCardStore.setState({
    cards: new Map(cards.map((item) => [item.id, item])),
    batches: new Map(batches.map((item) => [item.id, item])),
    cardsByType: new Map(),
    cardsByRuleSetAndType: new Map(),
    initialized: true,
    index: {
      batches: {},
      totalCards: cards.length,
      totalBatches: batches.length,
      lastUpdate: "2026-08-30T00:00:00.000Z",
    },
  })
  useUnifiedCardStore.getState()._rebuildCardsByType()
}

describe("ruleset and card type index", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses one stable key format", () => {
    expect(createRuleSetTypeKey("rhodes-island", CardType.Domain)).toBe(
      "rhodes-island:domain",
    )
  })

  it("keeps cardsByType order while isolating rulesets and treating untagged cards as Daggerheart", () => {
    const daggerheart = card("daggerheart", "daggerheart")
    const rhodesIsland = card("rhodes-island", "rhodes-island")
    const untagged = card("untagged")
    setCards([rhodesIsland, untagged, daggerheart])

    const store = useUnifiedCardStore.getState()

    expect(store.loadCardsByRuleSetAndType("daggerheart", CardType.Domain)).toEqual([
      untagged,
      daggerheart,
    ])
    expect(store.loadCardsByRuleSetAndType("rhodes-island", CardType.Domain)).toEqual([
      rhodesIsland,
    ])
    expect(store.loadCardsByType(CardType.Domain)).toEqual([
      rhodesIsland,
      untagged,
      daggerheart,
    ])
  })

  it("keeps disabled-batch filtering behavior", () => {
    const enabled = card("enabled", "rhodes-island", "enabled-batch")
    const disabled = card("disabled", "rhodes-island", "disabled-batch")
    setCards(
      [enabled, disabled],
      [batch("enabled-batch", [enabled.id]), batch("disabled-batch", [disabled.id], true)],
    )

    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain),
    ).toEqual([enabled])
  })

  it("stays synchronized after import and remove", async () => {
    const imported = card("imported-rhodes", "rhodes-island")
    setCards([card("existing-daggerheart")])

    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, "generateBatchId").mockReturnValue("imported-batch")
    vi.spyOn(store, "_validateImportData").mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    })
    vi.spyOn(store, "_convertImportData").mockResolvedValue({
      success: true,
      cards: [imported],
    })
    vi.spyOn(store, "_syncToLocalStorage").mockImplementation(() => {})
    vi.spyOn(store, "_recomputeAggregations").mockImplementation(() => {})
    vi.spyOn(store, "_rebuildSubclassIndex").mockImplementation(() => {})

    const result = await store.importCards({ name: "test" } as ImportData, "test.json")

    expect(result.success).toBe(true)
    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain)
        .map((item) => item.id),
    ).toEqual([imported.id])

    expect(useUnifiedCardStore.getState().removeBatch("imported-batch")).toBe(true)
    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain),
    ).toEqual([])
  })

  it("rebuilds both indexes after clearing custom cards", async () => {
    const builtin = card("builtin-daggerheart", "daggerheart", BUILTIN_BATCH_ID)
    const custom = card("custom-rhodes", "rhodes-island", "custom-batch")
    setCards(
      [builtin, custom],
      [
        { ...batch(BUILTIN_BATCH_ID, [builtin.id]), isSystemBatch: true },
        batch("custom-batch", [custom.id]),
      ],
    )

    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, "clearAllBatchImages").mockResolvedValue(undefined)
    vi.spyOn(store, "_syncToLocalStorage").mockImplementation(() => {})

    await store.clearAllCustomCards()

    const nextState = useUnifiedCardStore.getState()
    expect(nextState.cardsByType.get(CardType.Domain)).toEqual([builtin.id])
    expect(
      nextState.cardsByRuleSetAndType.get(
        createRuleSetTypeKey("daggerheart", CardType.Domain),
      ),
    ).toEqual([builtin.id])
    expect(
      nextState.cardsByRuleSetAndType.get(
        createRuleSetTypeKey("rhodes-island", CardType.Domain),
      ),
    ).toBeUndefined()
  })

  it("stays synchronized after reload", () => {
    const reloaded = card("reloaded-rhodes", "rhodes-island")
    setCards([card("existing-daggerheart")])

    const reloadedBatch = batch("reloaded-batch", [reloaded.id])
    localStorage.setItem(
      STORAGE_KEYS.INDEX,
      JSON.stringify({
        batches: {
          [reloadedBatch.id]: reloadedBatch,
        },
        totalCards: 1,
        totalBatches: 1,
        lastUpdate: reloadedBatch.importTime,
      }),
    )
    localStorage.setItem(
      `${STORAGE_KEYS.BATCH_PREFIX}${reloadedBatch.id}`,
      JSON.stringify({
        metadata: {
          id: reloadedBatch.id,
          name: reloadedBatch.name,
          fileName: reloadedBatch.fileName,
          importTime: reloadedBatch.importTime,
        },
        cards: [reloaded],
      } satisfies BatchData),
    )

    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, "_recomputeAggregations").mockImplementation(() => {})
    vi.spyOn(store, "_rebuildSubclassIndex").mockImplementation(() => {})

    store.reloadCustomCards()

    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain)
        .map((item) => item.id),
    ).toEqual([reloaded.id])
  })

  it("keeps both indexes synchronized through exposed incremental helpers", () => {
    const rhodesIsland = card("helper-rhodes", "rhodes-island")
    setCards([])

    const store = useUnifiedCardStore.getState()
    store._addCardToTypeMap(rhodesIsland)
    useUnifiedCardStore.setState((state) => ({
      cards: new Map(state.cards).set(rhodesIsland.id, rhodesIsland),
    }))

    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain),
    ).toEqual([rhodesIsland])

    useUnifiedCardStore.getState()._removeCardFromTypeMap(rhodesIsland)
    expect(
      useUnifiedCardStore
        .getState()
        .loadCardsByRuleSetAndType("rhodes-island", CardType.Domain),
    ).toEqual([])
  })
})
