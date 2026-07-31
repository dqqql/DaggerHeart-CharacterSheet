import type { SheetData } from "@/lib/sheet-data"
import { safeEvaluateExpression } from "@/lib/number-utils"
import {
  aggregatePresetEquipmentEffects,
  getAttributeEquipmentModifier,
  getProfessionBaseEvasion,
  inferArmorSelection,
  type DerivedStatBreakdown,
  type DerivedStatSourceLine,
} from "@/lib/preset-equipment"
import type { CharacterAttributeKey } from "@/types/preset-equipment"
import {
  getRhodesDerivedStatSources,
  type RhodesDerivedStatsInput,
} from "@/lib/rhodes-island-derived-stats"

export interface DamageThresholdBreakdown {
  minor: DerivedStatBreakdown
  major: DerivedStatBreakdown
}

export interface ResourceMaxBreakdown {
  total: number
  display: string
  sources: DerivedStatSourceLine[]
}

export const DOMAIN_CARD_AUTOMATION_IDS = {
  boneTouched: "bone-touched",
  vitality: "vitality",
  masterOfTheCraft: "master-of-the-craft",
} as const

const DOMAIN_CARD_IDS = {
  untouchable: "untouchable",
  bareBones: "bare-bones",
  fortifiedArmor: "fortified-armor",
  vitality: "vitality",
  bladeTouched: "blade-touched",
  splendorTouched: "splendor-touched",
  armorer: "armorer",
  riseUp: "rise-up",
  valorTouched: "valor-touched",
} as const

const DOMAIN_CARD_LABELS = {
  untouchable: "不可侵犯",
  bareBones: "铁骨铮铮",
  fortifiedArmor: "强化护甲",
  vitality: "蓬勃生命",
  bladeTouched: "利刃恩泽",
  splendorTouched: "辉耀恩泽",
  armorer: "护甲大师",
  riseUp: "泰然自若",
  valorTouched: "勇气恩泽",
} as const

const CHARACTER_CARD_IDS = {
  galapaShell: "Galapa-Shell",
  giantEndurance: "Giant-Endurance",
  humanHighStamina: "Human-HighStamina",
  simiahNimble: "Simiah-Nimble",
  stalwartFoundation: "Stalwart-Foundation",
  stalwartSpecialization: "Stalwart-Specialization",
  stalwartMastery: "Stalwart-Mastery",
  vengeanceFoundation: "Vengeance-Foundation",
  nightwalkerMastery: "Nightwalker-Mastery",
  wingedSentinelMastery: "Winged-Sentinel-Mastery",
  schoolOfWarFoundation: "School-of-War-Foundation",
} as const

const CHARACTER_CARD_LABELS = {
  galapaShell: "龟甲",
  giantEndurance: "坚韧",
  humanHighStamina: "精力充沛",
  simiahNimble: "灵活",
  stalwartFoundation: "坚毅铁卫基石",
  stalwartSpecialization: "坚毅铁卫专精",
  stalwartMastery: "坚毅铁卫大师",
  vengeanceFoundation: "复仇战卫基石",
  nightwalkerMastery: "黑夜行者大师",
  wingedSentinelMastery: "翔翼哨兵大师",
  schoolOfWarFoundation: "战争学派基石",
} as const

const BARE_BONES_THRESHOLDS: Record<number, { minor: number; major: number }> = {
  1: { minor: 9, major: 19 },
  2: { minor: 11, major: 24 },
  3: { minor: 13, major: 31 },
  4: { minor: 15, major: 38 },
}

type EvasionInput = Pick<
  SheetData,
  | "cards"
  | "evasion"
  | "evasionManualModifier"
  | "agility"
  | "armorName"
  | "armorBaseScore"
  | "armorThreshold"
  | "armorSelection"
  | "primaryWeaponName"
  | "primaryWeaponTrait"
  | "primaryWeaponDamage"
  | "primaryWeaponFeature"
  | "primaryWeaponSelection"
  | "secondaryWeaponName"
  | "secondaryWeaponTrait"
  | "secondaryWeaponDamage"
  | "secondaryWeaponFeature"
  | "secondaryWeaponSelection"
