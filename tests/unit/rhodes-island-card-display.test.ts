import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { formatRhodesSubclassDomainRecommendation } from "@/lib/rhodes-island-card-display"

function createBranchCard(item3: string): StandardCard {
  return {
    id: "ri-branch-test",
    name: "冲锋手",
    type: "subclass",
    ruleset: "rhodes-island",
    cardSelectDisplay: { item3 },
  } as StandardCard
}

describe("Rhodes Island subclass display", () => {
  it.each([
    ["秘行 / 攻坚", "推荐秘行/攻坚"],
    ["第二领域推荐：秘行/攻坚", "推荐秘行/攻坚"],
    ["推荐秘行/攻坚", "推荐秘行/攻坚"],
  ])("formats %s as a compact recommendation", (source, expected) => {
    expect(formatRhodesSubclassDomainRecommendation(createBranchCard(source))).toBe(expected)
  })
})
