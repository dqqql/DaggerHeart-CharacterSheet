import { describe, expect, it } from "vitest"

import {
  rhodesIslandUpgradeOptionsData,
  upgradeOptionsData,
  type UpgradeOption,
} from "@/data/list/upgrade"

function expectUniqueIds(options: readonly UpgradeOption[]) {
  expect(new Set(options.map((option) => option.id)).size).toBe(options.length)
}

function expectUniqueStateIndices(options: readonly UpgradeOption[]) {
  const indices = options.map((option) => option.stateIndex)
  expect(new Set(indices).size).toBe(indices.length)
}

describe("upgrade option action contract", () => {
  it("gives every configured option a stable unique id and explicit action", () => {
    const options = [
      ...upgradeOptionsData.baseUpgrades,
      ...Object.values(upgradeOptionsData.tierSpecificUpgrades).flat(),
      ...Object.values(rhodesIslandUpgradeOptionsData).flat(),
    ]

    expectUniqueIds(options)
    expect(options.every((option) => typeof option.action === "string")).toBe(true)
  })

  it("keeps persisted state indices unique within every rendered tier", () => {
    for (const options of Object.values(upgradeOptionsData.tierSpecificUpgrades)) {
      expectUniqueStateIndices([...upgradeOptionsData.baseUpgrades, ...options])
    }

    for (const options of Object.values(rhodesIslandUpgradeOptionsData)) {
      expectUniqueStateIndices(options)
    }
  })

  it("describes domain caps and Rhodes Island actions without inspecting labels", () => {
    expect(upgradeOptionsData.domainLevelCaps).toEqual({
      tier1: 4,
      tier2: 7,
      tier3: 10,
    })

    const rhodesOptions = Object.values(rhodesIslandUpgradeOptionsData).flat()
    const branchUpgrades = rhodesOptions.filter((option) => option.action === "branch-upgrade")
    const moduleUpgrades = rhodesOptions.filter((option) => option.action === "select-module")
    const domainUpgrades = rhodesOptions.filter((option) => option.action === "domain-card")
    const crossDomainUpgrades = rhodesOptions.filter((option) => option.id.includes("cross-domain"))

    expect(branchUpgrades).toHaveLength(2)
    expect(moduleUpgrades).toHaveLength(1)
    expect(domainUpgrades.map((option) => option.domainLevelCap)).toEqual([4, 2, 7, 4, 10, 5])
    expect(crossDomainUpgrades.every((option) => option.doubleBox && option.boxCount === 2)).toBe(true)
  })
})