> & RhodesDerivedStatsInput

type ArmorInput = Pick<
  SheetData,
  | "armorBaseScore"
  | "armorValue"
  | "armorValueManualModifier"
  | "cards"
  | "strength"
  | "armorName"
  | "armorThreshold"
  | "armorSelection"
  | "primaryWeaponName"
  | "primaryWeaponTrait"
  | "primaryWeaponDamage"
  | "primaryWeaponFeature"
  | "primaryWeaponSelection"
  | "secondaryWeaponName"
  | "secondaryWeaponTrait"
  | "secondaryWeaponDamage"
  | "secondaryWeaponFeature"
  | "secondaryWeaponSelection"
> & RhodesDerivedStatsInput

type ThresholdInput = Pick<
  SheetData,
  | "cards"
  | "level"
  | "proficiency"
  | "armorName"
  | "armorBaseScore"
  | "armorThreshold"
  | "armorSelection"
  | "primaryWeaponName"
  | "primaryWeaponTrait"
  | "primaryWeaponDamage"
  | "primaryWeaponFeature"
  | "primaryWeaponSelection"
  | "secondaryWeaponName"
  | "secondaryWeaponTrait"
  | "secondaryWeaponDamage"
  | "secondaryWeaponFeature"
  | "secondaryWeaponSelection"
  | "strength"
  | "minorThreshold"
  | "majorThreshold"
  | "minorThresholdManualModifier"
  | "majorThresholdManualModifier"
  | "domainCardAutomation"
> & RhodesDerivedStatsInput

type HpMaxInput = Pick<SheetData, "cards" | "hpMax"> & RhodesDerivedStatsInput
type StressMaxInput = Pick<SheetData, "cards" | "stressMax"> & RhodesDerivedStatsInput

export function calculateEvasionBreakdown(data: EvasionInput): DerivedStatBreakdown {
  const equipment = aggregatePresetEquipmentEffects(data)
  const rhodesSources = getRhodesDerivedStatSources(data).evasion
  const professionBase = getProfessionBaseEvasion(data)
  const manualModifier = parseModifier(data.evasionManualModifier)
  const automatedSources: DerivedStatSourceLine[] = []

  const sources: DerivedStatSourceLine[] = []
  if (professionBase !== null) {
    sources.push({ label: "职业基础闪避", value: professionBase })
  }

  for (const source of equipment.sources) {
    if (source.effects.evasion) {
      sources.push({ label: source.label, value: source.effects.evasion })
    }
  }

  if (hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.untouchable)) {
    const agilityValue = getDisplayedAttributeValueNumber(data, "agility")
    const untouchableBonus = Math.ceil(agilityValue / 2)
    if (untouchableBonus !== 0) {
      automatedSources.push({ label: DOMAIN_CARD_LABELS.untouchable, value: untouchableBonus })
    }
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.simiahNimble)) {
    automatedSources.push({ label: CHARACTER_CARD_LABELS.simiahNimble, value: 1 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.nightwalkerMastery)) {
    automatedSources.push({ label: CHARACTER_CARD_LABELS.nightwalkerMastery, value: 1 })
  }

  automatedSources.push(...rhodesSources)
  sources.push(...automatedSources)

  if (manualModifier !== 0) {
    sources.push({ label: "手动修正", value: manualModifier })
  }

  const automatedTotal = sumSources(automatedSources)
  const hasAnySource =
    professionBase !== null ||
    equipment.evasion !== 0 ||
    automatedTotal !== 0 ||
    hasNumericInput(data.evasionManualModifier)
  const total = hasAnySource ? (professionBase || 0) + equipment.evasion + automatedTotal + manualModifier : null

  return {
    total,
    display: total === null ? "" : String(total),
    sources,
  }
}

