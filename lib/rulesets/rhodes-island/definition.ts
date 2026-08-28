import type { SheetData } from "@/lib/sheet-data"
import type { RuleSetDerivedSources, RuleSetModule } from "@/lib/rulesets/types"

function identity(data: SheetData): SheetData {
  return data
}

function getEmptyDerivedStatSources(): RuleSetDerivedSources {
  return {
    evasion: [],
    armorValue: [],
    minorThreshold: [],
    majorThreshold: [],
    hpMax: [],
    stressMax: [],
  }
}

export const rhodesIslandRuleSet = {
  id: "rhodes-island",
  label: "共赴明日：罗德岛旅记",
  capabilities: {
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
  },
  labels: {
    subclass: "分支",
    cardLibrary: "罗德岛离线卡库",
    exportPreview: "罗德岛终端 · 导出预览",
  },
  layout: {
    inventoryRows: 4,
    professionFeaturePlacement: "right",
    hiddenFocusedCardSlots: [3],
  },
  normalizeSheetData: identity,
  prepareForExport: identity,
  getDerivedStatSources: getEmptyDerivedStatSources,
  getProfessionHopeFeature: () => "",
} satisfies RuleSetModule
