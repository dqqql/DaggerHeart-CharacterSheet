import equipment from "./hope-fear-equipment.json"
import type { Weapon } from "./primary-weapon"
import type { ArmorItem } from "./armor"
import { armorItems } from "./armor"
import type { BatchInfo } from "@/card/stores/store-types"

export const hopeFearPrimaryWeapons = equipment["primary-weapon"] as Weapon[]
export const hopeFearSecondaryWeapons = equipment["secondary-weapon"] as Weapon[]
export const hopeFearArmorItems = equipment.armor as ArmorItem[]

export function getDaggerheartArmorCatalog(includeHopeFear: boolean): ArmorItem[] {
  return includeHopeFear ? [...armorItems, ...hopeFearArmorItems] : armorItems
}

/** Only this imported card package unlocks the additional SRD equipment. */
export function isHopeFearPackActive(batches: Map<string, BatchInfo>): boolean {
  return Array.from(batches.values()).some(batch =>
    !batch.isSystemBatch &&
    !batch.disabled &&
    batch.name === "希望与恐惧" &&
    batch.version === "V20261026"
  )
}
