import { describe, expect, it } from "vitest"

import { rhodesIslandCatalog } from "@/data/rhodes-island"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  calculateArmorValueBreakdown,
  calculateDamageThresholdBreakdown,
  calculateEvasionBreakdown,
  calculateHpMaxBreakdown,
  calculateStressMaxBreakdown,
} from "@/lib/domain-card-derived-stats"
import { getRhodesDerivedStatSources } from "@/lib/rhodes-island-derived-stats"

function createBranchData(
  branchName: string,
  branchUpgradeCount = 0,
  options: { level?: string; selectedModule?: "x" | "y" } = {},
) {
  const branch = rhodesIslandCatalog.branches.find(item => item.name === branchName)
  if (!branch) throw new Error(`Missing branch fixture: ${branchName}`)

  return {
    ...defaultSheetData,
    ruleSetId: "rhodes-island" as const,
    subclassRef: { id: branch.id, name: branch.name },
    branchUpgradeCount,
    level: options.level ?? "1",
    selectedModule: options.selectedModule,
  }
}

describe("罗德岛分支常驻属性自动化", () => {
  it("全量审计出的常驻数值分支均已纳入规则表", () => {
    const permanentStatPattern =
      /闪避值[+＋-－]\d|护甲值(?:和重度伤害阈值均)?[+＋-－]\d|所有伤害阈值[+＋-－]\d|获得[^。]{0,16}(?:生命槽|压力槽)/
    const auditedBranchNames = new Set<string>()

    for (const branch of rhodesIslandCatalog.branches) {
      const texts = [
        ...branch.stages.map(stage => stage.branchFeature),
        branch.modules.x.description,
        branch.modules.y.description,
      ]
      if (texts.some(text => permanentStatPattern.test(text.replaceAll(" ", "")))) {
        auditedBranchNames.add(branch.name)
      }
    }

    expect([...auditedBranchNames].sort()).toEqual(
      ["无畏者", "斗士", "重剑手", "铁卫", "决战者"].sort(),
    )

    for (const branchName of auditedBranchNames) {
      const sources = getRhodesDerivedStatSources(createBranchData(branchName))
      expect(Object.values(sources).some(lines => lines.length > 0)).toBe(true)
    }
  })

  it.each([
    [0, 1, "灵敏格斗"],
    [1, 1, "灵敏格斗+"],
    [2, 2, "灵敏格斗++"],
  ] as const)("斗士阶段 %i 自动提供 %i 点常驻闪避", (stage, bonus, label) => {
    const result = calculateEvasionBreakdown(createBranchData("斗士", stage))

    expect(result.total).toBe(bonus)
    expect(result.sources).toContainEqual({ label, value: bonus })
  })

  it("无畏者 Y 模组在阶段生命槽之外再提供一个生命槽", () => {
    const base = calculateHpMaxBreakdown(createBranchData("无畏者", 2))
    const withModule = calculateHpMaxBreakdown(
      createBranchData("无畏者", 2, { level: "8", selectedModule: "y" }),
    )

    expect(base.total).toBe(7)
    expect(withModule.total).toBe(8)
    expect(withModule.sources).toContainEqual({ label: "愈战愈勇++", value: 1 })
    expect(withModule.sources).toContainEqual({ label: "无畏之心", value: 1 })
  })

  it.each([
    [0, 8, 7],
    [1, 8, 7],
    [2, 9, 9],
  ] as const)("重剑手阶段 %i 自动调整生命与压力上限", (stage, hpMax, stressMax) => {
    const data = createBranchData("重剑手", stage)

    expect(calculateHpMaxBreakdown(data).total).toBe(hpMax)
    expect(calculateStressMaxBreakdown(data).total).toBe(stressMax)
  })

  it("铁卫阶段与 Y 模组叠加护甲值，且只提高重度伤害阈值", () => {
    const data = {
      ...createBranchData("铁卫", 2, { level: "8", selectedModule: "y" }),
      armorBaseScore: "3",
      armorThreshold: "5/11",
    }

    const armor = calculateArmorValueBreakdown(data)
    const thresholds = calculateDamageThresholdBreakdown(data)

    expect(armor.total).toBe(6)
    expect(armor.sources).toContainEqual({ label: "重装护甲++", value: 2 })
    expect(armor.sources).toContainEqual({ label: "高压战线", value: 1 })
    expect(thresholds.minor.total).toBe(15)
    expect(thresholds.major.total).toBe(19)
    expect(thresholds.minor.sources).toContainEqual({ label: "重装护甲++", value: 2 })
    expect(thresholds.major.sources).not.toContainEqual({ label: "重装护甲++", value: 2 })
  })

  it("决战者按当前分支阶段提高两档伤害阈值", () => {
    const data = {
      ...createBranchData("决战者", 2, { level: "5" }),
      armorThreshold: "5/11",
    }
    const result = calculateDamageThresholdBreakdown(data)

    expect(result.minor.total).toBe(13)
    expect(result.major.total).toBe(19)
    expect(result.minor.sources).toContainEqual({ label: "终战姿态++", value: 3 })
    expect(result.major.sources).toContainEqual({ label: "终战姿态++", value: 3 })
  })

  it("非罗德岛规则不会应用同名分支引用", () => {
    const data = {
      ...createBranchData("斗士", 2),
      ruleSetId: "daggerheart" as const,
    }

    expect(getRhodesDerivedStatSources(data).evasion).toEqual([])
  })
})

