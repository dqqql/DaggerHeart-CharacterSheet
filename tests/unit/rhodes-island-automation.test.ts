import { describe, expect, it } from "vitest"
import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  applyRhodesIslandAutomation,
  RHODES_ISLAND_AUTOMATION_VERSION,
} from "@/lib/rulesets/rhodes-island/automation"
import { rhodesIslandCards, rhodesIslandCatalog } from "@/data/rhodes-island"

function createBranchSheet(
  level: number,
  branch = rhodesIslandCatalog.branches[0],
) {
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
  it("同步阵法术师职业特性勘误和钩索师 Y 模组追加特性", () => {
    const arraymage = rhodesIslandCatalog.branches.find(branch => branch.name === "阵法术师")!
    const hookmaster = rhodesIslandCatalog.branches.find(branch => branch.name === "钩索师")!
    const correctedArraymageFeature = "法术聚焦-阵法术师：每次休息一次，花费 1 希望点，使自身一次施法掷骰的难度降低 2 点。若你自上一次聚焦后未离开过当前位置，此次施法掷骰可以进行一次重掷（你可以在此次重掷中单独重掷希望骰或恐惧骰）。"
    const externalNetFeature = "外置捕网：每次休息一次，你可以花费 2 希望点，立即向攻击范围内的一处指定位置弹射出钩索装置单独配置的捕网（或其他用于捕获目标的设备），该位置中距离范围内的所有敌人进行一次敏捷反应掷骰（17）。失败的目标暂时处于缚地状态。除了束缚状态带来的限制，缚地状态还会使得目标失去飞行能力，被束缚在地面上。"

    expect(arraymage.stages[2].professionFeature).toBe(correctedArraymageFeature)
    expect(hookmaster.modules.y.description).toContain(externalNetFeature)

    const migrated = applyRhodesIslandAutomation({
      ...createBranchSheet(8, hookmaster),
      selectedModule: "y",
      rulesetAutomationVersions: { "rhodes-island": 4 },
    })
    expect(migrated.rulesetAutomationVersions?.["rhodes-island"]).toBe(RHODES_ISLAND_AUTOMATION_VERSION)
    expect(migrated.cards[0].description).toContain(externalNetFeature)
  })

  it("首次加载时补齐初始物资，且不覆盖已有库存", () => {
    const initial = applyRhodesIslandAutomation(createBranchSheet(1))
    expect(initial.inventory).toEqual([
      "一根照明棒，一捆工业弹力绳，作战食品包，等价于一把金币的货币",
      "[二选一] 小型治疗药剂（回复1d4生命点）或小型理智药剂（清除1d4点压力点）",
      "罗德岛干员通行证",
      "",
      "",
    ])

    const existing = applyRhodesIslandAutomation({
      ...createBranchSheet(1),
      inventory: ["玩家物品", "", "", "", ""],
    })
    expect(existing.inventory).toEqual(["玩家物品", "", "", "", ""])
  })

  it("把旧版初始物资迁移为干员物资", () => {
    const migrated = applyRhodesIslandAutomation({
      ...createBranchSheet(1),
      inventory: [
        "一支火把、50 英尺长的绳索、基本补给品。",
        "一瓶次级治疗药水或一瓶次级耐力药水（二选一）",
        "",
        "",
        "",
      ],
      rulesetAutomationVersions: { "rhodes-island": 3 },
    })
    expect(migrated.inventory).toEqual([
      "一根照明棒，一捆工业弹力绳，作战食品包，等价于一把金币的货币",
      "[二选一] 小型治疗药剂（回复1d4生命点）或小型理智药剂（清除1d4点压力点）",
      "罗德岛干员通行证",
      "",
      "",
    ])
  })

  it("完成初始物资迁移后允许玩家清空库存", () => {
    const cleared = applyRhodesIslandAutomation({
      ...createBranchSheet(1),
      inventory: ["", "", "", "", ""],
      rulesetAutomationVersions: {
        "rhodes-island": RHODES_ISLAND_AUTOMATION_VERSION,
      },
    })
    expect(cleared.inventory).toEqual(["", "", "", "", ""])
  })

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

  it("按等级自动切换预备、正式和资深子职特性，并忽略旧版手动升级计数", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const trainee = applyRhodesIslandAutomation({ ...createBranchSheet(1), branchUpgradeCount: 2 })
    const operator = applyRhodesIslandAutomation({ ...createBranchSheet(2), branchUpgradeCount: 0 })
    const senior = applyRhodesIslandAutomation({ ...createBranchSheet(5), branchUpgradeCount: 0 })
    const elite = applyRhodesIslandAutomation({ ...createBranchSheet(8), branchUpgradeCount: 0 })

    expect(trainee.cards[1].description).toBe(branch.stages[0].branchFeature)
    expect(operator.cards[1].description).toBe(branch.stages[1].branchFeature)
    expect(senior.cards[1].description).toBe(branch.stages[2].branchFeature)
    expect(trainee.cards[0].description).toContain(branch.stages[0].branchFeature)
    expect(operator.cards[0].description).toContain(branch.stages[1].branchFeature)
    expect(operator.cards[0].description).not.toContain(branch.stages[0].branchFeature)
    expect(senior.cards[0].description).toContain(branch.stages[2].branchFeature)
    expect(senior.cards[0].description).not.toContain(branch.stages[1].branchFeature)
    expect(elite.cards[0].description).toContain(branch.stages[2].branchFeature)
    expect(elite.cards[0].description).toContain(branch.stages[2].professionFeature)
    expect(elite.cards[1].description).toBe(branch.stages[2].branchFeature)
  })

  it("X 模组替换希望特性，并保留玩家填写的武器原型", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const x = applyRhodesIslandAutomation({
      ...createBranchSheet(8),
      selectedModule: "x",
      primaryWeaponFeature: "玩家填写的武器原型形制",
    })
    const expectedFeature = branch.modules.x.description
      .split(/\r?\n/)
      .slice(1)
      .join("\n")
      .trim()
      .replace(`-${branch.name}：`, "：")
    expect(x.primaryWeaponFeature).toBe("玩家填写的武器原型形制")
    expect(x.cards[0].professionSpecial?.希望特性).toBe(expectedFeature)
    expect(x.cards[0].professionSpecial?.希望特性).not.toContain("希望特性提升")
    expect(x.cards[0].professionSpecial?.希望特性).not.toContain(`-${branch.name}`)
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

  it.each(rhodesIslandCatalog.branches.map(branch => [branch.profession, branch.name, branch] as const))(
    "%s/%s 的 X/Y 模组均同步职业卡和子职卡",
    (_professionName, _branchName, branch) => {
      const profession = rhodesIslandCatalog.professions.find(item => item.id === branch.professionId)!
      const base = createBranchSheet(8, branch)
      const rankStage = branch.stages[2]
      const xContent = branch.modules.x.description.split(/\r?\n/).slice(1).join("\n").trim()
      const yContent = branch.modules.y.description.split(/\r?\n/).slice(1).join("\n").trim()

      const x = applyRhodesIslandAutomation({ ...base, selectedModule: "x" })
      expect(x.cards[0].professionSpecial?.希望特性).toBe(
        xContent.replace(`-${branch.name}：`, "："),
      )
      expect(x.cards[0].description).toContain(rankStage.professionFeature || profession.classFeature)
      expect(x.cards[0].description).toContain(rankStage.branchFeature)
      expect(x.cards[1].description).toBe(rankStage.branchFeature)

      const y = applyRhodesIslandAutomation({ ...base, selectedModule: "y" })
      expect(y.cards[0].professionSpecial?.希望特性).toBe(profession.hopeFeature)
      expect(y.cards[0].description).toContain(rankStage.professionFeature || profession.classFeature)
      expect(y.cards[0].description).toContain(rankStage.branchFeature)
      expect(y.cards[0].description).toContain(`${branch.modules.y.name}：${yContent}`)
      expect(y.cards[1].description).toBe(rankStage.branchFeature)
    },
  )

  it("未选择模组时恢复基础希望特性并清空 Y 职业特性", () => {
    const branch = rhodesIslandCatalog.branches[0]
    const expectedXFeature = branch.modules.x.description
      .split(/\r?\n/)
      .slice(1)
      .join("\n")
      .trim()
      .replace(`-${branch.name}：`, "：")
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
    expect(migrated.rulesetAutomationVersions?.["rhodes-island"]).toBe(RHODES_ISLAND_AUTOMATION_VERSION)
  })
})
