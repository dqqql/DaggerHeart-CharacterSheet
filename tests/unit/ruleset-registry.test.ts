import { describe, expect, it } from "vitest"
import { getRuleSetModule, RULE_SET_LABELS } from "@/lib/rulesets/registry"
import { normalizeRuleSetId } from "@/lib/sheet-data"

describe("ruleset registry", () => {
  it("provides stable definitions for both built-in rulesets", () => {
    const daggerheart = getRuleSetModule("daggerheart")
    const rhodesIsland = getRuleSetModule("rhodes-island")

    expect(daggerheart.id).toBe("daggerheart")
    expect(rhodesIsland.id).toBe("rhodes-island")
    expect(daggerheart.label).toBe("原版匕首之心")
    expect(rhodesIsland.label).toBe("共赴明日：罗德岛旅记")
    expect(RULE_SET_LABELS).toEqual({
      daggerheart: "原版匕首之心",
      "rhodes-island": "共赴明日：罗德岛旅记",
    })
    expect(getRuleSetModule("daggerheart")).toBe(daggerheart)
  })

  it("exposes the configured capabilities and labels", () => {
    const daggerheart = getRuleSetModule("daggerheart")
    const rhodesIsland = getRuleSetModule("rhodes-island")

    expect(daggerheart.capabilities).toEqual({
      mixedAncestry: true,
      ancestryExperience: false,
      secondaryWeapon: true,
      inventoryWeapons: true,
      managedPrimaryWeapon: false,
      extendedCardTypes: true,
      guide: true,
      gmPanel: true,
      characterCode: true,
      officialImagePack: true,
      printPreview: true,
      keyboardPageNavigation: true,
      zootExport: false,
    })
    expect(rhodesIsland.capabilities).toEqual({
      mixedAncestry: false,
      ancestryExperience: true,
      secondaryWeapon: false,
      inventoryWeapons: false,
      managedPrimaryWeapon: true,
      extendedCardTypes: false,
      guide: false,
      gmPanel: false,
      characterCode: false,
      officialImagePack: false,
      printPreview: false,
      keyboardPageNavigation: true,
      zootExport: true,
    })
    expect(daggerheart.labels).toEqual({
      subclass: "子职业",
      cardLibrary: "匕首之心卡库",
      exportPreview: "DAGGERHEART · 导出预览",
    })
    expect(rhodesIsland.labels).toEqual({
      subclass: "分支",
      cardLibrary: "罗德岛离线卡库",
      exportPreview: "罗德岛终端 · 导出预览",
    })
    expect(daggerheart.layout).toEqual({
      inventoryRows: 5,
      professionFeaturePlacement: "left",
      hiddenFocusedCardSlots: [],
    })
    expect(rhodesIsland.layout).toEqual({
      inventoryRows: 4,
      professionFeaturePlacement: "right",
      hiddenFocusedCardSlots: [3],
    })
  })

  it("uses the existing normalization fallback for unknown values", () => {
    expect(getRuleSetModule(normalizeRuleSetId("unknown"))).toBe(
      getRuleSetModule("daggerheart"),
    )
  })
})
