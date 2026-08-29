import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import { armorItems } from "@/data/list/armor"
import type { SheetData } from "@/lib/sheet-data"
import type {
  BatchCard,
  CardBatchOption,
  RuleSetDerivedSources,
  RuleSetModule,
} from "@/lib/rulesets/types"

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

function getDaggerheartBatchOptions(
  batches: CardBatchOption[],
  cards: BatchCard[],
): CardBatchOption[] {
  const cardCount = cards.filter(
    card =>
      card.batchId === BUILTIN_BATCH_ID &&
      card.ruleSetId !== "rhodes-island" &&
      card.ruleset !== "rhodes-island",
  ).length

  return batches.map(batch =>
    batch.id === BUILTIN_BATCH_ID && cardCount > 0
      ? { ...batch, cardCount }
      : batch,
  )
}

function formatDaggerheartDomainFilterOptions(values: Iterable<string>) {
  return Array.from(new Set(values))
    .sort((left, right) => left.localeCompare(right, "zh-CN", { numeric: true }))
    .map(value => ({ value, label: value }))
}

export const daggerheartRuleSet = {
  id: "daggerheart",
  label: "原版匕首之心",
  capabilities: {
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
  },
  labels: {
    subclass: "子职业",
    cardLibrary: "匕首之心卡库",
    exportPreview: "DAGGERHEART · 导出预览",
  },
  layout: {
    inventoryRows: 5,
    professionFeaturePlacement: "left",
    hiddenFocusedCardSlots: [],
  },
  normalizeSheetData: identity,
  prepareForExport: identity,
  getDerivedStatSources: getEmptyDerivedStatSources,
  getProfessionHopeFeature: () => "",
  getArmorCatalog: () => armorItems,
  getBatchOptions: getDaggerheartBatchOptions,
  formatDomainFilterOptions: formatDaggerheartDomainFilterOptions,
} satisfies RuleSetModule
