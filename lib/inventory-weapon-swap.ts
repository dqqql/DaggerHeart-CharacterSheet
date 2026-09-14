import {
  formatPresetWeaponDamage,
  formatPresetWeaponFeature,
  formatPresetWeaponTrait,
  resolvePresetWeapon,
  type WeaponSlot,
} from "@/lib/preset-equipment"
import type { SheetData } from "@/lib/sheet-data"
import type { EquipmentSelectionState } from "@/types/preset-equipment"

export type InventoryWeaponIndex = 1 | 2

const WEAPON_FIELDS = ["Name", "Trait", "Damage", "Feature"] as const

function inferInventorySelection(
  data: SheetData,
  inventoryPrefix: `inventoryWeapon${InventoryWeaponIndex}`,
): EquipmentSelectionState {
  const name = data[`${inventoryPrefix}Name`]
  if (!name) {
    return { mode: "none" }
  }

  for (const weaponType of ["primary", "secondary"] as const) {
    const preset = resolvePresetWeapon(name, weaponType)
    if (
      preset &&
      data[`${inventoryPrefix}Trait`] === formatPresetWeaponTrait(preset) &&
      data[`${inventoryPrefix}Damage`] === formatPresetWeaponDamage(preset) &&
      data[`${inventoryPrefix}Feature`] === formatPresetWeaponFeature(preset)
    ) {
      return { mode: "preset", id: preset.名称, weaponType }
    }
  }

  return { mode: "custom", id: name }
}

export function swapInventoryWeapon(
  data: SheetData,
  index: InventoryWeaponIndex,
  targetType: WeaponSlot,
): SheetData {
  const inventoryPrefix = `inventoryWeapon${index}` as const
  const targetPrefix = targetType === "primary" ? "primaryWeapon" : "secondaryWeapon"
  const targetSelectionField = `${targetPrefix}Selection` as const
  const next = { ...data }

  for (const suffix of WEAPON_FIELDS) {
    const inventoryField = `${inventoryPrefix}${suffix}` as keyof SheetData
    const targetField = `${targetPrefix}${suffix}` as keyof SheetData
    next[inventoryField] = data[targetField] as never
    next[targetField] = data[inventoryField] as never
  }

  next[targetSelectionField] = inferInventorySelection(data, inventoryPrefix)
  next[`${inventoryPrefix}Primary`] = false
  next[`${inventoryPrefix}Secondary`] = false

  return next
}
