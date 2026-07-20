import { describe, expect, it } from "vitest"

import type { StandardCard } from "@/card/card-types"
import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import { rhodesIslandCards } from "@/data/rhodes-island"
import { getRuleSetBatchOptions } from "@/lib/ruleset-card-batches"

describe("ruleset card batch options", () => {
  const batches = [
    { id: BUILTIN_BATCH_ID, name: "系统内置卡牌包", cardCount: 664 },
    { id: "custom-original", name: "原版导入卡包", cardCount: 35 },
  ]

  it("罗德岛只显示按实际卡牌数统计的内置卡牌包", () => {
    const cards = rhodesIslandCards.map(card => ({
      ...(card as unknown as StandardCard),
      batchId: BUILTIN_BATCH_ID,
    }))
    expect(getRuleSetBatchOptions(batches, cards, "rhodes-island")).toEqual([{
      id: BUILTIN_BATCH_ID,
      name: "内置卡牌包",
      cardCount: 343,
    }])
  })

  it("原版规则保留原有卡包选项", () => {
    expect(getRuleSetBatchOptions(batches, [], "daggerheart")).toEqual(batches)
  })
})
