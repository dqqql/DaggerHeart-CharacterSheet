import { armorItems, type ArmorItem } from "@/data/list/armor"
import { primaryWeapons, type Weapon } from "@/data/list/primary-weapon"
import { secondaryWeapons } from "@/data/list/secondary-weapon"
import type { SheetData } from "@/lib/sheet-data"
import { safeEvaluateExpression } from "@/lib/number-utils"
import type {
  CharacterAttributeKey,
  EquipmentAttributeModifiers,
  EquipmentEffects,
  EquipmentSelectionState,
} from "@/types/preset-equipment"

export type WeaponSlot = "primary" | "secondary"
export type EquipmentSlot = "armor" | "primaryWeapon" | "secondaryWeapon"

export interface EquipmentEffectSource {
  slot: EquipmentSlot
  label: string
  effects: EquipmentEffects
}

export interface AggregatedEquipmentEffects {
  evasion: number
  armorValue: number
  attributes: Record<CharacterAttributeKey, number>
  sources: EquipmentEffectSource[]
}

export interface DerivedStatSourceLine {
  label: string
  value: number
}

export interface DerivedStatBreakdown {
  total: number | null
  display: string
  sources: DerivedStatSourceLine[]
}

export const PRESET_EQUIPMENT_CALC_VERSION = 1

const ATTRIBUTE_KEYS: CharacterAttributeKey[] = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
]

const EMPTY_SELECTION: EquipmentSelectionState = { mode: "none" }

const LEGACY_ARMOR_NAME_ALIASES: Record<string, string> = {
  填充布甲: "基础轻型制式装备",
  皮甲: "基础制式装备",
  链甲: "基础重型制式装备",
  全板甲: "基础加重型制式装备",
  改良填充布甲: "改良轻型制式装备",
  改良皮甲: "改良制式装备",
  改良链甲: "改良重型制式装备",
  改良全板甲: "改良加重型制式装备",
  埃伦德里安链甲: "法术防护套装",
  掠骸护甲: "老兵坚韧套装",
  铁木胸甲: "战意燃烧套装",
  符文浮甲: "战线抵抗套装",
  泰瑞斯软甲: "隐秘行动套装",
  蔷薇野甲: "共赴明日套装",
  高级填充布甲: "精修轻型制式装备",
  高级皮甲: "精修制式装备",
  高级链甲: "精修重型制式装备",
  高级全板甲: "精修加重型制式装备",
  贝拉莫伊精致护甲: "贵族风貌套装",
  龙鳞护甲: "最终防线套装",
  尖刺护甲: "尖刺阻拒套装",
  剑刃护甲: "物理专防套装",
  莫奈特的斗篷: "法术专防套装",
  强化符文: "战争苦痛套装",
  传奇填充布甲: "历战轻型制式装备",
  传奇皮甲: "历战制式装备",
  传奇链甲: "历战重型制式装备",
  传奇全板甲: "历战加重型制式装备",
  威能丝甲: "受击缓冲套装",
  引导护甲: "指引前路套装",
  织烬护甲: "炽焰不息套装",
  全面强化护甲: "卫戍之心套装",
  诚实蛋白石护甲: "纯白真诚套装",
  救世主链甲: "身负重任套装",
}

const armorById = new Map(armorItems.map((item) => [item.名称, item]))
const primaryWeaponById = new Map(primaryWeapons.map((item) => [item.名称, item]))
const secondaryWeaponById = new Map(secondaryWeapons.map((item) => [item.名称, item]))

export function createEmptyAttributeModifiers(): Record<CharacterAttributeKey, number> {
  return {
    agility: 0,
    strength: 0,
    finesse: 0,
    instinct: 0,
    presence: 0,
    knowledge: 0,
  }
}

export function formatPresetWeaponTrait(weapon: Weapon): string {
  return `${weapon.伤害类型 || ""}/${weapon.负荷 || ""}/${weapon.范围 || ""}`
}

export function formatPresetWeaponDamage(weapon: Weapon): string {
  return `${weapon.属性 || ""}: ${weapon.伤害 || ""}`
}

export function formatPresetWeaponFeature(weapon: Weapon): string {
  return weapon.特性名称 ? `${weapon.特性名称}: ${weapon.描述}` : weapon.描述
}

export function resolvePresetArmor(id?: string): ArmorItem | undefined {
  if (!id) {
    return undefined
  }

  return armorById.get(LEGACY_ARMOR_NAME_ALIASES[id] ?? id)
}

