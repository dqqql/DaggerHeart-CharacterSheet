import {
  applyRhodesIslandAutomation,
  getRhodesProfessionHopeFeature,
} from "@/lib/rulesets/rhodes-island/automation"
import { getRhodesDerivedStatSources } from "@/lib/rulesets/rhodes-island/derived-stats"
import { withRhodesIslandDefaultAncestryExperience } from "@/lib/rulesets/rhodes-island/experience"
import type { RuleSetModule } from "@/lib/rulesets/types"

export const rhodesIslandRuleSet: RuleSetModule = {
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
  normalizeSheetData: applyRhodesIslandAutomation,
  prepareForExport: withRhodesIslandDefaultAncestryExperience,
  getDerivedStatSources: getRhodesDerivedStatSources,
  getProfessionHopeFeature: getRhodesProfessionHopeFeature,
}