export function calculateArmorValueBreakdown(data: ArmorInput): DerivedStatBreakdown {
  const equipment = aggregatePresetEquipmentEffects(data)
  const rhodesSources = getRhodesDerivedStatSources(data).armorValue
  const wearingPresetArmor = isPresetArmorEquipped(data)
  const bareBonesActive = hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.bareBones) && !wearingPresetArmor
  const armorBase = bareBonesActive
    ? 3 + getDisplayedAttributeValueNumber(data, "strength")
    : hasNumericInput(data.armorBaseScore)
      ? safeEvaluateExpression(data.armorBaseScore || "0")
      : null
  const manualModifier = parseModifier(data.armorValueManualModifier)
  const automatedSources: DerivedStatSourceLine[] = []

  const sources: DerivedStatSourceLine[] = []
  if (armorBase !== null) {
    sources.push({ label: bareBonesActive ? DOMAIN_CARD_LABELS.bareBones : "基础护甲值", value: armorBase })
  }

  for (const source of equipment.sources) {
    if (source.effects.armorValue) {
      sources.push({ label: source.label, value: source.effects.armorValue })
    }
  }

  if (wearingPresetArmor && hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.armorer)) {
    automatedSources.push({ label: DOMAIN_CARD_LABELS.armorer, value: 1 })
  }

  if (countFocusedDomainCardsByClass(data.cards, "勇气") >= 4 && hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.valorTouched)) {
    automatedSources.push({ label: DOMAIN_CARD_LABELS.valorTouched, value: 1 })
  }

  automatedSources.push(...rhodesSources)
  sources.push(...automatedSources)

  if (manualModifier !== 0) {
    sources.push({ label: "手动修正", value: manualModifier })
  }

  const automatedTotal = sumSources(automatedSources)
  const hasAnySource =
    armorBase !== null ||
    equipment.armorValue !== 0 ||
    automatedTotal !== 0 ||
    hasNumericInput(data.armorValueManualModifier)
  const total = hasAnySource ? (armorBase || 0) + equipment.armorValue + automatedTotal + manualModifier : null

  return {
    total,
    display: total === null ? "" : String(total),
    sources,
  }
}

export function calculateDamageThresholdBreakdown(data: ThresholdInput): DamageThresholdBreakdown {
  const context = getDamageThresholdContext(data)
  const minorManualModifier = parseModifier(data.minorThresholdManualModifier)
  const majorManualModifier = parseModifier(data.majorThresholdManualModifier)

  const minorSources = [...context.minorBaseSources, ...context.minorBonusSources]
  const majorSources = [...context.majorBaseSources, ...context.majorBonusSources]

  if (minorManualModifier !== 0) {
    minorSources.push({ label: "手动修正", value: minorManualModifier })
  }

  if (majorManualModifier !== 0) {
    majorSources.push({ label: "手动修正", value: majorManualModifier })
  }

  const minorBonus = sumSources(context.minorBonusSources)
  const majorBonus = sumSources(context.majorBonusSources)
  const minorHasAnySource =
    context.minorBase !== null ||
    minorBonus !== 0 ||
    hasNumericInput(data.minorThresholdManualModifier)
  const majorHasAnySource =
    context.majorBase !== null ||
    majorBonus !== 0 ||
    hasNumericInput(data.majorThresholdManualModifier)

  const minorTotal = minorHasAnySource ? (context.minorBase || 0) + minorBonus + minorManualModifier : null
  const majorTotal = majorHasAnySource ? (context.majorBase || 0) + majorBonus + majorManualModifier : null

  return {
    minor: {
      total: minorTotal,
      display: minorTotal === null ? "" : String(minorTotal),
      sources: minorSources,
    },
    major: {
      total: majorTotal,
      display: majorTotal === null ? "" : String(majorTotal),
      sources: majorSources,
    },
  }
}