export function resolvePresetWeapon(id: string | undefined, slot: WeaponSlot): Weapon | undefined {
  if (!id) {
    return undefined
  }

  return slot === "primary" ? primaryWeaponById.get(id) : secondaryWeaponById.get(id)
}

export function inferArmorSelection(data: Pick<SheetData, "armorName" | "armorBaseScore" | "armorThreshold" | "armorSelection">): EquipmentSelectionState {
  if (isValidSelectionState(data.armorSelection)) {
    return data.armorSelection
  }

  if (!data.armorName) {
    return EMPTY_SELECTION
  }

  const preset = resolvePresetArmor(data.armorName)
  if (
    preset &&
    String(preset.护甲值) === (data.armorBaseScore || "") &&
    preset.伤害阈值 === (data.armorThreshold || "")
  ) {
    return { mode: "preset", id: preset.名称 }
  }

  return { mode: "custom", id: data.armorName }
}

export function inferWeaponSelection(
  data: Pick<
    SheetData,
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
  slot: WeaponSlot,
): EquipmentSelectionState {
  const selection = slot === "primary" ? data.primaryWeaponSelection : data.secondaryWeaponSelection
  if (isValidSelectionState(selection)) {
    return selection
  }

  const weaponName = slot === "primary" ? data.primaryWeaponName : data.secondaryWeaponName
  if (!weaponName) {
    return EMPTY_SELECTION
  }

  const preset = resolvePresetWeapon(weaponName, slot)
  if (
    preset &&
    formatPresetWeaponTrait(preset) === (slot === "primary" ? data.primaryWeaponTrait || "" : data.secondaryWeaponTrait || "") &&
    formatPresetWeaponDamage(preset) === (slot === "primary" ? data.primaryWeaponDamage || "" : data.secondaryWeaponDamage || "") &&
    formatPresetWeaponFeature(preset) === (slot === "primary" ? data.primaryWeaponFeature || "" : data.secondaryWeaponFeature || "")
  ) {
    return { mode: "preset", id: preset.名称 }
  }

  return { mode: "custom", id: weaponName }
}

export function getPresetEquipmentEffectSources(
  data: Pick<
    SheetData,
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
): EquipmentEffectSource[] {
  const sources: EquipmentEffectSource[] = []

  const armorSelection = inferArmorSelection(data)
  if (armorSelection.mode === "preset") {
    const armor = resolvePresetArmor(armorSelection.id)
    if (armor?.effects) {
      sources.push({
        slot: "armor",
        label: armor.名称,
        effects: armor.effects,
      })
    }
  }

  const primarySelection = inferWeaponSelection(data, "primary")
  if (primarySelection.mode === "preset") {
    const weapon = resolvePresetWeapon(primarySelection.id, "primary")
    if (weapon?.effects) {
      sources.push({
        slot: "primaryWeapon",
        label: weapon.名称,
        effects: weapon.effects,
      })
    }
  }

  const secondarySelection = inferWeaponSelection(data, "secondary")
  if (secondarySelection.mode === "preset") {
    const weapon = resolvePresetWeapon(secondarySelection.id, "secondary")
    if (weapon?.effects) {
      sources.push({
        slot: "secondaryWeapon",
        label: weapon.名称,
        effects: weapon.effects,
      })
    }
  }

  return sources
}

export function aggregatePresetEquipmentEffects(
  data: Pick<
    SheetData,
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
): AggregatedEquipmentEffects {
  const aggregated: AggregatedEquipmentEffects = {
    evasion: 0,
    armorValue: 0,
    attributes: createEmptyAttributeModifiers(),
    sources: getPresetEquipmentEffectSources(data),
  }

  for (const source of aggregated.sources) {
    aggregated.evasion += source.effects.evasion || 0
    aggregated.armorValue += source.effects.armorValue || 0
    applyAttributeEffects(aggregated.attributes, source.effects.attributes)
  }

  return aggregated
}

export function getProfessionBaseEvasion(
  data: Pick<SheetData, "cards">,
): number | null {
  const professionEvasion: unknown = data.cards?.[0]?.professionSpecial?.["起始闪避"]
  if (typeof professionEvasion === "number") {
    return professionEvasion
  }

  if (typeof professionEvasion === "string" && professionEvasion.trim()) {
    return safeEvaluateExpression(professionEvasion)
  }

  return null
}

