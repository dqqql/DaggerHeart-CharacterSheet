import { describe, expect, it } from "vitest"

import { armorItems } from "@/data/list/armor"
import { aggregatePresetEquipmentEffects } from "@/lib/preset-equipment"
import { defaultSheetData } from "@/lib/default-sheet-data"

const expectedArmor = [
  ["基础轻型制式装备", "T1", "5/11", 3],
  ["基础制式装备", "T1", "6/13", 3],
  ["基础重型制式装备", "T1", "7/15", 4],
  ["基础加重型制式装备", "T1", "8/17", 4],
  ["改良轻型制式装备", "T2", "7/16", 4],
  ["改良制式装备", "T2", "9/20", 4],
  ["改良重型制式装备", "T2", "11/24", 5],
  ["改良加重型制式装备", "T2", "13/28", 5],
  ["法术防护套装", "T2", "9/21", 4],
  ["老兵坚韧套装", "T2", "9/21", 4],
  ["战意燃烧套装", "T2", "9/20", 4],
  ["战线抵抗套装", "T2", "9/20", 4],
  ["隐秘行动套装", "T2", "8/18", 5],
  ["共赴明日套装", "T2", "11/23", 5],
  ["精修轻型制式装备", "T3", "9/23", 5],
  ["精修制式装备", "T3", "11/27", 5],
  ["精修重型制式装备", "T3", "13/31", 6],
  ["精修加重型制式装备", "T3", "15/35", 6],
  ["贵族风貌套装", "T3", "11/27", 5],
  ["最终防线套装", "T3", "11/27", 5],
  ["尖刺阻拒套装", "T3", "10/25", 5],
  ["物理专防套装", "T3", "16/39", 6],
  ["法术专防套装", "T3", "16/39", 6],
  ["战争苦痛套装", "T3", "17/43", 6],
  ["历战轻型制式装备", "T4", "11/32", 6],
  ["历战制式装备", "T4", "13/36", 6],
  ["历战重型制式装备", "T4", "15/40", 7],
  ["历战加重型制式装备", "T4", "17/44", 7],
  ["受击缓冲套装", "T4", "13/36", 7],
  ["指引前路套装", "T4", "13/36", 5],
  ["炽焰不息套装", "T4", "13/36", 6],
  ["卫戍之心套装", "T4", "15/40", 4],
  ["纯白真诚套装", "T4", "13/36", 6],
  ["身负重任套装", "T4", "18/48", 8],
] as const

describe("罗德岛护甲表", () => {
  it("名称、位阶、阈值和护甲值与规则表一致", () => {
    expect(armorItems.map(item => [
      item.名称,
      item.等级,
      item.伤害阈值,
      item.护甲值,
    ])).toEqual(expectedArmor)
  })

  it("自动汇总纯数值护甲效果", () => {
    const heavy = aggregatePresetEquipmentEffects({
      ...defaultSheetData,
      armorName: "基础加重型制式装备",
      armorSelection: { mode: "preset", id: "基础加重型制式装备" },
      armorBaseScore: "4",
      armorThreshold: "8/17",
    })
    expect(heavy.evasion).toBe(-2)
    expect(heavy.attributes.agility).toBe(-1)

    const noble = aggregatePresetEquipmentEffects({
      ...defaultSheetData,
      armorName: "贵族风貌套装",
      armorSelection: { mode: "preset", id: "贵族风貌套装" },
      armorBaseScore: "5",
      armorThreshold: "11/27",
    })
    expect(noble.attributes.presence).toBe(1)

    const burdened = aggregatePresetEquipmentEffects({
      ...defaultSheetData,
      armorName: "身负重任套装",
      armorSelection: { mode: "preset", id: "身负重任套装" },
      armorBaseScore: "8",
      armorThreshold: "18/48",
    })
    expect(burdened.evasion).toBe(-1)
    expect(Object.values(burdened.attributes)).toEqual([-1, -1, -1, -1, -1, -1])
  })

  it("专防与受击缓冲套装文本与规则表一致", () => {
    expect(armorItems.find(item => item.名称 === "物理专防套装")).toMatchObject({
      特性名称: "物理防御",
      描述: "你不能使用此护甲抵消法术伤害",
    })
    expect(armorItems.find(item => item.名称 === "法术专防套装")).toMatchObject({
      特性名称: "法术防御",
      描述: "你不能使用此护甲抵消物理伤害",
    })
    expect(armorItems.find(item => item.名称 === "受击缓冲套装")).toMatchObject({
      特性名称: "缓冲",
      描述: "标记一个护甲槽，投掷一枚d4骰子，并将结果作为闪避加值应用于对抗此次来袭攻击",
    })
  })
})