export function calculateHpMaxBreakdown(data: HpMaxInput): ResourceMaxBreakdown {
  const storedBase = typeof data.hpMax === "number" ? data.hpMax : 6
  const automationSources: DerivedStatSourceLine[] = []

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.giantEndurance)) {
    automationSources.push({ label: CHARACTER_CARD_LABELS.giantEndurance, value: 1 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.schoolOfWarFoundation)) {
    automationSources.push({ label: CHARACTER_CARD_LABELS.schoolOfWarFoundation, value: 1 })
  }

  automationSources.push(...getRhodesDerivedStatSources(data).hpMax)
  const total = storedBase + sumSources(automationSources)

  return {
    total,
    display: String(total),
    sources: [
      { label: "基础生命槽", value: storedBase },
      ...automationSources,
    ],
  }
}

export function getDisplayedHpMax(data: HpMaxInput): number {
  return calculateHpMaxBreakdown(data).total
}

export function convertDisplayedHpMaxToStoredBase(data: HpMaxInput, displayedValue: number): number {
  const storedBase = typeof data.hpMax === "number" ? data.hpMax : 6
  const automationBonus = calculateHpMaxBreakdown(data).total - storedBase
  return Math.max(0, displayedValue - automationBonus)
}

export function calculateStressMaxBreakdown(data: StressMaxInput): ResourceMaxBreakdown {
  const storedBase = typeof data.stressMax === "number" ? data.stressMax : 6
  const automationSources: DerivedStatSourceLine[] = []

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.humanHighStamina)) {
    automationSources.push({ label: CHARACTER_CARD_LABELS.humanHighStamina, value: 1 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.vengeanceFoundation)) {
    automationSources.push({ label: CHARACTER_CARD_LABELS.vengeanceFoundation, value: 1 })
  }

  automationSources.push(...getRhodesDerivedStatSources(data).stressMax)
  const total = storedBase + sumSources(automationSources)

  return {
    total,
    display: String(total),
    sources: [
      { label: "基础压力槽", value: storedBase },
      ...automationSources,
    ],
  }
}

export function getDisplayedStressMax(data: StressMaxInput): number {
  return calculateStressMaxBreakdown(data).total
}

export function convertDisplayedStressMaxToStoredBase(data: StressMaxInput, displayedValue: number): number {
  const storedBase = typeof data.stressMax === "number" ? data.stressMax : 6
  const automationBonus = calculateStressMaxBreakdown(data).total - storedBase
  return Math.max(0, displayedValue - automationBonus)
}

export function convertDisplayedEvasionToManualModifier(data: EvasionInput, displayedValue: string): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const breakdown = calculateEvasionBreakdown({
    ...data,
    evasion: "",
    evasionManualModifier: "",
  })

  return String(safeEvaluateExpression(displayedValue) - (breakdown.total || 0))
}

export function convertDisplayedArmorValueToManualModifier(data: ArmorInput, displayedValue: string): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const breakdown = calculateArmorValueBreakdown({
    ...data,
    armorValue: "",
    armorValueManualModifier: "",
  })

  return String(safeEvaluateExpression(displayedValue) - (breakdown.total || 0))
}

export function convertDisplayedDamageThresholdToManualModifier(
  data: ThresholdInput,
  threshold: "minor" | "major",
  displayedValue: string,
): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const breakdown = calculateDamageThresholdBreakdown({
    ...data,
    minorThresholdManualModifier: "",
    majorThresholdManualModifier: "",
  })
  const baseTotal = threshold === "minor" ? breakdown.minor.total || 0 : breakdown.major.total || 0

  return String(safeEvaluateExpression(displayedValue) - baseTotal)
}

