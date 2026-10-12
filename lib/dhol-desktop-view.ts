import type { SheetData } from '@/lib/sheet-data'
import {
  calculateArmorValueBreakdown,
  calculateDamageThresholdBreakdown,
  calculateEvasionBreakdown,
  getDisplayedHpMax,
  getDisplayedStressMax,
} from '@/lib/domain-card-derived-stats'
import { getDisplayedAttributeValue } from '@/lib/preset-equipment'

const attributes = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const
type Attribute = typeof attributes[number]

export interface DholDesktopView {
  version: 1
  evasion: string
  armorValue: string
  minorThreshold: string
  majorThreshold: string
  attributes: Record<Attribute, string>
  hpMax: number
  stressMax: number
  armorMax: number
  primaryWeaponAttribute: string
  primaryWeaponRange: string
  secondaryWeaponAttribute: string
  secondaryWeaponRange: string
}

function weaponDisplay(trait: string | undefined, damage: string | undefined) {
  const parts = (trait ?? '').split('/').map(part => part.trim())
  const attribute = (damage ?? '').match(/^\s*(敏捷|力量|灵巧|本能|风度|知识)\s*[:：]/)?.[1]
    ?? parts.find(part => /^(敏捷|力量|灵巧|本能|风度|知识)$/.test(part)) ?? ''
  const range = parts.find(part => /^(近战|邻近|近距离|远距离|极远|极远距离)$/.test(part)) ?? ''
  return { attribute, range }
}

/** Capture the values the builder renders at the instant Send is clicked. */
export function buildDholDesktopView(sheet: SheetData): DholDesktopView {
  const thresholds = calculateDamageThresholdBreakdown(sheet)
  const shownAttributes = Object.fromEntries(attributes.map(key => [key, getDisplayedAttributeValue(sheet, key, sheet[key]?.value)])) as Record<Attribute, string>
  const primary = weaponDisplay(sheet.primaryWeaponTrait, sheet.primaryWeaponDamage)
  const secondary = weaponDisplay(sheet.secondaryWeaponTrait, sheet.secondaryWeaponDamage)
  const armor = calculateArmorValueBreakdown(sheet)
  const armorMax = typeof sheet.armorMax === 'number' && sheet.armorMax > 0
    ? sheet.armorMax : armor.total && armor.total > 0 ? armor.total : sheet.armorBoxes?.length ?? 0
  return {
    version: 1,
    evasion: calculateEvasionBreakdown(sheet).display,
    armorValue: armor.display,
    minorThreshold: thresholds.minor.display,
    majorThreshold: thresholds.major.display,
    attributes: shownAttributes,
    hpMax: getDisplayedHpMax(sheet),
    stressMax: getDisplayedStressMax(sheet),
    armorMax,
    primaryWeaponAttribute: primary.attribute,
    primaryWeaponRange: primary.range,
    secondaryWeaponAttribute: secondary.attribute,
    secondaryWeaponRange: secondary.range,
  }
}
