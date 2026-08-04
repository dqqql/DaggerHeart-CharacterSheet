import { describe, expect, it } from "vitest"
import { splitTextAtBoundary } from "@/lib/text-layout"

describe("splitTextAtBoundary", () => {
  it("keeps connected Chinese phrases together when splitting armor features", () => {
    expect(
      splitTextAtBoundary(
        "强化: 当你标记最后一个护甲槽时，你的伤害阈值提升+2，直至你清除至少1个护甲槽。",
        29,
      ),
    ).toEqual([
      "强化: 当你标记最后一个护甲槽时，你的伤害阈值提升+2，",
      "直至你清除至少1个护甲槽。",
    ])

    expect(
      splitTextAtBoundary(
        "转移: 当你成为攻击目标时，可以标记1护甲槽，使针对你的攻击掷骰具有劣势",
        29,
      ),
    ).toEqual([
      "转移: 当你成为攻击目标时，可以标记1护甲槽，",
      "使针对你的攻击掷骰具有劣势",
    ])
  })
})