function getDamageThresholdContext(data: ThresholdInput) {
  const wearingPresetArmor = isPresetArmorEquipped(data)
  const bareBonesActive = hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.bareBones) && !wearingPresetArmor
  const minorBaseSources: DerivedStatSourceLine[] = []
  const majorBaseSources: DerivedStatSourceLine[] = []
  const minorBonusSources: DerivedStatSourceLine[] = []
  const majorBonusSources: DerivedStatSourceLine[] = []
  let minorBase: number | null = null
  let majorBase: number | null = null

  if (bareBonesActive) {
    const tier = getCharacterTier(data.level)
    const thresholds = BARE_BONES_THRESHOLDS[tier] || BARE_BONES_THRESHOLDS[1]
    const levelBonus = parseLevelNumber(data.level)
    minorBase = thresholds.minor
    majorBase = thresholds.major
    minorBaseSources.push({ label: DOMAIN_CARD_LABELS.bareBones, value: thresholds.minor })
    majorBaseSources.push({ label: DOMAIN_CARD_LABELS.bareBones, value: thresholds.major })
    if (levelBonus !== 0) {
      minorBonusSources.push({ label: "等级", value: levelBonus })
      majorBonusSources.push({ label: "等级", value: levelBonus })
    }
  } else {
    const [minorPart = "", majorPart = ""] = (data.armorThreshold || "").split("/")

    if (hasNumericInput(minorPart)) {
      minorBase = safeEvaluateExpression(minorPart)
      minorBaseSources.push({ label: "基础阈值", value: minorBase })
    }

    if (hasNumericInput(majorPart)) {
      majorBase = safeEvaluateExpression(majorPart)
      majorBaseSources.push({ label: "基础阈值", value: majorBase })
    }

    const levelBonus = parseLevelNumber(data.level)
    if (levelBonus !== 0) {
      if (minorBase !== null) {
        minorBonusSources.push({ label: "等级", value: levelBonus })
      }
      if (majorBase !== null) {
        majorBonusSources.push({ label: "等级", value: levelBonus })
      }
    }
  }

  if (wearingPresetArmor && hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.fortifiedArmor)) {
    minorBonusSources.push({ label: DOMAIN_CARD_LABELS.fortifiedArmor, value: 2 })
    majorBonusSources.push({ label: DOMAIN_CARD_LABELS.fortifiedArmor, value: 2 })
  }

  if (data.domainCardAutomation?.vitalityChoices?.includes("threshold")) {
    minorBonusSources.push({ label: DOMAIN_CARD_LABELS.vitality, value: 2 })
    majorBonusSources.push({ label: DOMAIN_CARD_LABELS.vitality, value: 2 })
  }

  if (hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.riseUp)) {
    const proficiencyBonus = getProficiencyCount(data.proficiency)
    if (proficiencyBonus !== 0) {
      majorBonusSources.push({ label: DOMAIN_CARD_LABELS.riseUp, value: proficiencyBonus })
    }
  }

  if (countFocusedDomainCardsByClass(data.cards, "利刃") >= 4 && hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.bladeTouched)) {
    majorBonusSources.push({ label: DOMAIN_CARD_LABELS.bladeTouched, value: 4 })
  }

  if (countFocusedDomainCardsByClass(data.cards, "辉耀") >= 4 && hasFocusedDomainCard(data.cards, DOMAIN_CARD_IDS.splendorTouched)) {
    majorBonusSources.push({ label: DOMAIN_CARD_LABELS.splendorTouched, value: 3 })
  }

  const ancestryThresholdBonus = hasFocusedCard(data.cards, CHARACTER_CARD_IDS.galapaShell)
    ? getProficiencyCount(data.proficiency)
    : 0
  if (ancestryThresholdBonus !== 0) {
    minorBonusSources.push({ label: CHARACTER_CARD_LABELS.galapaShell, value: ancestryThresholdBonus })
    majorBonusSources.push({ label: CHARACTER_CARD_LABELS.galapaShell, value: ancestryThresholdBonus })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.stalwartFoundation)) {
    minorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartFoundation, value: 1 })
    majorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartFoundation, value: 1 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.stalwartSpecialization)) {
    minorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartSpecialization, value: 2 })
    majorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartSpecialization, value: 2 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.stalwartMastery)) {
    minorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartMastery, value: 3 })
    majorBonusSources.push({ label: CHARACTER_CARD_LABELS.stalwartMastery, value: 3 })
  }

  if (hasFocusedCard(data.cards, CHARACTER_CARD_IDS.wingedSentinelMastery)) {
    majorBonusSources.push({ label: CHARACTER_CARD_LABELS.wingedSentinelMastery, value: 4 })
  }

  const rhodesSources = getRhodesDerivedStatSources(data)
  minorBonusSources.push(...rhodesSources.minorThreshold)
  majorBonusSources.push(...rhodesSources.majorThreshold)

  return {
    minorBase,
    majorBase,
    minorBaseSources,
    majorBaseSources,
    minorBonusSources,
    majorBonusSources,
  }
}

