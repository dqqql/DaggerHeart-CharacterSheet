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
    const trainee = applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 0 })
    const operator = applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 1 })
    const senior = applyRhodesIslandAutomation({ ...base, branchUpgradeCount: 2 })

    expect(trainee.cards[1].description).toBe(branch.stages[0].branchFeature)
    expect(operator.cards[1].description).toBe(branch.stages[1].branchFeature)
    expect(senior.cards[1].description).toBe(branch.stages[2].branchFeature)
    expect(trainee.cards[0].description).toContain(branch.stages[0].branchFeature)
    expect(operator.cards[0].description).toContain(branch.stages[1].branchFeature)
    expect(operator.cards[0].description).not.toContain(branch.stages[0].branchFeature)
    expect(senior.cards[0].description).toContain(branch.stages[2].branchFeature)
    expect(senior.cards[0].description).not.toContain(branch.stages[1].branchFeature)
  })

  it("X 模组替换希望特性，并保留玩家填写的武器原型", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const x = applyRhodesIslandAutomation({
      ...createBranchSheet(8),
      selectedModule: "x",
      primaryWeaponFeature: "玩家填写的武器原型形制",
    })
    const expectedFeature = branch.modules.x.description.split(/\r?\n/).slice(1).join("\n").trim()
    expect(x.primaryWeaponFeature).toBe("玩家填写的武器原型形制")
    expect(x.cards[0].professionSpecial?.希望特性).toBe(expectedFeature)
    expect(x.cards[0].professionSpecial?.希望特性).not.toContain("希望特性提升")
    expect(x.cards[0].description).not.toContain(branch.modules.x.description)
  })

  it("Y 模组把新职业特性追加到第一页职业特性下方", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const x = applyRhodesIslandAutomation({ ...createBranchSheet(8), selectedModule: "x" })
    const y = applyRhodesIslandAutomation({ ...x, selectedModule: "y" })
    const expectedFeature = branch.modules.y.description.split(/\r?\n/).slice(1).join("\n").trim()
    expect(y.primaryWeaponFeature).toBe("")
    expect(y.cards[0].professionSpecial?.希望特性).toBe(
      rhodesIslandCatalog.professions.find(profession => profession.id === branch.professionId)?.hopeFeature,
    )
    expect(y.cards[0].description).toContain(`${branch.modules.y.name}：${expectedFeature}`)
    expect(y.cards[0].description).not.toContain("追加第二职业特性")
    expect(y.cards[0].description).not.toContain(branch.modules.x.description)
  })

  it("未选择模组时恢复基础希望特性并清空 Y 职业特性", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const expectedXFeature = branch.modules.x.description.split(/\r?\n/).slice(1).join("\n").trim()
    const x = applyRhodesIslandAutomation({ ...createBranchSheet(8), selectedModule: "x" })
    const y = applyRhodesIslandAutomation({ ...x, selectedModule: "y" })
    const cleared = applyRhodesIslandAutomation({ ...y, selectedModule: undefined })
    expect(x.cards[0].professionSpecial?.希望特性).toBe(expectedXFeature)
    expect(y.cards[0].description).toContain("Y模组：")
    expect(cleared.primaryWeaponFeature).toBe("")
    expect(cleared.cards[0].professionSpecial?.希望特性).toBe(
      rhodesIslandCatalog.professions.find(profession => profession.id === branch.professionId)?.hopeFeature,
    )
    expect(cleared.cards[0].description).not.toContain(branch.modules.y.description.split(/\r?\n/).slice(1).join("\n").trim())
  })

  it("升级自动化版本时清理旧版写入主武器栏的 X 模组文本", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const legacyFeature = `${branch.modules.x.name}：${branch.modules.x.description.split(/\r?\n/).slice(1).join("\n").trim()}`
    const migrated = applyRhodesIslandAutomation({
      ...createBranchSheet(8),
      selectedModule: "x",
      primaryWeaponFeature: legacyFeature,
      rulesetAutomationVersions: { "rhodes-island": 1 },
    })

    expect(migrated.primaryWeaponFeature).toBe("")
    expect(migrated.rulesetAutomationVersions?.["rhodes-island"]).toBe(2)
  })
})
