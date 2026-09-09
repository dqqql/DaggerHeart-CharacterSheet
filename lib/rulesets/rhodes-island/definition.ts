import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import { armorItems } from "@/data/list/rhodes-island-armor"
import {
  applyRhodesIslandAutomation,
  getRhodesProfessionHopeFeature,
} from "@/lib/rulesets/rhodes-island/automation"
import { getRhodesDerivedStatSources } from "@/lib/rulesets/rhodes-island/derived-stats"
import { getRhodesDomainFilterOptions } from "@/lib/rulesets/rhodes-island/domain-filter"
import { withRhodesIslandDefaultAncestryExperience } from "@/lib/rulesets/rhodes-island/experience"
import type {
  BatchCard,
  CardBatchOption,
  RuleSetModule,
} from "@/lib/rulesets/types"

function getRhodesIslandBatchOptions(
  _batches: CardBatchOption[],
  cards: BatchCard[],
): CardBatchOption[] {
  const cardCount = cards.filter(
    card =>
      card.batchId === BUILTIN_BATCH_ID &&
      (card.ruleSetId === "rhodes-island" || card.ruleset === "rhodes-island"),
  ).length

  return [{ id: BUILTIN_BATCH_ID, name: "内置卡牌包", cardCount }]
}

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
    zootExport: true,
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
  getArmorCatalog: () => armorItems,
  getBatchOptions: getRhodesIslandBatchOptions,
  formatDomainFilterOptions: getRhodesDomainFilterOptions,
}