function getDisplayedAttributeValueNumber(
  data: Pick<
    SheetData,
    | "agility"
    | "strength"
    | "finesse"
    | "instinct"
    | "presence"
    | "knowledge"
    | "armorName"
    | "armorBaseScore"
    | "armorThreshold"
    | "armorSelection"
    | "primaryWeaponName"
    | "primaryWeaponTrait"
    | "primaryWeaponDamage"
    | "primaryWeaponFeature"
    | "primaryWeaponSelection"
    | "secondaryWeaponName"
    | "secondaryWeaponTrait"
    | "secondaryWeaponDamage"
    | "secondaryWeaponFeature"
    | "secondaryWeaponSelection"
  >,
  attribute: CharacterAttributeKey,
): number {
  const attributeValue = data[attribute]
  const storedBase =
    typeof attributeValue === "object" &&
    attributeValue !== null &&
    "value" in attributeValue &&
    hasNumericInput(attributeValue.value)
      ? safeEvaluateExpression(attributeValue.value || "0")
      : 0

  return storedBase + getAttributeEquipmentModifier(data, attribute)
}

function isPresetArmorEquipped(
  data: Pick<SheetData, "armorName" | "armorBaseScore" | "armorThreshold" | "armorSelection">,
): boolean {
  return inferArmorSelection(data).mode === "preset"
}

function getFocusedDomainCards(cards?: SheetData["cards"]): Array<NonNullable<SheetData["cards"]>[number]> {
  return (cards || []).filter((card) => card?.type === "domain" && !!card.id && !!card.name)
}

function hasFocusedDomainCard(cards: SheetData["cards"] | undefined, id: string): boolean {
  return getFocusedDomainCards(cards).some((card) => card.id === id)
}

function countFocusedDomainCardsByClass(cards: SheetData["cards"] | undefined, domainClass: string): number {
  return getFocusedDomainCards(cards).filter((card) => card.class === domainClass).length
}

function getCharacterTier(level?: string): number {
  const levelNumber = parseLevelNumber(level)
  if (levelNumber >= 8) {
    return 4
  }
  if (levelNumber >= 5) {
    return 3
  }
  if (levelNumber >= 2) {
    return 2
  }
  return 1
}

function hasFocusedCard(cards: SheetData["cards"] | undefined, cardId: string): boolean {
  return (cards || []).some((card) => card?.id === cardId)
}

function parseLevelNumber(level?: string): number {
  return hasNumericInput(level) ? safeEvaluateExpression(level || "0") : 0
}

function getProficiencyCount(proficiency?: number | boolean[]): number {
  if (typeof proficiency === "number") {
    return proficiency
  }

  if (Array.isArray(proficiency)) {
    return proficiency.filter(Boolean).length
  }

  return 0
}

function parseModifier(value?: string): number {
  return hasNumericInput(value) ? safeEvaluateExpression(value || "0") : 0
}

function hasNumericInput(value?: string): boolean {
  return !!value && value.trim() !== ""
}

function sumSources(sources: DerivedStatSourceLine[]): number {
  return sources.reduce((total, source) => total + source.value, 0)
}

