import { describe, expect, it } from "vitest"
import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  applyRhodesIslandAutomation,
  RHODES_ISLAND_AUTOMATION_VERSION,
} from "@/lib/rhodes-island-automation"
import { rhodesIslandCards, rhodesIslandCatalog } from "@/data/rhodes-island"

function createBranchSheet(level: number) {
  const branch = rhodesIslandCatalog.branches[0]
  const professionCard = rhodesIslandCards.find(card => card.id === branch.professionId) as StandardCard
  const branchCard = rhodesIslandCards.find(card => card.id === branch.id) as StandardCard
  const cards = Array.from({ length: 20 }, () => createEmptyCard())
  cards[0] = professionCard
  cards[1] = branchCard
  return {
    ...defaultSheetData,
    ruleSetId: "rhodes-island" as const,
    level: String(level),
    professionRef: { id: professionCard.id, name: professionCard.name },
    subclassRef: { id: branchCard.id, name: branchCard.name },
    cards,
  }
}

describe("罗德岛规则幂等自动化", () => {
  it.each([1, 2, 5, 8])("%i 级使用对应阶段的绑定主武器", level => {
    const branch = rhodesIslandCatalog.branches[0]
    const expected = branch.stages.find(stage => stage.level === level)!
    const result = applyRhodesIslandAutomation(createBranchSheet(level))
    expect(result.primaryWeaponName).toBe(expected.weapon.name)
    expect(result.primaryWeaponDamage).toBe(expected.weapon.damage)
    expect(result.primaryWeaponTrait).toContain(expected.weapon.range)
    expect(result.secondaryWeaponName).toBe("")
    expect(result.rulesetAutomationVersions?.["rhodes-island"]).toBe(RHODES_ISLAND_AUTOMATION_VERSION)
  })

  it("重复加载不会重复叠加数值，降级会回退武器阶段", () => {
    const levelEight = applyRhodesIslandAutomation(createBranchSheet(8))
    const repeated = applyRhodesIslandAutomation(levelEight)
    expect(repeated).toEqual(levelEight)

    const downgraded = applyRhodesIslandAutomation({ ...repeated, level: "2" })
    const tierTwo = rhodesIslandCatalog.branches[0].stages[1]
    expect(downgraded.primaryWeaponDamage).toBe(tierTwo.weapon.damage)
  })

  it("分支升级可逆切换预备、正式和资深特性", () => {
    const base = createBranchSheet(5)
    const branch = rhodesIslandCatalog.branches[0]
    expect(applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 0 }).cards[1].description)
      .toBe(branch.stages[0].branchFeature)
    expect(applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 1 }).cards[1].description)
      .toBe(branch.stages[1].branchFeature)
    expect(applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 2 }).cards[1].description)
      .toBe(branch.stages[2].branchFeature)
  })

  it("8 级只应用当前选中的一个模组", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const x = applyRhodesIslandAutomation({ ...createBranchSheet(8), selectedModule: "x" })
    const y = applyRhodesIslandAutomation({ ...x, selectedModule: "y" })
    expect(x.cards[0].description).toContain(branch.modules.x.description)
    expect(x.cards[0].description).not.toContain(branch.modules.y.description)
    expect(y.cards[0].description).toContain(branch.modules.y.description)
    expect(y.cards[0].description).not.toContain(branch.modules.x.description)
  })
})
