import {
  calculateArmorValueBreakdown,
  calculateDamageThresholdBreakdown,
  calculateEvasionBreakdown,
} from "@/lib/domain-card-derived-stats"
import { parseToNumber } from "@/lib/number-utils"
import { getRuleSetModule } from "@/lib/rulesets/registry"
import type { AttributeValue, SheetData } from "@/lib/sheet-data"

const SPELLCASTING_ATTRIBUTE_MAP: Record<string, keyof SheetData> = {
  敏捷: "agility",
  力量: "strength",
  灵巧: "finesse",
  本能: "instinct",
  风度: "presence",
  知识: "knowledge",
}

export type DerivedCombatField =
  | "evasion"
  | "armorValue"
  | "minorThreshold"
  | "majorThreshold"

export function syncSubclassSpellcasting(
  newData: SheetData,
  oldData: SheetData,
): SheetData {
  const oldSubclassCard = oldData.cards?.[1]
  const newSubclassCard = newData.cards?.[1]
  const oldSpellcastingAttr = oldSubclassCard?.cardSelectDisplay?.item3
  const newSpellcastingAttr = newSubclassCard?.cardSelectDisplay?.item3

  if (oldSpellcastingAttr === newSpellcastingAttr) {
    return newData
  }

  const result = { ...newData }

  if (oldSpellcastingAttr && SPELLCASTING_ATTRIBUTE_MAP[oldSpellcastingAttr]) {
    const oldAttrKey = SPELLCASTING_ATTRIBUTE_MAP[oldSpellcastingAttr]
    const oldAttr = result[oldAttrKey] as AttributeValue
    if (oldAttr && typeof oldAttr === "object" && "spellcasting" in oldAttr) {
      ;(result[oldAttrKey] as AttributeValue) = { ...oldAttr, spellcasting: false }
    }
  }

  if (newSpellcastingAttr && SPELLCASTING_ATTRIBUTE_MAP[newSpellcastingAttr]) {
    const newAttrKey = SPELLCASTING_ATTRIBUTE_MAP[newSpellcastingAttr]
    const newAttr = result[newAttrKey] as AttributeValue
    if (newAttr && typeof newAttr === "object" && "spellcasting" in newAttr) {
      ;(result[newAttrKey] as AttributeValue) = { ...newAttr, spellcasting: true }
    }
  }

  return result
}

export function getExplicitlyClearedDerivedFields(
  updates: Partial<SheetData>,
): Set<DerivedCombatField> {
  const clearedFields = new Set<DerivedCombatField>()

  if (updates.evasion === "" && !updates.evasionManualModifier?.trim()) {
    clearedFields.add("evasion")
  }

  if (updates.armorValue === "" && !updates.armorValueManualModifier?.trim()) {
    clearedFields.add("armorValue")
  }

  if (updates.minorThreshold === "" && !updates.minorThresholdManualModifier?.trim()) {
    clearedFields.add("minorThreshold")
  }

  if (updates.majorThreshold === "" && !updates.majorThresholdManualModifier?.trim()) {
    clearedFields.add("majorThreshold")
  }

  return clearedFields
}

export function syncDerivedCombatStats(
  data: SheetData,
  explicitlyClearedFields: Set<DerivedCombatField> = new Set(),
): SheetData {
  const nextData = { ...data }

  const evasionBreakdown = calculateEvasionBreakdown(nextData)
  nextData.evasion = explicitlyClearedFields.has("evasion") ? "" : evasionBreakdown.display

  const armorValueBreakdown = calculateArmorValueBreakdown(nextData)
  nextData.armorValue = explicitlyClearedFields.has("armorValue")
    ? ""
    : armorValueBreakdown.display
  nextData.armorMax = explicitlyClearedFields.has("armorValue")
    ? parseToNumber(data.armorValue ?? "", 0)
    : parseToNumber(armorValueBreakdown.display, 0)

  if (nextData.armorThreshold) {
    const thresholdBreakdown = calculateDamageThresholdBreakdown(nextData)
    nextData.minorThreshold = explicitlyClearedFields.has("minorThreshold")
      ? ""
      : thresholdBreakdown.minor.display
    nextData.majorThreshold = explicitlyClearedFields.has("majorThreshold")
      ? ""
      : thresholdBreakdown.major.display
  } else {
    nextData.minorThreshold = explicitlyClearedFields.has("minorThreshold")
      ? ""
      : data.minorThreshold
    nextData.majorThreshold = explicitlyClearedFields.has("majorThreshold")
      ? ""
      : data.majorThreshold
  }

  return nextData
}

export function finalizeSheetData(
  newData: SheetData,
  oldData: SheetData,
  explicitlyClearedFields = new Set<DerivedCombatField>(),
): SheetData {
  const withSubclass = syncSubclassSpellcasting(newData, oldData)
  const withRuleSet = getRuleSetModule(withSubclass.ruleSetId).normalizeSheetData(withSubclass)
  return syncDerivedCombatStats(withRuleSet, explicitlyClearedFields)
}