export function calculateEvasionBreakdown(
  data: Pick<
    SheetData,
    | "cards"
    | "evasion"
    | "evasionManualModifier"
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
): DerivedStatBreakdown {
  const equipment = aggregatePresetEquipmentEffects(data)
  const professionBase = getProfessionBaseEvasion(data)
  const manualModifier = parseModifier(data.evasionManualModifier)

  const sources: DerivedStatSourceLine[] = []
  if (professionBase !== null) {
    sources.push({ label: "职业起始值", value: professionBase })
  }

  for (const source of equipment.sources) {
    if (source.effects.evasion) {
      sources.push({ label: source.label, value: source.effects.evasion })
    }
  }

  if (manualModifier !== 0) {
    sources.push({ label: "手动修正", value: manualModifier })
  }

  const hasAnySource = professionBase !== null || equipment.evasion !== 0 || hasNumericInput(data.evasionManualModifier)
  const total = hasAnySource ? (professionBase || 0) + equipment.evasion + manualModifier : null

  return {
    total,
    display: total === null ? "" : String(total),
    sources,
  }
}

export function calculateArmorValueBreakdown(
  data: Pick<
    SheetData,
    | "armorBaseScore"
    | "armorValue"
    | "armorValueManualModifier"
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
  >,
): DerivedStatBreakdown {
  const equipment = aggregatePresetEquipmentEffects(data)
  const armorBase = hasNumericInput(data.armorBaseScore) ? safeEvaluateExpression(data.armorBaseScore || "0") : null
  const manualModifier = parseModifier(data.armorValueManualModifier)

  const sources: DerivedStatSourceLine[] = []
  if (armorBase !== null) {
    sources.push({ label: "基础护甲值", value: armorBase })
  }

  for (const source of equipment.sources) {
    if (source.effects.armorValue) {
      sources.push({ label: source.label, value: source.effects.armorValue })
    }
  }

  if (manualModifier !== 0) {
    sources.push({ label: "手动修正", value: manualModifier })
  }

  const hasAnySource = armorBase !== null || equipment.armorValue !== 0 || hasNumericInput(data.armorValueManualModifier)
  const total = hasAnySource ? (armorBase || 0) + equipment.armorValue + manualModifier : null

  return {
    total,
    display: total === null ? "" : String(total),
    sources,
  }
}

export function getAttributeEquipmentModifier(
  data: Pick<
    SheetData,
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
  return aggregatePresetEquipmentEffects(data).attributes[attribute]
}

export function getDisplayedAttributeValue(
  data: Pick<
    SheetData,
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
  storedBaseValue?: string,
): string {
  const modifier = getAttributeEquipmentModifier(data, attribute)
  const hasBase = hasNumericInput(storedBaseValue)
  const baseValue = hasBase ? safeEvaluateExpression(storedBaseValue || "0") : 0

  if (!hasBase && modifier === 0) {
    return ""
  }

  return String(baseValue + modifier)
}

export function convertDisplayedAttributeToStoredBase(
  data: Pick<
    SheetData,
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
  displayedValue: string,
): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const modifier = getAttributeEquipmentModifier(data, attribute)
  return String(safeEvaluateExpression(displayedValue) - modifier)
}

export function convertDisplayedEvasionToManualModifier(
  data: Pick<
    SheetData,
    | "cards"
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
  displayedValue: string,
): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const professionBase = getProfessionBaseEvasion(data) || 0
  const equipment = aggregatePresetEquipmentEffects(data).evasion
  return String(safeEvaluateExpression(displayedValue) - professionBase - equipment)
}

export function convertDisplayedArmorValueToManualModifier(
  data: Pick<
    SheetData,
    | "armorBaseScore"
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
  >,
  displayedValue: string,
): string {
  if (!displayedValue.trim()) {
    return ""
  }

  const armorBase = hasNumericInput(data.armorBaseScore) ? safeEvaluateExpression(data.armorBaseScore || "0") : 0
  const equipment = aggregatePresetEquipmentEffects(data).armorValue
  return String(safeEvaluateExpression(displayedValue) - armorBase - equipment)
}

function parseModifier(value?: string): number {
  return hasNumericInput(value) ? safeEvaluateExpression(value || "0") : 0
}

function hasNumericInput(value?: string): boolean {
  return !!value && value.trim() !== ""
}

function applyAttributeEffects(
  target: Record<CharacterAttributeKey, number>,
  modifiers?: EquipmentAttributeModifiers,
): void {
  if (!modifiers) {
    return
  }

  for (const key of ATTRIBUTE_KEYS) {
    target[key] += modifiers[key] || 0
  }
}

function isValidSelectionState(selection: EquipmentSelectionState | undefined): selection is EquipmentSelectionState {
  if (!selection) {
    return false
  }

  return selection.mode === "none" || selection.mode === "preset" || selection.mode === "custom"
}
