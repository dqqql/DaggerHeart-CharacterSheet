import type { SheetData, RuleSetId } from "@/lib/sheet-data"
import type { DerivedStatSourceLine } from "@/lib/preset-equipment"

export interface RuleSetCapabilities {
  mixedAncestry: boolean
  ancestryExperience: boolean
  secondaryWeapon: boolean
  inventoryWeapons: boolean
  managedPrimaryWeapon: boolean
  extendedCardTypes: boolean
  guide: boolean
  gmPanel: boolean
  characterCode: boolean
  officialImagePack: boolean
  printPreview: boolean
  keyboardPageNavigation: boolean
}

export interface RuleSetLabels {
  subclass: string
  cardLibrary: string
  exportPreview: string
}

export interface RuleSetLayout {
  inventoryRows: 4 | 5
  professionFeaturePlacement: "left" | "right"
  hiddenFocusedCardSlots: readonly number[]
}

export interface RuleSetDerivedSources {
  evasion: DerivedStatSourceLine[]
  armorValue: DerivedStatSourceLine[]
  minorThreshold: DerivedStatSourceLine[]
  majorThreshold: DerivedStatSourceLine[]
  hpMax: DerivedStatSourceLine[]
  stressMax: DerivedStatSourceLine[]
}

export interface RuleSetModule {
  id: RuleSetId
  label: string
  capabilities: Readonly<RuleSetCapabilities>
  labels: Readonly<RuleSetLabels>
  layout: Readonly<RuleSetLayout>
  normalizeSheetData: (data: SheetData) => SheetData
  prepareForExport: (data: SheetData) => SheetData
  getDerivedStatSources: (data: SheetData) => RuleSetDerivedSources
  getProfessionHopeFeature: (professionId: string | undefined) => string
}
