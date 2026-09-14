import { describe, expect, it } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import { aggregatePresetEquipmentEffects, formatPresetWeaponDamage, formatPresetWeaponFeature, formatPresetWeaponTrait, resolvePresetWeapon } from "@/lib/preset-equipment"
import { swapInventoryWeapon } from "@/lib/inventory-weapon-swap"

function inventoryFields(name: string, weaponType: "primary" | "secondary") {
  const weapon = resolvePresetWeapon(name, weaponType)
  if (!weapon) throw new Error(`Missing preset weapon: ${name}`)

  return {
    inventoryWeapon1Name: weapon.名称,
    inventoryWeapon1Trait: formatPresetWeaponTrait(weapon),
    inventoryWeapon1Damage: formatPresetWeaponDamage(weapon),
    inventoryWeapon1Feature: formatPresetWeaponFeature(weapon),
  }
}

describe("inventory weapon swap", () => {
  it("applies a backup primary weapon's automation after equipping it", () => {
    const swapped = swapInventoryWeapon({
      ...defaultSheetData,
      ...inventoryFields("巨剑", "primary"),
    }, 1, "primary")

    expect(swapped.primaryWeaponName).toBe("巨剑")
    expect(swapped.primaryWeaponSelection).toEqual({ mode: "preset", id: "巨剑", weaponType: "primary" })
    expect(aggregatePresetEquipmentEffects(swapped).evasion).toBe(-1)
  })

  it("applies a backup secondary weapon's automation after equipping it", () => {
    const swapped = swapInventoryWeapon({
      ...defaultSheetData,
      ...inventoryFields("塔盾", "secondary"),
    }, 1, "secondary")

    expect(swapped.secondaryWeaponSelection).toEqual({ mode: "preset", id: "塔盾", weaponType: "secondary" })
    expect(aggregatePresetEquipmentEffects(swapped).armorValue).toBe(2)
  })

  it("keeps a backup weapon's original catalog when equipping it in the other slot", () => {
    const swapped = swapInventoryWeapon({
      ...defaultSheetData,
      ...inventoryFields("塔盾", "secondary"),
    }, 1, "primary")

    expect(swapped.primaryWeaponSelection).toEqual({ mode: "preset", id: "塔盾", weaponType: "secondary" })
    expect(aggregatePresetEquipmentEffects(swapped).armorValue).toBe(2)
  })

  it("removes the replaced active weapon's automation", () => {
    const swapped = swapInventoryWeapon({
      ...defaultSheetData,
      primaryWeaponName: "巨剑",
      primaryWeaponSelection: { mode: "preset", id: "巨剑", weaponType: "primary" },
      inventoryWeapon1Name: "临时木棍",
      inventoryWeapon1Trait: "物理/单手/近战",
      inventoryWeapon1Damage: "力量: d4",
      inventoryWeapon1Feature: "",
    }, 1, "primary")

    expect(swapped.primaryWeaponSelection).toEqual({ mode: "custom", id: "临时木棍" })
    expect(aggregatePresetEquipmentEffects(swapped).evasion).toBe(0)
  })
})
